import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';

import './pt-toolbar.js';
import './pt-timer-bar.js';
import './pt-home-view.js';
import './pt-team-view.js';
import './pt-edit-team-view.js';
import './pt-settings-view.js';
import type { NavigateBackEvent, NavigateNextEvent, NavigateEditEvent, GamePlanSelectedEvent, CreateGamePlanEvent } from './pt-team-view.js';
import type { TeamSelectedEvent, NavigateEditTeamEvent, ImportExampleEvent } from './pt-home-view.js';
import type { TeamSavedEvent, EditCancelledEvent, EditTeamDeletedEvent } from './pt-edit-team-view.js';
import type { NavigateSettingsBackEvent } from './pt-settings-view.js';
import { renderField, FIELD, PADDING } from '../lib/field.js';
import { getFormationPositions } from '../lib/formations.js';
import { screenToSVG, uid } from '../lib/svg-utils.js';
import { loadAppState, saveAppState, createNewTeam, createGamePlan } from '../lib/storage.js';
import type { RosterEntry, FieldPlayer, FormationKey, GameFormat, StoredTeam, StoredAppState, GameEvent, StoredHalfPlan, TimeDisplayFormat } from '../lib/types.js';
import { PLAYER_RADIUS, PLAYER_HIT_RADIUS, PLAYER_FONT_SIZE, NAME_FONT_SIZE, FORMATIONS_BY_FORMAT, getPlayerCount, getDefaultFormation, formatTime } from '../lib/types.js';
import type {
  RosterUpdatedEvent, FormationChangedEvent, SettingsChangedEvent,
  GameFormatChangedEvent, TeamSwitchedEvent, TeamAddedEvent, TeamDeletedEvent,
  BenchTimeToggleEvent, OnFieldTimeToggleEvent, LargeTimeDisplayEvent,
  OpponentChangedEvent, TimeFormatChangedEvent,
} from './pt-toolbar.js';
import type { TimerTickEvent, ResetHalfEvent, ResetGameEvent, SavePlanEvent, EditLineupEvent, CancelPlanEvent, DeletePlanEvent, PlanHalfSwitchEvent, GameHalfSwitchedEvent } from './pt-timer-bar.js';
import type { StoredPosition } from '../lib/types.js';

const GOAL_DEPTH = 2;
const MAX_NAME_CHARS = 8;

function truncName(name: string): string {
  return name.length > MAX_NAME_CHARS ? name.slice(0, MAX_NAME_CHARS) + '\u2026' : name;
}
const SEL_RING_OFFSET = 0.6;
const SWAP_THRESHOLD = PLAYER_RADIUS * 2;
const BENCH_TOP = FIELD.LENGTH + GOAL_DEPTH + PADDING + 2;
const BENCH_LABEL_SIZE = NAME_FONT_SIZE;
const BENCH_ROW_SPACING = PLAYER_RADIUS * 2 + NAME_FONT_SIZE * 2 + 4;
const BENCH_COL_SPACING = FIELD.WIDTH / 5;

function layoutBench(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const maxPerRow = Math.floor(FIELD.WIDTH / BENCH_COL_SPACING);
  const positions: { x: number; y: number }[] = [];
  const labelY = BENCH_TOP;
  const startY = labelY + BENCH_LABEL_SIZE + 5.5;

  const startX = PADDING + PLAYER_RADIUS;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    positions.push({
      x: startX + col * BENCH_COL_SPACING,
      y: startY + row * BENCH_ROW_SPACING,
    });
  }
  return positions;
}

function getBenchHeight(subCount: number): number {
  if (subCount === 0) return 0;
  const maxPerRow = Math.floor(FIELD.WIDTH / BENCH_COL_SPACING);
  const rows = Math.ceil(subCount / maxPerRow);
  return BENCH_LABEL_SIZE + 3 + rows * BENCH_ROW_SPACING + 4;
}

@customElement('playing-time')
export class PlayingTime extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      height: 100dvh;
      overflow: hidden;
      --field-stripe-light: var(--pt-field-stripe-light);
      --field-stripe-dark: var(--pt-field-stripe-dark);
    }

    .app-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .board {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 0;
    }

    .svg-wrap {
      position: relative;
      width: 100%;
      max-width: 768px;
      height: 100%;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      cursor: default;
      user-select: none;
    }

    .formation-bar {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      flex-shrink: 0;
    }

    .formation-bar select {
      appearance: none;
      -webkit-appearance: none;
      padding: 6px 26px 6px 10px;
      min-height: 44px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: var(--pt-bg-primary);
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .attendance-btn {
      background: var(--pt-bg-primary);
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      color: var(--pt-text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 44px;
      padding: 0 10px;
      transition: background 0.15s;
    }

    .attendance-btn svg {
      width: 24px;
      height: 24px;
    }

    .attendance-btn:hover {
      background: var(--pt-btn-hover);
    }

    .reset-positions-btn,
    .edit-lineup-btn {
      background: var(--pt-bg-primary);
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      color: var(--pt-text);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 44px;
      padding: 0 10px;
      transition: background 0.15s;
    }

    .reset-positions-btn svg,
    .edit-lineup-btn svg {
      width: 24px;
      height: 24px;
    }

    .reset-positions-btn:hover,
    .edit-lineup-btn:hover {
      background: var(--pt-btn-hover);
    }

    .formation-bar select:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .select-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .select-wrap .caret {
      position: absolute;
      right: 10px;
      pointer-events: none;
    }

    .caret {
      display: inline-block;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid currentColor;
      margin-left: 2px;
      vertical-align: middle;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .empty-state {
      font-size: 0.8rem;
      color: var(--pt-text-muted);
      text-align: center;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .rotate-overlay {
      display: none;
    }

    @media (max-height: 500px) and (min-aspect-ratio: 1/1) {
      .rotate-overlay {
        display: flex;
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.92);
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
      }

      .rotate-overlay svg {
        width: 50vw;
        max-width: 200px;
        height: auto;
      }
    }

    .game-dialog {
      background: var(--pt-bg-surface);
      border: 1px solid var(--pt-border);
      border-radius: 10px;
      padding: 0;
      max-width: 400px;
      width: calc(100% - 32px);
      height: fit-content;
      box-shadow: 0 8px 32px var(--pt-shadow-lg);
      color: var(--pt-text);
    }

    .game-dialog::backdrop {
      background: var(--pt-backdrop);
    }

    .game-dialog .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid var(--pt-border-subtle);
    }

    .game-dialog .dialog-header h2 {
      margin: 0;
      font-size: 1rem;
    }

    .game-dialog .dialog-close {
      background: transparent;
      border: none;
      color: var(--pt-text-muted);
      cursor: pointer;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.15s;
    }

    .game-dialog .dialog-close:hover {
      color: var(--pt-text);
    }

    .game-dialog .dialog-close svg {
      width: 14px;
      height: 14px;
    }

    .game-dialog .dialog-body {
      padding: 16px;
    }

    .game-dialog .dialog-body p {
      margin: 0 0 16px;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .game-dialog .confirm-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    .game-dialog .confirm-actions button {
      padding: 8px 16px;
      min-height: 44px;
      border-radius: 6px;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .game-dialog .cancel-btn {
      background: transparent;
      border: 1px solid var(--pt-text-muted);
      color: var(--pt-text);
    }

    .game-dialog .cancel-btn:hover {
      background: var(--pt-hover-overlay);
    }

    .game-dialog .confirm-yes {
      background: var(--pt-accent);
      border: 1px solid var(--pt-accent);
      color: var(--pt-accent-solid-text);
    }

    .game-dialog .confirm-yes:hover {
      background: var(--pt-accent-solid-hover);
    }

    #attendance-dialog {
      max-width: 400px;
    }

    .attendance-body {
      padding: 8px 16px;
      overflow-y: auto;
      flex: 1;
    }

    .attendance-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--pt-border-subtle);
      cursor: pointer;
      font-size: 0.85rem;
    }

    .attendance-row:last-child {
      border-bottom: none;
    }

    .attendance-row input[type="checkbox"] {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      accent-color: var(--pt-accent);
    }

    .attendance-number {
      min-width: 24px;
      font-weight: bold;
      text-align: right;
      flex-shrink: 0;
    }

    .attendance-name {
      flex: 1;
      min-width: 0;
    }

    .attendance-footer {
      padding: 12px 16px;
      border-top: 1px solid var(--pt-border-subtle);
      display: flex;
      justify-content: flex-end;
    }

    .attendance-done {
      padding: 8px 24px;
      min-height: 44px;
      background: var(--pt-accent-solid);
      color: var(--pt-accent-solid-text);
      border: none;
      border-radius: 6px;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.15s;
    }

    .attendance-done:hover {
      background: var(--pt-accent-solid-hover);
    }
  `;

  @state() accessor currentView: 'home' | 'team' | 'game' | 'settings' | 'edit-team' = 'home';
  @state() accessor previousView: 'home' | 'team' | 'game' = 'home';
  @state() accessor editingTeamId: string | null = null;
  @state() accessor activeGamePlanId: string | null = null;
  @state() accessor matchPhase: 'plan' | 'game' = 'plan';
  @state() accessor teams: StoredTeam[] = [];
  @state() accessor activeTeamId: string | null = null;
  @state() accessor teamName = '';
  @state() accessor roster: RosterEntry[] = [];
  @state() accessor gameFormat: GameFormat = '11v11';
  @state() accessor formation: FormationKey = '4-3-3';
  @state() accessor fieldPlayers: FieldPlayer[] = [];
  @state() accessor subPlayers: FieldPlayer[] = [];
  @state() accessor halfLength = 45;
  @state() accessor showBenchTime = true;
  @state() accessor showOnFieldTime = true;
  @state() accessor largeTimeDisplay = false;
  @state() accessor timeDisplayFormat: TimeDisplayFormat = 'mm:ss';
  @state() accessor selectedId: string | null = null;
  @state() accessor swapTargetId: string | null = null;
  @state() accessor gameEvents: GameEvent[] = [];
  @state() accessor opponentName = '';
  @state() accessor matchType: 'vs' | '@' = 'vs';
  @state() accessor planHalf: 1 | 2 = 1;
  @state() accessor has2HPlan = false;
  @state() accessor isNewUnsavedPlan = false;
  @state() accessor half1Started = false;
  @state() accessor half2Started = false;
  @state() accessor absentIds: Set<string> = new Set();

  #halfPlan1H: StoredHalfPlan | null = null;
  #halfPlan2H: StoredHalfPlan | null = null;

  @query('svg.field') accessor svgEl!: SVGSVGElement;
  @query('pt-timer-bar') accessor timerBar!: import('./pt-timer-bar.js').PtTimerBar;
  @query('#plan-2h-dialog') accessor plan2HDialog!: HTMLDialogElement;
  @query('#copy-match-dialog') accessor copyMatchDialog!: HTMLDialogElement;
  @query('#attendance-dialog') accessor attendanceDialog!: HTMLDialogElement;
  @state() accessor _attendanceAbsentIds: Set<string> = new Set();

  #dragState: {
    id: string;
    offsetX: number;
    offsetY: number;
    originX: number;
    originY: number;
    moved: boolean;
    source: 'field' | 'sub';
  } | null = null;

  #navigateTo(view: 'home' | 'team' | 'game' | 'settings' | 'edit-team', oldAnim: string, newAnim: string) {
    const root = document.documentElement;
    root.style.setProperty('--pt-vt-old', oldAnim);
    root.style.setProperty('--pt-vt-new', newAnim);
    if (view === 'settings' || view === 'edit-team') {
      this.previousView = this.currentView as 'home' | 'team' | 'game';
      localStorage.setItem('pt-previous-view', this.previousView);
    }
    if (!document.startViewTransition) {
      this.currentView = view;
      localStorage.setItem('pt-current-view', view);
      return;
    }
    document.startViewTransition(() => {
      this.currentView = view;
      localStorage.setItem('pt-current-view', view);
    });
  }

  #onTeamSelected(e: TeamSelectedEvent) {
    this.#loadTeam(e.teamId);
    this.#saveState();
    this.#navigateTo('team', 'slide-to-left', 'slide-from-right');
  }

  #onNavigateTeam() { this.#navigateTo('team', 'slide-to-right', 'slide-from-left'); }
  #onNavigateBack(_e: NavigateBackEvent) { this.#navigateTo('home', 'slide-to-right', 'slide-from-left'); }
  #onNavigateNext(_e: NavigateNextEvent) { this.#navigateTo('game', 'slide-to-left', 'slide-from-right'); }
  #onNavigateSettings() { this.#navigateTo('settings', 'slide-to-bottom', 'slide-from-top'); }
  #onNavigateSettingsBack(_e: NavigateSettingsBackEvent) {
    const returnTo = this.previousView;
    this.#navigateTo(returnTo, 'slide-to-up', 'slide-from-bottom');
  }
  #onImportExample(e: ImportExampleEvent) {
    const { meta, players } = e.parsed;
    const newTeam = createNewTeam();
    if (meta.name) newTeam.teamName = meta.name;
    if (meta.format) newTeam.gameFormat = meta.format as GameFormat;
    if (meta.halfLength) newTeam.halfLength = meta.halfLength;
    newTeam.players = players.map(p => ({
      number: p.number,
      name: p.name,
      half1Time: 0,
      half2Time: 0,
      benchTime: 0,
      onFieldTime: 0,
    }));
    this.teams = [...this.teams, newTeam];
    this.#loadTeam(newTeam.id);
    this.#saveState();
    this.#navigateTo('team', 'slide-to-left', 'slide-from-right');
  }

  #onGamePlanSelected(e: GamePlanSelectedEvent) {
    this.activeGamePlanId = e.planId;
    localStorage.setItem('pt-active-plan-id', e.planId);
    this.#loadGamePlan(e.planId);
    this.matchPhase = 'plan';
    this.#navigateTo('game', 'slide-to-left', 'slide-from-right');
  }

  #pendingCopyDialog = false;

  #onCreateGamePlan(_e: CreateGamePlanEvent) {
    const team = this.teams.find(t => t.id === this.activeTeamId);
    if (!team) return;

    const existingPlans = team.gamePlans ?? [];
    this.#initNewMatch(team);

    if (existingPlans.length > 0) {
      this.#pendingCopyDialog = true;
    }

    this.#navigateTo('game', 'slide-to-left', 'slide-from-right');
  }

  #initNewMatch(team: StoredTeam) {
    const planCount = (team.gamePlans?.length ?? 0) + 1;
    const plan = createGamePlan(`Match ${planCount}`, team.formation);
    this.activeGamePlanId = plan.id;
    this.isNewUnsavedPlan = true;
    localStorage.setItem('pt-active-plan-id', plan.id);

    this.formation = plan.formation;
    this.matchPhase = 'plan';
    this.opponentName = '';
    this.matchType = 'vs';
    this.gameEvents = [];
    this.planHalf = 1;
    this.#halfPlan1H = null;
    this.#halfPlan2H = null;
    this.has2HPlan = false;
    this.half1Started = false;
    this.half2Started = false;
    this.roster = this.roster.map(p => ({ ...p, half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0 }));
    this.#rebuildFieldPlayers();
    this.#rebuildSubPlayers();
  }

  #confirmCopyMatch() {
    this.copyMatchDialog?.close();
    const team = this.teams.find(t => t.id === this.activeTeamId);
    if (!team) return;
    const plans = team.gamePlans ?? [];
    const lastPlan = plans[plans.length - 1];
    if (!lastPlan) return;

    this.formation = lastPlan.halfPlan1H?.formation ?? lastPlan.formation;
    this.#halfPlan1H = lastPlan.halfPlan1H ?? null;
    this.#halfPlan2H = lastPlan.halfPlan2H ?? null;
    this.has2HPlan = this.#halfPlan2H !== null;

    if (this.#halfPlan1H) {
      this.#restoreHalfPlan(this.#halfPlan1H);
    } else {
      this.#rebuildFieldPlayers();
      this.#rebuildSubPlayers();
    }
  }

  #skipCopyMatch() {
    this.copyMatchDialog?.close();
  }

  #loadGamePlan(planId: string) {
    const team = this.teams.find(t => t.id === this.activeTeamId);
    if (!team) return;
    const plan = team.gamePlans?.find(p => p.id === planId);
    if (!plan) return;

    this.formation = plan.formation;
    this.matchPhase = plan.phase ?? 'plan';
    this.opponentName = plan.opponentName ?? '';
    this.matchType = plan.matchType ?? 'vs';
    this.gameEvents = plan.gameEvents ?? [];
    this.half1Started = plan.half1Started ?? false;
    this.half2Started = plan.half2Started ?? false;
    this.planHalf = 1;

    this.#halfPlan1H = plan.halfPlan1H ?? (plan.fieldPositions1H?.length ? { formation: plan.formation, fieldPositions: plan.fieldPositions1H } : plan.fieldPositions?.length ? { formation: plan.formation, fieldPositions: plan.fieldPositions } : null);
    this.#halfPlan2H = plan.halfPlan2H ?? (plan.fieldPositions2H?.length ? { formation: plan.formation, fieldPositions: plan.fieldPositions2H } : null);
    this.has2HPlan = this.#halfPlan2H !== null;

    if (plan.playerTimes) {
      this.roster = this.roster.map(p => {
        const times = plan.playerTimes?.[p.id];
        return times ? { ...p, ...times } : { ...p, half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0 };
      });
    } else {
      this.roster = this.roster.map(p => ({ ...p, half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0 }));
    }

    if (this.#halfPlan1H) {
      this.#restoreHalfPlan(this.#halfPlan1H);
    } else {
      this.#rebuildFieldPlayers();
      this.#rebuildSubPlayers();
    }
  }

  #onNavigateEditTeamNew(_e: NavigateEditTeamEvent) {
    this.editingTeamId = null;
    localStorage.removeItem('pt-editing-team-id');
    this.#navigateTo('edit-team', 'slide-to-up', 'slide-from-bottom');
  }

  #onNavigateEditTeamExisting(_e: NavigateEditEvent) {
    this.editingTeamId = this.activeTeamId;
    if (this.activeTeamId) localStorage.setItem('pt-editing-team-id', this.activeTeamId);
    this.#navigateTo('edit-team', 'slide-to-up', 'slide-from-bottom');
  }

  #onTeamSaved(e: TeamSavedEvent) {
    const saved = e.teamData;
    const existing = this.teams.find(t => t.id === saved.id);
    if (existing) {
      this.teams = this.teams.map(t => t.id === saved.id ? saved : t);
    } else {
      this.teams = [...this.teams, saved];
    }
    this.#loadTeam(saved.id);
    this.#saveState();
    this.#navigateTo('team', 'slide-to-bottom', 'slide-from-top');
  }

  #onEditCancelled(_e: EditCancelledEvent) {
    if (this.editingTeamId === null) {
      this.#navigateTo('home', 'slide-to-bottom', 'slide-from-top');
    } else {
      this.#navigateTo('team', 'slide-to-bottom', 'slide-from-top');
    }
  }

  #onEditTeamDeleted(e: EditTeamDeletedEvent) {
    this.teams = this.teams.filter(t => t.id !== e.teamId);
    if (this.teams.length > 0) {
      this.#loadTeam(this.teams[0].id);
    } else {
      this.activeTeamId = null;
      this.teamName = '';
      this.roster = [];
      this.fieldPlayers = [];
    }
    this.#saveState();
    this.#navigateTo('home', 'slide-to-bottom', 'slide-from-top');
  }

  updated(changedProps: Map<string, unknown>) {
    super.updated(changedProps);
    if (this.#pendingCopyDialog && this.currentView === 'game' && this.copyMatchDialog) {
      this.#pendingCopyDialog = false;
      this.copyMatchDialog.showModal();
    }
  }

  connectedCallback() {
    super.connectedCallback();
    const appState = loadAppState();
    this.teams = appState.teams;

    if (appState.activeTeamId && appState.teams.find(t => t.id === appState.activeTeamId)) {
      this.#loadTeam(appState.activeTeamId);
    } else if (appState.teams.length > 0) {
      this.#loadTeam(appState.teams[0].id);
    } else {
      const newTeam = createNewTeam();
      this.teams = [newTeam];
      this.#loadTeam(newTeam.id);
      this.#saveState();
    }

    const savedView = localStorage.getItem('pt-current-view');
    const validViews = ['home', 'team', 'game', 'settings', 'edit-team'];
    if (savedView && validViews.includes(savedView)) {
      this.currentView = savedView as typeof this.currentView;
    }

    const savedPrev = localStorage.getItem('pt-previous-view');
    const validPrevViews = ['home', 'team', 'game'];
    if (savedPrev && validPrevViews.includes(savedPrev)) {
      this.previousView = savedPrev as typeof this.previousView;
    }

    const savedEditId = localStorage.getItem('pt-editing-team-id');
    if (savedEditId) {
      this.editingTeamId = savedEditId;
    }

    const savedPlanId = localStorage.getItem('pt-active-plan-id');
    if (savedPlanId) {
      this.activeGamePlanId = savedPlanId;
      this.#loadGamePlan(savedPlanId);
    }
  }

  #loadTeam(teamId: string) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return;

    this.activeTeamId = teamId;
    this.teamName = team.teamName;
    this.halfLength = team.halfLength;
    this.showBenchTime = team.showBenchTime ?? true;
    this.showOnFieldTime = team.showOnFieldTime ?? true;
    this.largeTimeDisplay = team.largeTimeDisplay ?? false;
    this.timeDisplayFormat = team.timeDisplayFormat ?? 'mm:ss';
    this.gameFormat = team.gameFormat;
    this.formation = team.formation;
    this.roster = team.players.map(p => ({
      id: uid('p'),
      number: p.number,
      name: p.name,
      half1Time: p.half1Time ?? 0,
      half2Time: p.half2Time ?? 0,
      benchTime: p.benchTime ?? 0,
      onFieldTime: p.onFieldTime ?? 0,
    }));

    this.#rebuildFieldPlayers();

    if (team.fieldPositions?.length) {
      this.fieldPlayers = this.fieldPlayers.map(fp => {
        const rosterIdx = this.roster.findIndex(r => r.id === fp.id);
        const saved = team.fieldPositions!.find(sp => sp.rosterIndex === rosterIdx);
        return saved ? { ...fp, x: saved.x, y: saved.y } : fp;
      });
    }

    this.selectedId = null;
    this.swapTargetId = null;
  }

  #rebuildFieldPlayers() {
    const positions = getFormationPositions(this.formation);
    const count = getPlayerCount(this.gameFormat);
    const starters = this.roster.slice(0, count);
    this.fieldPlayers = starters.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: positions[i]?.x ?? FIELD.WIDTH / 2,
      y: positions[i]?.y ?? FIELD.LENGTH / 2,
      number: entry.number,
      name: entry.name,
    }));
    this.#rebuildSubPlayers();
  }

  #rebuildSubPlayers() {
    const fieldIds = new Set(this.fieldPlayers.map(fp => fp.id));
    const subs = this.roster.filter(p => !fieldIds.has(p.id) && !this.absentIds.has(p.id));
    const benchPositions = layoutBench(subs.length);
    this.subPlayers = subs.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: benchPositions[i]?.x ?? FIELD.WIDTH / 2,
      y: benchPositions[i]?.y ?? BENCH_TOP + 5,
      number: entry.number,
      name: entry.name,
    }));
  }

  #saveState() {
    if (!this.activeTeamId) return;

    const existingTeam = this.teams.find(t => t.id === this.activeTeamId);

    const updatedTeam: StoredTeam = {
      id: this.activeTeamId,
      teamName: this.teamName,
      players: this.roster.map(p => ({
        number: p.number,
        name: p.name,
        half1Time: p.half1Time,
        half2Time: p.half2Time,
        benchTime: p.benchTime,
        onFieldTime: p.onFieldTime,
      })),
      halfLength: this.halfLength,
      showBenchTime: this.showBenchTime,
      showOnFieldTime: this.showOnFieldTime,
      largeTimeDisplay: this.largeTimeDisplay,
      timeDisplayFormat: this.timeDisplayFormat,
      gameFormat: this.gameFormat,
      formation: this.formation,
      fieldPositions: this.fieldPlayers.map(fp => ({
        rosterIndex: this.roster.findIndex(r => r.id === fp.id),
        x: fp.x,
        y: fp.y,
      })),
      gamePlans: existingTeam?.gamePlans ?? [],
    };

    if (this.activeGamePlanId && updatedTeam.gamePlans) {
      const playerTimes: Record<string, { half1Time: number; half2Time: number; benchTime: number; onFieldTime: number }> = {};
      for (const p of this.roster) {
        playerTimes[p.id] = { half1Time: p.half1Time, half2Time: p.half2Time, benchTime: p.benchTime, onFieldTime: p.onFieldTime };
      }
      const currentSnap = this.#currentHalfSnapshot();

      let hp1H: StoredHalfPlan | undefined;
      let hp2H: StoredHalfPlan | undefined;

      if (this.matchPhase === 'plan') {
        hp1H = (this.planHalf === 1 ? currentSnap : this.#halfPlan1H) ?? undefined;
        hp2H = this.has2HPlan ? ((this.planHalf === 2 ? currentSnap : this.#halfPlan2H) ?? undefined) : undefined;
      } else {
        const existingPlan = updatedTeam.gamePlans.find(p => p.id === this.activeGamePlanId);
        hp1H = existingPlan?.halfPlan1H ?? this.#halfPlan1H ?? undefined;
        hp2H = existingPlan?.halfPlan2H ?? this.#halfPlan2H ?? undefined;
      }

      updatedTeam.gamePlans = updatedTeam.gamePlans.map(plan =>
        plan.id === this.activeGamePlanId
          ? {
              ...plan,
              formation: this.formation,
              opponentName: this.opponentName,
              matchType: this.matchType,
              fieldPositions: currentSnap.fieldPositions,
              halfPlan1H: hp1H,
              halfPlan2H: hp2H,
              half1Started: this.half1Started,
              half2Started: this.half2Started,
              playerTimes,
              gameEvents: this.gameEvents,
            }
          : plan,
      );
    }

    this.teams = this.teams.map(t => t.id === this.activeTeamId ? updatedTeam : t);
    saveAppState({ activeTeamId: this.activeTeamId, teams: this.teams });
  }

  // --- Team management ---

  #onTeamSwitched(e: TeamSwitchedEvent) {
    this.timerBar?.stopTimer();
    this.#saveState();
    this.gameEvents = [];
    this.#loadTeam(e.teamId);
    this.#saveState();
  }

  #onTeamAdded(_e: TeamAddedEvent) {
    this.#saveState();
    const newTeam = createNewTeam();
    this.teams = [...this.teams, newTeam];
    this.#loadTeam(newTeam.id);
    this.#saveState();
  }

  #onTeamDeleted(e: TeamDeletedEvent) {
    this.teams = this.teams.filter(t => t.id !== e.teamId);
    if (this.teams.length > 0) {
      this.#loadTeam(this.teams[0].id);
    } else {
      this.activeTeamId = null;
      this.teamName = '';
      this.roster = [];
      this.fieldPlayers = [];
      this.subPlayers = [];
    }
    saveAppState({ activeTeamId: this.activeTeamId, teams: this.teams });
  }

  // --- Roster ---

  #onRosterUpdated(e: RosterUpdatedEvent) {
    this.teamName = e.teamName;
    this.roster = e.roster.map(p => ({
      ...p,
      half1Time: p.half1Time ?? 0,
      half2Time: p.half2Time ?? 0,
      benchTime: p.benchTime ?? 0,
      onFieldTime: p.onFieldTime ?? 0,
    }));
    this.#saveState();
    this.#rebuildFieldPlayers();
    this.selectedId = null;
  }

  #onSettingsChanged(e: SettingsChangedEvent) {
    this.halfLength = e.halfLength;
    this.#saveState();
  }

  #onBenchTimeToggle(e: BenchTimeToggleEvent) {
    this.showBenchTime = e.showBenchTime;
    this.#saveState();
  }

  #onOnFieldTimeToggle(e: OnFieldTimeToggleEvent) {
    this.showOnFieldTime = e.showOnFieldTime;
    this.#saveState();
  }

  #onLargeTimeDisplay(e: LargeTimeDisplayEvent) {
    this.largeTimeDisplay = e.largeTimeDisplay;
    this.#saveState();
  }

  #onTimeFormatChanged(e: TimeFormatChangedEvent) {
    this.timeDisplayFormat = e.timeDisplayFormat;
    this.#saveState();
  }

  #onTimerTick(e: TimerTickEvent) {
    if (e.half === 1 && !this.half1Started) {
      this.half1Started = true;
    } else if (e.half === 2 && !this.half2Started) {
      this.half2Started = true;
    }

    const field = e.half === 1 ? 'half1Time' : 'half2Time';
    const fieldPlayerIds = new Set(this.fieldPlayers.map(fp => fp.id));
    this.roster = this.roster.map(p =>
      fieldPlayerIds.has(p.id)
        ? { ...p, [field]: p[field] + 1, onFieldTime: p.onFieldTime + 1 }
        : { ...p, benchTime: p.benchTime + 1 },
    );
    this.#rebuildSubPlayers();
    this.#saveState();
  }

  #onGameHalfSwitched(e: GameHalfSwitchedEvent) {
    if (e.half === 2) {
      this.half1Started = true;
      if (this.#halfPlan2H) {
        this.#restoreHalfPlan(this.#halfPlan2H);
      }
      this.#saveState();
    }
  }

  #onResetHalf(e: ResetHalfEvent) {
    const field = e.half === 1 ? 'half1Time' : 'half2Time';
    this.roster = this.roster.map(p => ({ ...p, [field]: 0, benchTime: 0, onFieldTime: 0 }));
    this.gameEvents = this.gameEvents.filter(ev => ev.half !== e.half);

    if (e.half === 1) {
      this.half1Started = false;
    } else {
      this.half2Started = false;
    }

    const plan = e.half === 1 ? this.#halfPlan1H : this.#halfPlan2H;
    if (plan) {
      this.#restoreHalfPlan(plan);
    } else {
      this.#rebuildSubPlayers();
    }
    this.#saveState();
  }

  #onResetGame(_e: ResetGameEvent) {
    this.roster = this.roster.map(p => ({ ...p, half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0 }));
    this.gameEvents = [];
    this.half1Started = false;
    this.half2Started = false;

    if (this.#halfPlan1H) {
      this.#restoreHalfPlan(this.#halfPlan1H);
    } else {
      this.#rebuildSubPlayers();
    }
    this.#saveState();
  }

  #onCancelPlan(_e: CancelPlanEvent) {
    if (this.isNewUnsavedPlan) {
      this.activeGamePlanId = null;
      this.isNewUnsavedPlan = false;
      localStorage.removeItem('pt-active-plan-id');
    }
    this.#navigateTo('team', 'slide-to-right', 'slide-from-left');
  }

  #onDeletePlan(_e: DeletePlanEvent) {
    if (!this.activeGamePlanId || !this.activeTeamId) return;
    if (this.isNewUnsavedPlan) {
      this.activeGamePlanId = null;
      this.isNewUnsavedPlan = false;
      localStorage.removeItem('pt-active-plan-id');
      this.#navigateTo('team', 'slide-to-right', 'slide-from-left');
      return;
    }
    const team = this.teams.find(t => t.id === this.activeTeamId);
    if (team) {
      team.gamePlans = (team.gamePlans ?? []).filter(p => p.id !== this.activeGamePlanId);
      this.teams = [...this.teams];
      this.activeGamePlanId = null;
      localStorage.removeItem('pt-active-plan-id');
      this.#saveState();
    }
    this.#navigateTo('team', 'slide-to-right', 'slide-from-left');
  }

  #onEditLineup(_e: EditLineupEvent) {
    this.matchPhase = 'plan';

    const editableHalf: 1 | 2 = this.half1Started && !this.half2Started ? 2 : 1;
    this.planHalf = editableHalf;

    if (this.activeGamePlanId) {
      const team = this.teams.find(t => t.id === this.activeTeamId);
      if (team) {
        const plan = team.gamePlans?.find(p => p.id === this.activeGamePlanId);
        if (plan) {
          this.#halfPlan1H = plan.halfPlan1H ?? null;
          this.#halfPlan2H = plan.halfPlan2H ?? null;
          this.has2HPlan = this.#halfPlan2H !== null;

          const targetPlan = editableHalf === 1 ? this.#halfPlan1H : this.#halfPlan2H;
          if (targetPlan) {
            this.#restoreHalfPlan(targetPlan);
          }
        }

        team.gamePlans = (team.gamePlans ?? []).map(p =>
          p.id === this.activeGamePlanId ? { ...p, phase: 'plan' as const } : p,
        );
        this.teams = [...this.teams];
      }
    }
    this.#saveState();
  }

  #onSavePlan(_e: SavePlanEvent) {
    if (this.planHalf === 1) {
      this.#halfPlan1H = this.#currentHalfSnapshot();
    } else {
      this.#halfPlan2H = this.#currentHalfSnapshot();
    }

    if (this.#halfPlan1H) {
      this.#restoreHalfPlan(this.#halfPlan1H);
    }
    this.planHalf = 1;

    if (this.isNewUnsavedPlan && this.activeGamePlanId) {
      const team = this.teams.find(t => t.id === this.activeTeamId);
      if (team) {
        const plan = createGamePlan('', this.formation);
        plan.id = this.activeGamePlanId;
        plan.phase = 'game';
        plan.opponentName = this.opponentName;
        plan.matchType = this.matchType;
        team.gamePlans = [...(team.gamePlans ?? []), plan];
        this.teams = [...this.teams];
      }
      this.isNewUnsavedPlan = false;
    }

    this.matchPhase = 'game';
    if (this.activeGamePlanId) {
      const team = this.teams.find(t => t.id === this.activeTeamId);
      if (team) {
        team.gamePlans = (team.gamePlans ?? []).map(p =>
          p.id === this.activeGamePlanId ? { ...p, phase: 'game' } : p,
        );
        this.teams = [...this.teams];
      }
    }
    this.#saveState();
  }

  #onGameFormatChanged(e: GameFormatChangedEvent) {
    this.gameFormat = e.gameFormat;
    this.formation = getDefaultFormation(this.gameFormat);
    this.#rebuildFieldPlayers();
    this.#saveState();
    this.selectedId = null;
  }

  #onFormationChanged(e: FormationChangedEvent) {
    this.formation = e.formation;
    this.#rebuildFieldPlayers();
    this.#saveState();
    this.selectedId = null;
  }

  #openAttendance() {
    this._attendanceAbsentIds = new Set(this.absentIds);
    this.attendanceDialog?.showModal();
  }

  #closeAttendance() {
    this.attendanceDialog?.close();
  }

  #toggleAttendance(playerId: string) {
    const next = new Set(this._attendanceAbsentIds);
    if (next.has(playerId)) {
      next.delete(playerId);
    } else {
      next.add(playerId);
    }
    this._attendanceAbsentIds = next;
  }

  #confirmAttendance() {
    this.attendanceDialog?.close();
    this.#applyAttendance(this._attendanceAbsentIds);
  }

  #applyAttendance(newAbsentIds: Set<string>) {
    this.absentIds = newAbsentIds;
    const count = getPlayerCount(this.gameFormat);
    const positions = getFormationPositions(this.formation);
    const presentRoster = this.roster.filter(p => !this.absentIds.has(p.id));
    const starters = presentRoster.slice(0, count);

    this.fieldPlayers = starters.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: positions[i]?.x ?? FIELD.WIDTH / 2,
      y: positions[i]?.y ?? FIELD.LENGTH / 2,
      number: entry.number,
      name: entry.name,
    }));
    this.#rebuildSubPlayers();
    this.#saveState();
    this.selectedId = null;
  }

  #resetFormationPositions() {
    const positions = getFormationPositions(this.formation);
    this.fieldPlayers = this.fieldPlayers.map((fp, i) => ({
      ...fp,
      x: positions[i]?.x ?? fp.x,
      y: positions[i]?.y ?? fp.y,
    }));
    this.#rebuildSubPlayers();
    this.#saveState();
    this.selectedId = null;
  }

  #onOpponentChanged(e: OpponentChangedEvent) {
    this.opponentName = e.opponentName;
    this.matchType = e.matchType;
    this.#saveState();
  }

  #currentPositionsSnapshot(): StoredPosition[] {
    return this.fieldPlayers.map(fp => ({
      rosterIndex: this.roster.findIndex(r => r.id === fp.id),
      playerId: fp.id,
      x: fp.x,
      y: fp.y,
    }));
  }

  #currentHalfSnapshot(): StoredHalfPlan {
    return {
      formation: this.formation,
      fieldPositions: this.#currentPositionsSnapshot(),
    };
  }

  #restoreHalfPlan(plan: StoredHalfPlan) {
    this.formation = plan.formation;
    this.#rebuildFieldPlayers();

    if (plan.fieldPositions.length > 0) {
      const storedFieldPlayers = plan.fieldPositions
        .map(sp => {
          const entry = sp.playerId
            ? this.roster.find(r => r.id === sp.playerId)
            : (sp.rosterIndex >= 0 && sp.rosterIndex < this.roster.length ? this.roster[sp.rosterIndex] : undefined);
          if (!entry) return null;
          return {
            id: entry.id,
            rosterId: entry.id,
            x: sp.x,
            y: sp.y,
            number: entry.number,
            name: entry.name,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (storedFieldPlayers.length > 0) {
        this.fieldPlayers = storedFieldPlayers;
      }
    }

    this.#rebuildSubPlayers();
  }

  #onPlanHalfSwitch(e: PlanHalfSwitchEvent) {
    const targetHalf = e.half;
    if (targetHalf === this.planHalf) return;

    if ((targetHalf === 1 && this.half1Started) || (targetHalf === 2 && this.half2Started)) {
      return;
    }

    if (targetHalf === 2 && !this.has2HPlan) {
      requestAnimationFrame(() => this.plan2HDialog?.showModal());
      return;
    }

    this.#switchPlanHalf(targetHalf);
  }

  #confirmPlan2H() {
    this.plan2HDialog?.close();
    this.#halfPlan2H = this.#currentHalfSnapshot();
    this.has2HPlan = true;
    this.#switchPlanHalf(2);
  }

  #cancelPlan2H() {
    this.plan2HDialog?.close();
  }

  #switchPlanHalf(targetHalf: 1 | 2) {
    if (this.planHalf === 1) {
      this.#halfPlan1H = this.#currentHalfSnapshot();
    } else {
      this.#halfPlan2H = this.#currentHalfSnapshot();
    }

    this.planHalf = targetHalf;
    const plan = targetHalf === 1 ? this.#halfPlan1H : this.#halfPlan2H;
    if (plan) {
      this.#restoreHalfPlan(plan);
    }
    this.selectedId = null;
    this.#saveState();
  }

  // --- Selection ---

  #selectPlayer(id: string) {
    if (this.selectedId === id) {
      this.selectedId = null;
    } else {
      this.selectedId = id;
    }
  }

  #clearSelection() {
    this.selectedId = null;
  }

  // --- Swap logic ---

  #swapFieldPositions(draggedId: string, targetId: string, originX: number, originY: number) {
    const target = this.fieldPlayers.find(p => p.id === targetId);
    if (!target) return;

    const dragged = this.fieldPlayers.find(p => p.id === draggedId);
    if (dragged) {
      this.gameEvents = [...this.gameEvents, {
        type: 'swap',
        half: this.timerBar?.half ?? 1,
        elapsed: this.timerBar?.elapsed ?? 0,
        playerA: dragged.name,
        playerB: target.name,
      }];
    }

    const targetX = target.x;
    const targetY = target.y;

    this.fieldPlayers = this.fieldPlayers.map(p => {
      if (p.id === draggedId) return { ...p, x: targetX, y: targetY };
      if (p.id === targetId) return { ...p, x: originX, y: originY };
      return p;
    });

    this.selectedId = null;
    this.swapTargetId = null;
    this.#saveState();
  }

  #doSubstitution(fieldId: string, subId: string, restoreX?: number, restoreY?: number) {
    const rosterCopy = [...this.roster];
    const fieldIdx = rosterCopy.findIndex(p => p.id === fieldId);
    const subIdx = rosterCopy.findIndex(p => p.id === subId);
    if (fieldIdx === -1 || subIdx === -1) return;

    this.gameEvents = [...this.gameEvents, {
      type: 'sub',
      half: this.timerBar?.half ?? 1,
      elapsed: this.timerBar?.elapsed ?? 0,
      playerA: rosterCopy[subIdx].name,
      playerB: rosterCopy[fieldIdx].name,
    }];

    const tmp = { ...rosterCopy[fieldIdx], onFieldTime: 0 };
    rosterCopy[fieldIdx] = { ...rosterCopy[subIdx], benchTime: 0, onFieldTime: 0 };
    rosterCopy[subIdx] = tmp;

    const newFieldEntry = rosterCopy[fieldIdx];
    const updatedFieldPlayers = this.fieldPlayers.map(fp => {
      if (fp.id !== fieldId) return fp;
      const restored = { ...fp, id: newFieldEntry.id, rosterId: newFieldEntry.id, number: newFieldEntry.number, name: newFieldEntry.name };
      if (restoreX != null && restoreY != null) {
        restored.x = restoreX;
        restored.y = restoreY;
      }
      return restored;
    });

    this.roster = rosterCopy;
    this.fieldPlayers = updatedFieldPlayers;
    this.#rebuildSubPlayers();
    this.selectedId = null;
    this.swapTargetId = null;
    this.#saveState();
  }

  // --- Pointer / drag handling ---

  #onPointerDown(e: PointerEvent) {
    const hit = this.#resolveHit(e.target);

    if (hit?.kind === 'player' || hit?.kind === 'sub') {
      const isField = hit.kind === 'player';
      const allPlayers = isField ? this.fieldPlayers : this.subPlayers;
      const player = allPlayers.find(p => p.id === hit.id);
      if (!player) return;

      const pt = screenToSVG(this.svgEl, e.clientX, e.clientY);
      this.#dragState = {
        id: hit.id,
        offsetX: pt.x - player.x,
        offsetY: pt.y - player.y,
        originX: player.x,
        originY: player.y,
        moved: false,
        source: isField ? 'field' : 'sub',
      };
      this.svgEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    this.#clearSelection();
  }

  #onPointerMove(e: PointerEvent) {
    if (!this.#dragState) return;
    const pt = screenToSVG(this.svgEl, e.clientX, e.clientY);
    const newX = pt.x - this.#dragState.offsetX;
    const newY = pt.y - this.#dragState.offsetY;

    const tolerance = PLAYER_RADIUS * 0.25;
    const minX = -tolerance;
    const maxX = FIELD.WIDTH + tolerance;
    const minY = -tolerance;

    if (newX < minX || newX > maxX || newY < minY) {
      this.#snapBack();
      return;
    }

    const isField = this.#dragState.source === 'field';
    const currentList = isField ? this.fieldPlayers : this.subPlayers;
    const currentPlayer = currentList.find(p => p.id === this.#dragState!.id);
    if (currentPlayer) {
      const dx = Math.abs(newX - currentPlayer.x);
      const dy = Math.abs(newY - currentPlayer.y);
      if (dx > 0.3 || dy > 0.3) this.#dragState.moved = true;
    }

    let updatedField = this.fieldPlayers;
    let updatedSubs = this.subPlayers;

    if (isField) {
      updatedField = this.fieldPlayers.map(p =>
        p.id === this.#dragState!.id ? { ...p, x: newX, y: newY } : p,
      );
    } else {
      updatedSubs = this.subPlayers.map(p =>
        p.id === this.#dragState!.id ? { ...p, x: newX, y: newY } : p,
      );
    }

    const allTargets = isField
      ? [...updatedField, ...updatedSubs]
      : [...updatedField];

    let closest: string | null = null;
    for (const other of allTargets) {
      if (other.id === this.#dragState.id) continue;
      const dist = Math.hypot(newX - other.x, newY - other.y);
      if (dist < SWAP_THRESHOLD) {
        closest = other.id;
        break;
      }
    }

    this.fieldPlayers = updatedField;
    this.subPlayers = updatedSubs;
    this.swapTargetId = closest;
  }

  #onPointerUp(_e: PointerEvent) {
    if (this.#dragState) {
      const targetId = this.swapTargetId;
      if (targetId) {
        const dragId = this.#dragState.id;
        const origX = this.#dragState.originX;
        const origY = this.#dragState.originY;
        const dragSource = this.#dragState.source;
        const fieldIds = new Set(this.fieldPlayers.map(p => p.id));
        const subIds = new Set(this.subPlayers.map(p => p.id));

        this.#dragState = null;
        this.swapTargetId = null;

        if (dragSource === 'field' && fieldIds.has(targetId)) {
          this.#swapFieldPositions(dragId, targetId, origX, origY);
        } else if (dragSource === 'field' && subIds.has(targetId)) {
          this.#doSubstitution(dragId, targetId, origX, origY);
        } else if (dragSource === 'sub' && fieldIds.has(targetId)) {
          this.#doSubstitution(targetId, dragId);
        }
        return;
      } else if (!this.#dragState.moved) {
        this.#selectPlayer(this.#dragState.id);
      } else if (this.#dragState.source === 'field') {
        const draggedPlayer = this.fieldPlayers.find(p => p.id === this.#dragState!.id);
        if (draggedPlayer && draggedPlayer.y > FIELD.LENGTH + GOAL_DEPTH) {
          this.#snapBack();
          return;
        }
        this.#saveState();
      } else {
        this.#rebuildSubPlayers();
      }
      this.#dragState = null;
      this.swapTargetId = null;
    }
  }

  #snapBack() {
    if (!this.#dragState) return;
    const { id, originX, originY, source } = this.#dragState;
    if (source === 'field') {
      this.fieldPlayers = this.fieldPlayers.map(p =>
        p.id === id ? { ...p, x: originX, y: originY } : p,
      );
    } else {
      this.#rebuildSubPlayers();
    }
    this.#dragState = null;
    this.swapTargetId = null;
  }

  #onPointerLeave(_e: PointerEvent) {
    if (!this.#dragState) {
      this.#clearSelection();
    }
  }

  #resolveHit(target: EventTarget | null): { kind: string; id: string } | null {
    let el = target as SVGElement | null;
    while (el && el instanceof SVGElement) {
      const kind = el.dataset?.kind;
      const id = el.dataset?.id;
      if (kind && id) return { kind, id };
      el = el.parentElement as SVGElement | null;
    }
    return null;
  }

  // --- SVG rendering ---

  #renderDefs() {
    return svg`
      <defs>
        <pattern id="grass-stripes" width="68" height="13.125"
                 patternUnits="userSpaceOnUse"
                 patternTransform="translate(0, 17.5)">
          <rect width="68" height="6.5625" fill="var(--field-stripe-dark)" />
          <rect y="6.5625" width="68" height="6.5625" fill="var(--field-stripe-light)" />
        </pattern>

        <filter id="field-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.5"
                        flood-color="#000" flood-opacity="0.3" />
        </filter>

        <filter id="player-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.4"
                        flood-color="#000" flood-opacity="0.5" />
        </filter>

        <filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.15" stdDeviation="0.25"
                        flood-color="#000" flood-opacity="0.25" />
        </filter>

        <pattern id="goal-net" width="0.5" height="0.5"
                 patternUnits="userSpaceOnUse">
          <rect width="0.5" height="0.5" fill="#ddd" fill-opacity="0.15" />
          <line x1="0" y1="0" x2="0.5" y2="0.5"
                stroke="white" stroke-width="0.04" opacity="0.3" />
          <line x1="0.5" y1="0" x2="0" y2="0.5"
                stroke="white" stroke-width="0.04" opacity="0.3" />
        </pattern>
      </defs>
    `;
  }

  #isGK(p: FieldPlayer): boolean {
    if (this.fieldPlayers.length === 0) return false;
    const maxY = Math.max(...this.fieldPlayers.map(fp => fp.y));
    return p.y === maxY && this.fieldPlayers.some(fp => fp.id === p.id);
  }

  #renderPlayerCircle(p: FieldPlayer, kind: string) {
    const selected = p.id === this.selectedId;
    const isSwapTarget = p.id === this.swapTargetId;
    const selR = PLAYER_RADIUS + SEL_RING_OFFSET;
    const isGK = kind === 'player' && this.#isGK(p);
    const fillColor = isSwapTarget ? 'var(--pt-danger)' : isGK ? 'var(--pt-gk-fill)' : 'var(--pt-player-fill)';
    const textColor = isSwapTarget ? 'var(--pt-text-white)' : isGK ? 'var(--pt-gk-text)' : 'var(--pt-player-text)';

    const onFieldTime = kind === 'player' ? this.#getOnFieldTime(p.id) : 0;
    const timeFontSize = this.largeTimeDisplay ? NAME_FONT_SIZE : NAME_FONT_SIZE * 0.75;

    return svg`
      <g data-id="${p.id}" data-kind="${kind}" style="cursor: grab">
        ${kind === 'player' && this.matchPhase === 'game' && this.showOnFieldTime && onFieldTime > 0 ? svg`
          <text x="${p.x}" y="${p.y - PLAYER_RADIUS - 2}"
                text-anchor="middle" dominant-baseline="central"
                fill="var(--pt-field-text)" font-size="${timeFontSize}"
                font-family="system-ui, sans-serif"
                filter="url(#text-shadow)"
                style="pointer-events: none">
            ${formatTime(onFieldTime, this.timeDisplayFormat)}
          </text>
        ` : nothing}
        ${selected ? svg`
          <circle cx="${p.x}" cy="${p.y}" r="${selR}"
                  fill="none" stroke="white" stroke-width="0.2"
                  stroke-dasharray="0.5,0.3" />
        ` : nothing}
        <circle cx="${p.x}" cy="${p.y}" r="${PLAYER_HIT_RADIUS}"
                fill="transparent" />
        <circle cx="${p.x}" cy="${p.y}" r="${PLAYER_RADIUS + 0.2}"
                fill="none" stroke="${isGK ? 'var(--pt-gk-stroke)' : 'var(--pt-player-stroke)'}" stroke-width="0.25" stroke-opacity="0.8"
                filter="url(#player-shadow)"
                style="pointer-events: none" />
        <circle cx="${p.x}" cy="${p.y}" r="${PLAYER_RADIUS}"
                fill="${fillColor}"
                style="pointer-events: none" />
        ${p.number ? svg`
          <text x="${p.x}" y="${p.y}"
                text-anchor="middle" dominant-baseline="central"
                fill="${textColor}" font-size="${PLAYER_FONT_SIZE}" font-weight="bold"
                font-family="system-ui, sans-serif"
                style="pointer-events: none">
            ${p.number}
          </text>
        ` : nothing}
        <text x="${p.x}" y="${p.y + PLAYER_RADIUS + 2}"
              text-anchor="middle" dominant-baseline="central"
              fill="var(--pt-field-text)" font-size="${NAME_FONT_SIZE}"
              font-family="system-ui, sans-serif"
              filter="url(#text-shadow)"
              style="pointer-events: none">
          ${truncName(p.name)}
        </text>
        ${kind === 'sub' && this.matchPhase === 'game' && this.showBenchTime && this.#getBenchTime(p.id) > 0 ? svg`
          <text x="${p.x}" y="${p.y + PLAYER_RADIUS + 2 + NAME_FONT_SIZE + 1}"
                text-anchor="middle" dominant-baseline="central"
                fill="var(--pt-danger-light)" font-size="${timeFontSize}"
                font-family="system-ui, sans-serif"
                filter="url(#text-shadow)"
                style="pointer-events: none">
            ${formatTime(this.#getBenchTime(p.id), this.timeDisplayFormat)}
          </text>
        ` : nothing}
      </g>
    `;
  }

  #getBenchTime(playerId: string): number {
    return this.roster.find(r => r.id === playerId)?.benchTime ?? 0;
  }

  #getOnFieldTime(playerId: string): number {
    return this.roster.find(r => r.id === playerId)?.onFieldTime ?? 0;
  }

  render() {
    const vbX = -PADDING;
    const vbY = -PADDING;
    const vbW = FIELD.WIDTH + PADDING * 2;
    const subCount = this.subPlayers.length;
    const benchH = subCount > 0 ? getBenchHeight(subCount) + 2 : 0;
    const vbH = FIELD.LENGTH + PADDING + GOAL_DEPTH + PADDING + benchH;

    const dragId = this.#dragState?.id;

    if (this.currentView === 'home') {
      return html`
        <pt-home-view
          .teams="${this.teams}"
          .activeTeamId="${this.activeTeamId}"
          @team-selected="${this.#onTeamSelected}"
          @navigate-settings="${this.#onNavigateSettings}"
          @navigate-edit-team="${this.#onNavigateEditTeamNew}"
          @import-example="${this.#onImportExample}">
        </pt-home-view>
      `;
    }

    if (this.currentView === 'team') {
      return html`
        <pt-team-view
          .teamName="${this.teamName}"
          .roster="${this.roster}"
          .gameFormat="${this.gameFormat}"
          .formation="${this.formation}"
          .halfLength="${this.halfLength}"
          .teams="${this.teams}"
          .activeTeamId="${this.activeTeamId}"
          .gamePlans="${this.teams.find(t => t.id === this.activeTeamId)?.gamePlans ?? []}"
          @navigate-back="${this.#onNavigateBack}"
          @navigate-next="${this.#onNavigateNext}"
          @navigate-edit="${this.#onNavigateEditTeamExisting}"
          @navigate-settings="${this.#onNavigateSettings}"
          @game-plan-selected="${this.#onGamePlanSelected}"
          @create-game-plan="${this.#onCreateGamePlan}">
        </pt-team-view>
      `;
    }

    if (this.currentView === 'edit-team') {
      return html`
        <pt-edit-team-view
          .teams="${this.teams}"
          .teamId="${this.editingTeamId}"
          @team-saved="${this.#onTeamSaved}"
          @edit-cancelled="${this.#onEditCancelled}"
          @edit-team-deleted="${this.#onEditTeamDeleted}">
        </pt-edit-team-view>
      `;
    }

    if (this.currentView === 'settings') {
      return html`
        <pt-settings-view
          .showOnFieldTime="${this.showOnFieldTime}"
          .showBenchTime="${this.showBenchTime}"
          .largeTimeDisplay="${this.largeTimeDisplay}"
          .timeDisplayFormat="${this.timeDisplayFormat}"
          @bench-time-toggle="${this.#onBenchTimeToggle}"
          @on-field-time-toggle="${this.#onOnFieldTimeToggle}"
          @large-time-display="${this.#onLargeTimeDisplay}"
          @time-format-changed="${this.#onTimeFormatChanged}"
          @navigate-settings-back="${this.#onNavigateSettingsBack}">
        </pt-settings-view>
      `;
    }

    return html`
      <div class="rotate-overlay">
        <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="M880.71 163.3V163.32L740.23 163.16L738.09 127.98L882.89 128L880.71 163.3ZM106.9 438.69H106.88L105.81 458.31L105.78 459.55L105.99 479.2C106.11 489.65 114.67 498.03 125.12 497.92C135.5 497.81 143.84 489.35 143.84 479L143.63 459.77L144.64 441.37L146.85 423.11L150.26 405.01L154.85 387.19L160.6 369.72L167.5 352.63L175.49 336.07L184.57 320.03L194.67 304.65L205.76 289.97L217.8 276.04L230.73 262.93L244.27 250.89L258.55 239.75L273.53 229.55L289.13 220.35L305.29 212.18L321.96 205.07L339.06 199.05L356.5 194.15L374.21 190.39L392.15 187.78L409.75 186.38L388.69 203.43C384.01 207.22 381.58 212.76 381.58 218.35C381.58 222.59 382.98 226.86 385.86 230.41C392.52 238.64 404.61 239.91 412.84 233.25L475.4 182.59C479.9 178.95 482.51 173.47 482.53 167.68V167.59C482.53 161.81 479.9 156.42 475.4 152.77L413.16 102.35C404.93 95.68 392.85 96.95 386.18 105.18C383.3 108.73 381.9 113 381.9 117.25C381.9 122.84 384.33 128.38 389.01 132.17L409.17 148.5H409.04L407.82 148.56L388.53 150.1L387.31 150.24L368.17 153.02L366.96 153.24L348.04 157.26L346.85 157.55L328.23 162.78L327.06 163.15L308.81 169.58L307.67 170.03L289.88 177.62L288.77 178.14L271.51 186.87L270.44 187.46L253.78 197.29L252.74 197.95L236.75 208.83L235.76 209.55L220.51 221.45L219.57 222.23L205.11 235.09L204.22 235.94L190.42 249.93L189.58 250.84L176.73 265.71L175.95 266.68L164.1 282.36L163.39 283.38L152.6 299.81L151.95 300.87L142.27 317.97L141.69 319.07L133.15 336.77L132.64 337.91L125.28 356.13L124.85 357.3L118.71 375.97L118.36 377.17L113.45 396.2L113.18 397.41L109.54 416.72L109.35 417.95L106.98 437.46L106.93 438.7H106.88H106.9V438.69ZM1034.12 127.99H1035.01C1048.17 128.42 1058.72 139.24 1058.72 152.52V850.85L562.25 850.87V152.52C562.25 139.24 572.79 128.42 585.96 127.99L699.84 128.01L703.25 183.42C703.87 193.49 712.21 201.33 722.3 201.33L898.64 201.38C908.72 201.36 917.06 193.52 917.69 183.46L921.13 127.99H1034.12ZM165.32 878.25V878.27L130.31 880.29L130.22 735.5L165.38 737.71V737.73L165.32 878.26V878.25ZM810.51 955.19H810.54C821.5 955.19 830.33 964.07 830.33 975.02C830.33 985.97 821.45 994.85 810.5 994.85C799.55 994.85 790.67 985.97 790.67 975.02C790.67 964.07 799.52 955.19 810.47 955.19H810.52H810.51ZM810.5 916.95H810.46C778.39 916.95 752.43 942.95 752.43 975.02C752.43 1007.09 778.42 1033.08 810.49 1033.08C842.56 1033.08 868.56 1007.08 868.56 975.02C868.56 942.96 842.59 916.95 810.52 916.95H810.5ZM1058.75 1031.75V1031.8C1058.75 1045.02 1048.2 1056.26 1035.04 1056.28L585.98 1056.3C572.82 1055.87 562.26 1045.04 562.26 1031.76V889.07L1058.74 889.11V1031.75H1058.75ZM153.36 521.44V521.46C153.47 521.44 153.36 521.44 153.36 521.44C121.46 522.14 95.39 546.56 92.24 577.77V577.84C92.01 580 91.87 1031.59 91.87 1031.59C91.87 1055.47 105.03 1076.19 124.65 1086.81L124.74 1086.86C133.33 1091.56 143.14 1094.56 153.58 1094.56L481.57 1094.36C492.12 1094.36 500.68 1085.81 500.68 1075.26C500.68 1064.71 492.23 1056.26 481.77 1056.16C481.51 1056.16 154.65 1056.16 154.65 1056.16C150.38 1056.16 146.37 1055.07 142.87 1053.15L142.82 1053.12C135.64 1049 130.71 1041.43 130.42 1032.66L130.35 918.55L185.58 915.17C195.64 914.55 203.48 906.22 203.5 896.15C203.5 896.06 203.57 719.78 203.57 719.78C203.57 709.7 195.73 701.35 185.67 700.73L130.22 697.28L130.29 581.75C131.64 569.45 142.04 559.9 154.67 559.89L481.58 559.71C492.13 559.69 500.69 551.14 500.69 540.59C500.69 530.04 492.14 521.48 481.58 521.48H153.36V521.5V521.47V521.44ZM586.84 89.74H586.79C552.59 89.74 524.79 117.08 524.04 151.11V1033.18C524.81 1067.22 552.62 1094.56 586.81 1094.56H1034.2C1068.39 1094.54 1096.21 1067.2 1096.96 1033.17V151.11C1096.19 117.07 1068.38 89.73 1034.19 89.73H586.84V89.74Z" fill="white"/></svg>
      </div>
      <div class="app-container">
        <pt-settings-bar
          .teamName="${this.teamName}"
          .roster="${this.roster}"
          .gameFormat="${this.gameFormat}"
          .formation="${this.formation}"
          .halfLength="${this.halfLength}"
          .teams="${this.teams}"
          .activeTeamId="${this.activeTeamId}"
          .showRosterHint="${this.roster.length === 0}"
          .showBenchTime="${this.showBenchTime}"
          .showOnFieldTime="${this.showOnFieldTime}"
          .largeTimeDisplay="${this.largeTimeDisplay}"
          .opponentName="${this.opponentName}"
          .matchType="${this.matchType}"
          .matchPhase="${this.matchPhase}"
          @roster-updated="${this.#onRosterUpdated}"
          @bench-time-toggle="${this.#onBenchTimeToggle}"
          @on-field-time-toggle="${this.#onOnFieldTimeToggle}"
          @large-time-display="${this.#onLargeTimeDisplay}"
          @game-format-changed="${this.#onGameFormatChanged}"
          @formation-changed="${this.#onFormationChanged}"
          @settings-changed="${this.#onSettingsChanged}"
          @team-switched="${this.#onTeamSwitched}"
          @team-added="${this.#onTeamAdded}"
          @team-deleted="${this.#onTeamDeleted}"
          @navigate-team="${this.#onNavigateTeam}"
          @navigate-settings="${this.#onNavigateSettings}"
          .half1Started="${this.half1Started}"
          .half2Started="${this.half2Started}"
          @opponent-changed="${this.#onOpponentChanged}">
        </pt-settings-bar>

        <div class="formation-bar">
          ${this.matchPhase === 'plan' ? html`
            <button class="attendance-btn"
                    @click="${this.#openAttendance}"
                    aria-label="Attendance"
                    title="Attendance">
              <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="M591.17,510.72h.2s263.19,0,263.19,0h.2c9.03,0,17.54-3.5,23.97-9.85,6.42-6.37,10.1-15.18,10.1-24.21s-3.68-17.85-10.09-24.2c-6.42-6.36-14.94-9.86-23.97-9.86h-.2s-262.87,0-262.87,0c-.07,0-.14,0-.2,0h-.32c-9.04,0-17.56,3.5-23.97,9.86-6.41,6.34-10.09,15.16-10.09,24.19s3.68,17.85,10.1,24.2c6.42,6.36,14.93,9.86,23.97,9.86Z" fill="currentColor"/><path d="M481.66,624.11c-.09,0-.19,0-.28,0-.12,0-.25,0-.37,0h-.01c-8.6,0-16.8,3.21-23.11,9.05l-67.7,61.45-21.74-19.83s-.08-.07-.12-.11c-6.32-5.88-14.56-9.12-23.19-9.12-.47,0-.94,0-1.41.03-9.02.37-17.68,4.41-23.76,11.09-6.08,6.65-9.31,15.65-8.85,24.68.46,9,4.56,17.59,11.25,23.6l44.59,40.67c.07.06.14.13.2.19,6.28,5.73,14.42,8.89,22.92,8.9,8.52,0,16.66-3.14,22.94-8.85l90.61-82.23c6.81-6.05,10.96-14.72,11.4-23.82.44-9.16-2.9-18.23-9.16-24.91-6.25-6.68-15.08-10.61-24.23-10.78Z" fill="currentColor"/><path d="M481.66,846.78c-.09,0-.19,0-.28,0-.19,0-.39,0-.58.01-8.53.05-16.66,3.26-22.92,9.06l-67.69,61.44-21.86-19.93c-6.34-5.97-14.62-9.25-23.34-9.25-.41,0-.81,0-1.22.02-9.09.32-17.81,4.36-23.94,11.08-6.13,6.71-9.35,15.77-8.84,24.86.5,9.02,4.67,17.61,11.43,23.6l44.55,40.64c.07.07.14.13.21.2,6.28,5.73,14.42,8.89,22.92,8.89,8.53,0,16.65-3.14,22.93-8.84l90.63-82.26c6.81-6.06,10.96-14.73,11.39-23.83.44-9.14-2.9-18.22-9.15-24.9-6.25-6.68-15.09-10.61-24.24-10.78Z" fill="currentColor"/><path d="M591.16,956.08h.2s263.19,0,263.19,0h.2c9.03,0,17.54-3.5,23.97-9.85,6.42-6.37,10.1-15.18,10.1-24.21s-3.68-17.85-10.09-24.2c-6.42-6.36-14.93-9.86-23.96-9.86h-.19s0,0,0,0h-263.42c-9.03,0-17.54,3.5-23.96,9.86-6.41,6.34-10.09,15.16-10.09,24.2s3.68,17.85,10.1,24.2c6.42,6.36,14.93,9.86,23.97,9.86Z" fill="currentColor"/><path d="M986.19,181.5c-6.43-6.43-14.98-9.98-24.07-9.99h-189.42v-27.08c0-.16,0-.31,0-.47-.12-8.92-3.65-17.29-9.97-23.62-6.43-6.43-14.98-9.98-24.08-9.98h-47.93c-2.9-19.2-11.84-36.97-25.89-51.04-17.36-17.38-40.35-26.96-64.74-26.98-.02,0-.05,0-.07,0-24.42,0-47.44,9.58-64.81,26.98-14.05,14.07-22.99,31.83-25.89,51.04h-47.93c-9.1,0-17.65,3.54-24.08,9.98-6.43,6.43-9.98,14.98-9.98,24.08v27.08h-189.41c-9.1,0-17.65,3.55-24.08,9.98-6.43,6.44-9.97,14.99-9.97,24.08v928.01c0,9.1,3.54,17.65,9.97,24.08,6.43,6.43,14.98,9.97,24.07,9.98h724.21c9.1,0,17.65-3.55,24.08-9.98,6.43-6.43,9.97-14.98,9.97-24.08V205.57c0-9.09-3.54-17.64-9.97-24.07ZM576.38,144.41v-20.26c0-13.5,10.16-23.68,23.62-23.68,13.46,0,23.61,10.18,23.61,23.68v20.26c0,9.1,3.54,17.66,9.98,24.09,6.43,6.43,14.98,9.97,24.08,9.97h46.9v50.05h-209.15v-50.05h46.56c.11,0,.23,0,.34,0,9.1,0,17.65-3.54,24.08-9.97,6.43-6.42,9.98-14.98,9.98-24.08ZM437.29,286.66c6.43,6.43,14.99,9.98,24.08,9.98h277.26c9.1,0,17.65-3.54,24.08-9.98,6.43-6.43,9.98-14.98,9.98-24.08v-22.97h155.35v859.9H271.96V239.62s155.35,0,155.35,0v22.96h0c0,9.1,3.54,17.65,9.97,24.08Z" fill="currentColor"/><path d="M368.45,452.1s0,0,0,0c-6.35-6.03-14.68-9.35-23.45-9.35-.41,0-.81,0-1.22.02-9.09.33-17.81,4.37-23.93,11.08-6.13,6.72-9.35,15.78-8.85,24.85.5,9.01,4.66,17.6,11.42,23.59l44.55,40.63c.07.06.14.13.2.19,6.27,5.73,14.41,8.89,22.91,8.9h.06c8.48,0,16.61-3.14,22.89-8.84l90.46-82.11s.05-.04.07-.06c6.86-6.06,11.05-14.77,11.49-23.91.44-9.14-2.9-18.22-9.15-24.9-6.25-6.68-15.09-10.61-24.24-10.78-.09,0-.19,0-.28,0-.2,0-.39,0-.59.01-8.52.05-16.65,3.26-22.91,9.06l-67.69,61.44-21.74-19.83Z" fill="currentColor"/><path d="M591.68,665.28c-.07,0-.14,0-.21,0h-.26c-9.05,0-17.58,3.51-24,9.88-6.4,6.36-10.07,15.17-10.07,24.18s3.67,17.82,10.07,24.17c6.42,6.37,14.94,9.88,23.99,9.88h.16s263.21,0,263.21,0h.16c9.04,0,17.56-3.51,23.99-9.88,6.4-6.35,10.07-15.16,10.07-24.18s-3.67-17.82-10.06-24.17c-6.43-6.38-14.95-9.89-24.01-9.89h-.14s0,0,0,0h-262.89Z" fill="currentColor"/></svg>
            </button>
          ` : nothing}
          <span class="select-wrap">
            <label for="formation-select" class="visually-hidden">Formation</label>
            <select id="formation-select" @change="${(e: Event) => { this.formation = (e.target as HTMLSelectElement).value as FormationKey; this.#rebuildFieldPlayers(); this.#saveState(); this.selectedId = null; }}">
              ${FORMATIONS_BY_FORMAT[this.gameFormat].map(f => html`
                <option value="${f.key}" .selected="${f.key === this.formation}">${f.label}</option>
              `)}
            </select>
            <span class="caret"></span>
          </span>
          ${this.matchPhase === 'plan' ? html`
            <button class="reset-positions-btn"
                    @click="${this.#resetFormationPositions}"
                    aria-label="Reset Formation Positions"
                    title="Reset Formation Positions">
              <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M515.399 422.213C594.372 362.859 692.519 327.687 798.799 327.687C1059.49 327.687 1271.12 539.313 1271.12 800.007C1271.12 1060.7 1059.49 1272.33 798.799 1272.33C550.319 1272.33 346.439 1080.03 327.866 836.273C325.22 801.607 351.199 771.347 385.866 768.7C420.532 766.053 450.792 792.033 453.439 826.7C467.075 1005.43 616.612 1146.37 798.799 1146.37C989.959 1146.37 1145.16 991.167 1145.16 799.993C1145.16 608.833 989.959 453.633 798.799 453.633C724.736 453.633 656.066 476.931 599.732 516.607H641.358C676.118 516.607 704.331 544.82 704.331 579.58C704.331 614.345 676.118 642.559 641.358 642.559H452.424C417.627 642.559 389.446 614.376 389.446 579.58V390.647C389.446 355.887 417.659 327.673 452.424 327.673C487.184 327.673 515.398 355.887 515.398 390.647L515.399 422.213Z" fill="currentColor"/></svg>
            </button>
          ` : nothing}
          ${this.matchPhase === 'game' && !(this.half1Started && this.half2Started) ? html`
            <button class="edit-lineup-btn"
                    @click="${this.#onEditLineup}"
                    aria-label="Edit Lineup"
                    title="Edit Lineup">
              <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg"><path d="M1366.67,23.33H233.33c-23.94,0-43.33,19.49-43.33,43.33v1466.66c0,23.85,19.4,43.34,43.33,43.34h1133.34c23.85,0,43.33-19.48,43.33-43.34V66.67c0-23.86-19.48-43.33-43.33-43.33ZM990,1376.67v113.33h-380v-113.33h380ZM610,223.33v-113.33h380v113.33h-380ZM1033.33,1290h-466.66c-23.94,0-43.33,19.49-43.33,43.33v156.67h-246.67v-646.67h256.42c20.8,128.58,132.53,227.07,266.91,227.07s246.11-98.48,266.92-227.07h256.41v646.67h-246.66v-156.67c0-23.85-19.48-43.33-43.34-43.33ZM621.44,756.67c19.54-80.38,92.18-140.4,178.56-140.4s159.04,60.02,178.56,140.4h-357.12ZM978.56,843.33c-19.55,80.38-92.23,140.4-178.56,140.4s-159-60.01-178.56-140.4h357.11ZM800,529.6c-134.38,0-246.11,98.48-266.91,227.07h-256.42V110h246.67v156.67c0,23.84,19.4,43.33,43.33,43.33h466.66c23.86,0,43.34-19.48,43.34-43.33V110h246.66v646.67h-256.41c-20.81-128.58-132.54-227.07-266.92-227.07Z" fill="currentColor"/></svg>
            </button>
          ` : nothing}
        </div>

        <div class="board">
        <div class="svg-wrap">
          <svg
            class="field"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="${vbX} ${vbY} ${vbW} ${vbH}"
            preserveAspectRatio="xMidYMid meet"
            style="touch-action: none"
            @pointerdown="${this.#onPointerDown}"
            @pointermove="${this.#onPointerMove}"
            @pointerup="${this.#onPointerUp}"
            @pointerleave="${this.#onPointerLeave}">

            ${this.#renderDefs()}

            <rect x="${vbX}" y="${vbY}"
                  width="${vbW}" height="${vbH}"
                  fill="var(--pt-bg-body)" />

            <rect x="0" y="0"
                  width="${FIELD.WIDTH}" height="${FIELD.LENGTH}"
                  fill="url(#grass-stripes)" rx="0.5"
                  filter="url(#field-shadow)" />

            ${renderField()}

            <g class="players-layer">
              ${this.fieldPlayers
                .filter(p => p.id !== dragId && p.id !== this.selectedId)
                .map(p => this.#renderPlayerCircle(p, 'player'))}
              ${this.fieldPlayers
                .filter(p => p.id === this.selectedId && p.id !== dragId)
                .map(p => this.#renderPlayerCircle(p, 'player'))}
            </g>

            ${subCount > 0 ? svg`
              <text x="${PADDING}" y="${BENCH_TOP}"
                    fill="var(--pt-text)" font-size="${NAME_FONT_SIZE}" font-weight="bold"
                    font-family="system-ui, sans-serif"
                    style="pointer-events: none">
                Substitutes
              </text>
              <g class="subs-layer">
                ${this.subPlayers
                  .filter(p => p.id !== dragId && p.id !== this.selectedId)
                  .map(p => this.#renderPlayerCircle(p, 'sub'))}
                ${this.subPlayers
                  .filter(p => p.id === this.selectedId && p.id !== dragId)
                  .map(p => this.#renderPlayerCircle(p, 'sub'))}
              </g>
            ` : nothing}

            ${dragId ? svg`
              <g class="drag-layer">
                ${[...this.fieldPlayers, ...this.subPlayers]
                  .filter(p => p.id === dragId)
                  .map(p => this.#renderPlayerCircle(p, this.#dragState?.source === 'field' ? 'player' : 'sub'))}
              </g>
            ` : nothing}
          </svg>
        </div>
        </div>

        <pt-timer-bar
          .halfLength="${this.halfLength}"
          .teamName="${this.teamName}"
          .roster="${this.roster}"
          .gameEvents="${this.gameEvents}"
          .matchPhase="${this.matchPhase}"
          .planHalf="${this.planHalf}"
          .half1Started="${this.half1Started}"
          .half2Started="${this.half2Started}"
          .timeDisplayFormat="${this.timeDisplayFormat}"
          @timer-tick="${this.#onTimerTick}"
          @reset-half="${this.#onResetHalf}"
          @reset-game="${this.#onResetGame}"
          @game-half-switched="${this.#onGameHalfSwitched}"
          @save-plan="${this.#onSavePlan}"
          @edit-lineup="${this.#onEditLineup}"
          @cancel-plan="${this.#onCancelPlan}"
          @delete-plan="${this.#onDeletePlan}"
          @plan-half-switch="${this.#onPlanHalfSwitch}">
        </pt-timer-bar>

        <dialog id="plan-2h-dialog" class="game-dialog">
          <div class="dialog-header">
            <h2>Plan 2nd Half</h2>
            <button class="dialog-close" @click="${this.#cancelPlan2H}" aria-label="Close" title="Close">
              <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="dialog-body">
            <p>Ready to plan the 2nd half? Your 1st half lineup will be copied as a starting point.</p>
            <div class="confirm-actions">
              <button class="cancel-btn" @click="${this.#cancelPlan2H}">Cancel</button>
              <div class="confirm-actions-right">
                <button class="confirm-yes" @click="${this.#confirmPlan2H}">Plan 2nd Half</button>
              </div>
            </div>
          </div>
        </dialog>

        <dialog id="attendance-dialog" class="game-dialog">
          <div class="dialog-header">
            <h2>Attendance</h2>
            <button class="dialog-close" @click="${this.#closeAttendance}" aria-label="Close" title="Close">
              <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="attendance-body">
            ${this.roster.map(p => html`
              <label class="attendance-row">
                <input type="checkbox"
                       .checked="${!this._attendanceAbsentIds.has(p.id)}"
                       @change="${() => this.#toggleAttendance(p.id)}" />
                <span class="attendance-number">${p.number || ''}</span>
                <span class="attendance-name">${p.name}</span>
              </label>
            `)}
          </div>
          <div class="attendance-footer">
            <button class="attendance-done" @click="${this.#confirmAttendance}">Done</button>
          </div>
        </dialog>

        <dialog id="copy-match-dialog" class="game-dialog">
          <div class="dialog-header">
            <h2>Copy Lineups</h2>
            <button class="dialog-close" @click="${this.#skipCopyMatch}" aria-label="Close" title="Close">
              <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="dialog-body">
            <p>Would you like to copy the lineups from your last match as a starting point?</p>
            <div class="confirm-actions">
              <button class="cancel-btn" @click="${this.#skipCopyMatch}">Start Fresh</button>
              <div class="confirm-actions-right">
                <button class="confirm-yes" @click="${this.#confirmCopyMatch}">Copy Lineups</button>
              </div>
            </div>
          </div>
        </dialog>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'playing-time': PlayingTime;
  }
}
