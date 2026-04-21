import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';

import './pt-toolbar.js';
import './pt-timer-bar.js';
import { renderField, FIELD, PADDING } from '../lib/field.js';
import { getFormationPositions } from '../lib/formations.js';
import { screenToSVG, uid } from '../lib/svg-utils.js';
import { loadAppState, saveAppState, createNewTeam } from '../lib/storage.js';
import type { RosterEntry, FieldPlayer, FormationKey, GameFormat, StoredTeam, StoredAppState, GameEvent } from '../lib/types.js';
import { PLAYER_RADIUS, PLAYER_HIT_RADIUS, PLAYER_FONT_SIZE, NAME_FONT_SIZE, getPlayerCount, getDefaultFormation, formatTime } from '../lib/types.js';
import type {
  RosterUpdatedEvent, FormationChangedEvent, SettingsChangedEvent,
  GameFormatChangedEvent, TeamSwitchedEvent, TeamAddedEvent, TeamDeletedEvent,
  BenchTimeToggleEvent, OnFieldTimeToggleEvent,
} from './pt-toolbar.js';
import type { TimerTickEvent, ResetHalfEvent, ResetGameEvent } from './pt-timer-bar.js';

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
      height: 100vh;
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

    .onboarding-card {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--pt-bg-primary);
      border-radius: 10px;
      padding: 24px 32px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      pointer-events: none;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.85rem;
      color: var(--pt-text);
    }

    .onboarding-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .onboarding-list li {
      display: flex;
      align-items: center;
      gap: 14px;
      white-space: nowrap;
    }

    .onboarding-list svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      fill: currentColor;
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
  `;

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
  @state() accessor selectedId: string | null = null;
  @state() accessor swapTargetId: string | null = null;
  @state() accessor gameEvents: GameEvent[] = [];

  @query('svg.field') accessor svgEl!: SVGSVGElement;
  @query('pt-timer-bar') accessor timerBar!: import('./pt-timer-bar.js').PtTimerBar;

  #dragState: {
    id: string;
    offsetX: number;
    offsetY: number;
    originX: number;
    originY: number;
    moved: boolean;
    source: 'field' | 'sub';
  } | null = null;

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
  }

  #loadTeam(teamId: string) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return;

    this.activeTeamId = teamId;
    this.teamName = team.teamName;
    this.halfLength = team.halfLength;
    this.showBenchTime = team.showBenchTime ?? true;
    this.showOnFieldTime = team.showOnFieldTime ?? true;
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
    const count = getPlayerCount(this.gameFormat);
    const subs = this.roster.slice(count);
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
      gameFormat: this.gameFormat,
      formation: this.formation,
      fieldPositions: this.fieldPlayers.map(fp => ({
        rosterIndex: this.roster.findIndex(r => r.id === fp.id),
        x: fp.x,
        y: fp.y,
      })),
    };

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

  #onTimerTick(e: TimerTickEvent) {
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

  #onResetHalf(e: ResetHalfEvent) {
    const field = e.half === 1 ? 'half1Time' : 'half2Time';
    this.roster = this.roster.map(p => ({ ...p, [field]: 0, benchTime: 0, onFieldTime: 0 }));
    this.gameEvents = this.gameEvents.filter(ev => ev.half !== e.half);
    this.#rebuildSubPlayers();
    this.#saveState();
  }

  #onResetGame(_e: ResetGameEvent) {
    this.roster = this.roster.map(p => ({ ...p, half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0 }));
    this.gameEvents = [];
    this.#rebuildSubPlayers();
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

    const count = getPlayerCount(this.gameFormat);
    const newSubs = rosterCopy.slice(count);
    const benchPositions = layoutBench(newSubs.length);
    const updatedSubPlayers = newSubs.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: benchPositions[i]?.x ?? FIELD.WIDTH / 2,
      y: benchPositions[i]?.y ?? BENCH_TOP + 5,
      number: entry.number,
      name: entry.name,
    }));

    this.roster = rosterCopy;
    this.fieldPlayers = updatedFieldPlayers;
    this.subPlayers = updatedSubPlayers;
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

        <filter id="player-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.4"
                        flood-color="#000" flood-opacity="0.5" />
        </filter>

        <filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.15" stdDeviation="0.25"
                        flood-color="#000" flood-opacity="0.35" />
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

  #renderPlayerCircle(p: FieldPlayer, kind: string) {
    const selected = p.id === this.selectedId;
    const isSwapTarget = p.id === this.swapTargetId;
    const selR = PLAYER_RADIUS + SEL_RING_OFFSET;
    const fillColor = isSwapTarget ? 'var(--pt-danger)' : 'var(--pt-text-white)';
    const textColor = isSwapTarget ? 'var(--pt-text-white)' : 'var(--pt-bg-dark)';

    const onFieldTime = kind === 'player' ? this.#getOnFieldTime(p.id) : 0;

    return svg`
      <g data-id="${p.id}" data-kind="${kind}" style="cursor: grab">
        ${kind === 'player' && this.showOnFieldTime && onFieldTime > 0 ? svg`
          <text x="${p.x}" y="${p.y - PLAYER_RADIUS - 2}"
                text-anchor="middle" dominant-baseline="central"
                fill="white" font-size="${NAME_FONT_SIZE * 0.75}"
                font-family="system-ui, sans-serif"
                filter="url(#text-shadow)"
                style="pointer-events: none">
            ${formatTime(onFieldTime)}
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
                fill="none" stroke="white" stroke-width="0.25" stroke-opacity="0.8"
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
              fill="white" font-size="${NAME_FONT_SIZE}"
              font-family="system-ui, sans-serif"
              filter="url(#text-shadow)"
              style="pointer-events: none">
          ${truncName(p.name)}
        </text>
        ${kind === 'sub' && this.showBenchTime && this.#getBenchTime(p.id) > 0 ? svg`
          <text x="${p.x}" y="${p.y + PLAYER_RADIUS + 2 + NAME_FONT_SIZE + 1}"
                text-anchor="middle" dominant-baseline="central"
                fill="var(--pt-danger)" font-size="${NAME_FONT_SIZE * 0.75}"
                font-family="system-ui, sans-serif"
                filter="url(#text-shadow)"
                style="pointer-events: none">
            ${formatTime(this.#getBenchTime(p.id))}
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
          @roster-updated="${this.#onRosterUpdated}"
          @bench-time-toggle="${this.#onBenchTimeToggle}"
          @on-field-time-toggle="${this.#onOnFieldTimeToggle}"
          @game-format-changed="${this.#onGameFormatChanged}"
          @formation-changed="${this.#onFormationChanged}"
          @settings-changed="${this.#onSettingsChanged}"
          @team-switched="${this.#onTeamSwitched}"
          @team-added="${this.#onTeamAdded}"
          @team-deleted="${this.#onTeamDeleted}">
        </pt-settings-bar>

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
                  fill="url(#grass-stripes)" rx="0.5" />

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
                    fill="var(--pt-text-muted)" font-size="${NAME_FONT_SIZE}" font-weight="bold"
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
          ${this.roster.length === 0 ? html`
            <div class="onboarding-card">
              <ol class="onboarding-list">
                <li>
                  <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg"><path d="M1250.75 484.752L1150 585.501V790.128L1350 650.128L1250.75 484.752Z"/><path d="M450 585.499L349.251 484.75L250 650.123L450 790.123V585.499Z"/><path d="M500 575.125V1275.13H1100V575.125C1100 568.5 1102.63 562.125 1107.31 557.437L1224.25 440.5L1210 416.688C1203.62 406.001 1193.44 398.063 1181.5 394.5L950.059 325.063L947.497 330.125C925.059 375 884.871 410.188 835.871 421.063C761.371 437.625 687.991 400.937 655.311 335.563L650.061 325L418.621 394.437C406.684 398 396.496 405.937 390.121 416.625L375.871 440.437L492.808 557.375C497.495 562.062 500.121 568.437 500.121 575.063L500 575.125ZM950 575.125C977.625 575.125 1000 597.5 1000 625.125C1000 652.751 977.625 675.125 950 675.125C922.375 675.125 900 652.751 900 625.125C900 597.5 922.375 575.125 950 575.125ZM600 1125.13H700V1175.13H600V1125.13Z"/></svg>
                  Edit your team
                </li>
                <li>
                  <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg"><path d="M1438.88 1189.92C1442.57 1159.36 1436.19 1131.65 1419.73 1106.8C1401.26 1079.93 1364.65 1058.43 1309.9 1042.31C1254.82 1025.85 1218.54 1009.73 1201.08 993.943C1183.28 978.49 1176.22 960.188 1179.92 939.027C1197.38 927.272 1209.64 912.157 1216.69 893.683C1267.08 908.464 1308.22 901.412 1340.13 872.527C1316.62 848.678 1303.52 819.288 1300.83 784.361C1298.81 729.612 1293.77 681.081 1285.71 638.761C1277.65 596.105 1262.7 561.511 1240.88 534.977C1220.05 509.785 1192.85 493.831 1159.26 487.112C1157.24 486.779 1155.23 486.44 1153.21 486.107H1152.2C1104.51 481.737 1070.25 490.305 1049.43 511.799C1037.33 506.424 1025.58 502.898 1014.16 501.221C1012.14 500.883 1009.96 500.716 1007.61 500.716C982.418 498.362 958.402 505.081 935.564 520.867C911.382 543.372 894.924 570.075 886.195 600.971C877.461 632.543 870.575 672.345 865.539 720.373L859.997 812.065C855.627 836.246 842.362 856.736 820.195 873.528C856.133 900.398 896.939 903.924 942.62 884.106C952.021 908.294 966.631 925.924 986.449 937.007C989.475 959.845 982.589 977.814 965.793 990.918C948.662 1004.02 891.564 1029.88 794.498 1068.5C760.571 1085.3 740.087 1104.94 733.03 1127.45C725.644 1149.62 722.785 1170.44 724.467 1189.92L1438.88 1189.92Z"/><path d="M932.921 1148.58C927.885 1123.06 918.478 1103.41 904.708 1089.63C887.577 1069.82 822.421 1038.08 709.228 994.416C672.957 977.619 654.816 958.479 654.816 936.979L653.305 912.296C682.191 882.739 701.503 848.812 711.243 810.525C726.357 804.145 735.592 791.213 738.951 771.728C758.096 733.103 754.737 706.739 728.878 692.635C749.028 623.78 746.68 572.389 721.825 538.475L638.19 425.115C638.19 443.588 634.158 450.979 626.101 447.281C630.465 435.865 630.465 427.636 626.101 422.599C620.726 435.359 611.825 442.749 599.398 444.765L610.482 426.625C603.43 437.042 592.679 442.412 578.236 442.751C574.205 437.714 575.382 429.985 581.762 419.573C574.038 424.276 567.486 430.323 562.117 437.713C554.388 436.37 551.534 427.969 553.549 412.52C547.169 419.911 540.45 427.968 533.399 436.703C519.961 435.697 519.461 426.796 531.888 410C516.773 413.698 508.205 421.255 506.191 432.672C500.821 429.313 497.628 422.427 496.623 412.016C479.826 433.177 458.664 454.839 433.139 477.011L380.743 524.871C358.915 548.381 348.503 578.444 349.508 615.053C350.514 651.329 355.389 677.189 364.118 692.641C338.591 709.1 334.732 735.797 352.529 772.745C356.56 794.24 366.3 805.828 381.753 807.505C392.837 848.484 413.155 883.417 442.712 912.303C445.738 945.215 433.477 969.063 405.936 983.839C387.463 993.917 365.967 1003.32 341.447 1012.05L273.936 1039.26C227.587 1060.08 197.191 1080.07 182.748 1099.21C164.275 1126.75 157.055 1156.98 161.081 1189.9H932.415C935.441 1175.79 935.607 1162.02 932.92 1148.59L932.921 1148.58Z"/></svg>
                  Add players to your team
                </li>
                <li>
                  <svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="92" height="72" rx="8" fill="none" stroke="currentColor" stroke-width="6"/><polyline points="38,34 50,46 62,34" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Set your formation
                </li>
                <li>
                  <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m713.7 816.12-212.88-86.832v-252.07c0-34.789-12.336-66.191-34.523-88.223-23.902-24.07-53.762-36.793-86.375-36.793-70.391 0-129.86 57.254-129.86 125.02v316.37c-70.008-58.246-88.246-58.234-98.93-58.234-36.504 0-71.074 15.707-94.848 43.094-42.973 49.488-39.562 125.32 7.6797 172.56l211.82 213.07c7.8945 7.9453 18.285 11.93 28.68 11.93 10.309 0 20.629-3.9258 28.512-11.762 15.84-15.758 15.91-41.352 0.16797-57.203l-211.92-213.16c-17.137-17.137-18.887-45.133-3.8867-62.41 7.2344-8.3281 17.352-13.609 28.344-14.914 17.977 9.9961 65.941 49.547 103.3 83.605 14.484 13.883 34.246 18 51.887 10.691 18.551-7.6797 30.086-25.957 30.086-47.699v-385.94c0-23.102 23.34-44.125 48.973-44.125 11.027 0 20.23 4.1055 29.172 13.094 8.9531 8.8906 10.836 21.781 10.836 31.031v306.45l263.14 107.33c26.473 10.871 44.258 35.953 44.258 62.398v180.23c0 22.344 18.109 40.441 40.441 40.441s40.441-18.109 40.441-40.441l-0.007812-180.23c0-58.883-37.941-114.04-94.5-137.27z"/><path d="m187.04 633.77c18.77-12.109 24.156-37.141 12.047-55.906-21.637-33.516-33.07-72.434-33.07-112.55 0-114.59 93.227-207.82 207.82-207.82 114.6 0 207.82 93.227 207.82 207.82 0 40.117-11.438 79.031-33.07 112.55-12.109 18.77-6.7188 43.801 12.047 55.906 6.7812 4.3789 14.375 6.4805 21.898 6.4805 13.273 0 26.281-6.5273 34.02-18.516 30.098-46.621 46.008-100.71 46.008-156.42 0-159.19-129.52-288.71-288.71-288.71s-288.71 129.52-288.71 288.71c0 55.703 15.91 109.8 46.008 156.42 12.094 18.754 37.129 24.164 55.895 12.035z"/><path d="m1092.6 156.41-0.70703 166.69c-0.097656 22.344 17.941 40.523 40.273 40.621h0.16797c22.262 0 40.344-18 40.441-40.273l1.0195-242.39c0.14062-31.211-25.156-56.82-56.68-57.059h-244.61c-22.344 0-40.441 18.109-40.441 40.441 0 22.332 18.109 40.441 40.441 40.441h157.96l-259.16 259.16c-15.793 15.793-15.793 41.398 0 57.191 7.8945 7.8945 18.254 11.844 28.609 11.844 10.344 0 20.699-3.9492 28.598-11.844l260.82-260.82c1.2461-1.2461 2.2188-2.6367 3.2734-4.0078zm0.21484-51.516-0.011719 2.5938c-0.67187-0.88672-1.3672-1.7539-2.1133-2.5938z"/></svg>
                  Drag to swap players and subs
                </li>
                <li>
                  <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m789.6 570-277.2-184.8c-24-15.602-55.199 1.1992-55.199 30v369.6c0 28.801 32.398 45.602 55.199 30l277.2-184.8c21.602-14.398 21.602-45.602 0.003906-60z"/><path d="m600 30c-314.4 0-570 255.6-570 570s255.6 570 570 570 570-255.6 570-570-255.6-570-570-570zm0 1051.2c-265.2 0-481.2-216-481.2-481.2s216-481.2 481.2-481.2 481.2 216 481.2 481.2-216 481.2-481.2 481.2z"/></svg>
                  Start the game
                </li>
                <li>
                  <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="M600,360c-182.4,0-330,147.6-330,330s147.6,330,330,330,330-147.6,330-330-147.6-330-330-330ZM642.48,732.32l-84.86-84.85,179.89-179.91,84.86,84.85-179.89,179.91Z" fill="none"/><path d="M1005.41,861.21c22.95-54.24,34.59-111.84,34.59-171.21,0-54.49-9.89-107.68-29.38-158.11-18.82-48.68-45.99-93.33-80.76-132.72-70.31-79.64-166.63-131.37-271.21-145.66l-8.65-1.18v-82.33h60v-100h-220v100h60v82.33l-8.65,1.18c-104.58,14.29-200.9,66.02-271.21,145.66-34.77,39.39-61.94,84.04-80.76,132.72-19.5,50.43-29.38,103.63-29.38,158.11,0,59.37,11.64,116.97,34.59,171.21,22.17,52.39,53.91,99.45,94.33,139.87,40.42,40.42,87.48,72.16,139.87,94.33,54.24,22.95,111.84,34.59,171.21,34.59s116.97-11.64,171.21-34.59c52.39-22.17,99.45-53.91,139.87-94.33s72.16-87.48,94.33-139.87ZM732.41,1003.3c-41.93,17.72-86.47,26.7-132.41,26.7s-90.48-8.98-132.41-26.7c-40.5-17.11-76.85-41.62-108.07-72.83-31.21-31.21-55.71-67.57-72.83-108.07-17.72-41.93-26.7-86.47-26.7-132.41s8.98-90.48,26.7-132.41c17.11-40.5,41.62-76.85,72.83-108.07s67.57-55.71,108.07-72.83c41.93-17.72,86.47-26.7,132.41-26.7s90.48,8.98,132.41,26.7c40.5,17.11,76.85,41.62,108.07,72.83,31.21,31.21,55.71,67.57,72.83,108.07,17.72,41.93,26.7,86.47,26.7,132.41s-8.98,90.48-26.7,132.41c-17.11,40.5-41.62,76.85-72.83,108.07s-67.57,55.71-108.07,72.83Z"/><path d="M353.41,121.15c-35.19,15.26-68.81,33.54-100.06,54.41-31.69,21.17-61.25,45.22-87.97,71.58l70.95,69.95c44.09-43.39,96.17-78.33,155.05-104.02l-37.97-91.92Z"/><path d="M942.79,173.04c-30.17-19.94-62.49-37.37-96.19-51.91l-37.97,91.92c56.53,24.5,106.93,57.84,150.05,99.23l69.9-70.9c-26.79-25.44-55.61-48.39-85.79-68.34Z"/><rect x="572.78" y="549.94" width="234.42" height="100.01" transform="translate(-222.12 663.67) rotate(-45)"/></svg>
                  Check players' times
                </li>
              </ol>
            </div>
          ` : nothing}
        </div>
        </div>

        <pt-timer-bar
          .halfLength="${this.halfLength}"
          .teamName="${this.teamName}"
          .roster="${this.roster}"
          .gameEvents="${this.gameEvents}"
          @timer-tick="${this.#onTimerTick}"
          @reset-half="${this.#onResetHalf}"
          @reset-game="${this.#onResetGame}">
        </pt-timer-bar>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'playing-time': PlayingTime;
  }
}
