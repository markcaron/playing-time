import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { RosterEntry, FormationKey, GameFormat, StoredTeam } from '../lib/types.js';
import { FORMATIONS_BY_FORMAT, GAME_FORMATS, formatTime } from '../lib/types.js';
import { uid } from '../lib/svg-utils.js';

export class RosterUpdatedEvent extends Event {
  static readonly eventName = 'roster-updated' as const;
  constructor(
    public teamName: string,
    public roster: RosterEntry[],
  ) {
    super(RosterUpdatedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class FormationChangedEvent extends Event {
  static readonly eventName = 'formation-changed' as const;
  constructor(public formation: FormationKey) {
    super(FormationChangedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class GameFormatChangedEvent extends Event {
  static readonly eventName = 'game-format-changed' as const;
  constructor(public gameFormat: GameFormat) {
    super(GameFormatChangedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class SettingsChangedEvent extends Event {
  static readonly eventName = 'settings-changed' as const;
  constructor(public halfLength: number) {
    super(SettingsChangedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class TimerTickEvent extends Event {
  static readonly eventName = 'timer-tick' as const;
  constructor(public half: 1 | 2) {
    super(TimerTickEvent.eventName, { bubbles: true, composed: true });
  }
}

export class ResetHalfEvent extends Event {
  static readonly eventName = 'reset-half' as const;
  constructor(public half: 1 | 2) {
    super(ResetHalfEvent.eventName, { bubbles: true, composed: true });
  }
}

export class ResetGameEvent extends Event {
  static readonly eventName = 'reset-game' as const;
  constructor() {
    super(ResetGameEvent.eventName, { bubbles: true, composed: true });
  }
}

export class TeamSwitchedEvent extends Event {
  static readonly eventName = 'team-switched' as const;
  constructor(public teamId: string) {
    super(TeamSwitchedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class TeamAddedEvent extends Event {
  static readonly eventName = 'team-added' as const;
  constructor() {
    super(TeamAddedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class TeamDeletedEvent extends Event {
  static readonly eventName = 'team-deleted' as const;
  constructor(public teamId: string) {
    super(TeamDeletedEvent.eventName, { bubbles: true, composed: true });
  }
}

@customElement('pt-toolbar')
export class PtToolbar extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 100;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .bar {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background: #16213e;
      user-select: none;
    }

    .roster-disclosure {
      position: relative;
    }

    summary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      background: #0f3460;
      color: #e0e0e0;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      list-style: none;
    }

    summary::-webkit-details-marker { display: none; }
    summary::marker { display: none; content: ''; }

    summary:hover { background: #1a4a7a; }

    summary:focus-visible {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
    }

    details[open] > summary {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .settings-disclosure { position: relative; }
    .settings-disclosure summary { padding: 6px 10px; }

    .drawer.settings-drawer {
      right: 0;
      left: auto;
      min-width: 220px;
      width: auto;
    }

    .settings-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settings-row label { white-space: nowrap; }

    .settings-number { width: 40px; }

    button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border: 1px solid transparent;
      border-radius: 6px;
      background: #0f3460;
      color: #e0e0e0;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    button:hover { background: #1a4a7a; }

    button:focus-visible {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.35;
      cursor: default;
      pointer-events: none;
    }

    .spacer { flex: 1; }

    .timer {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .timer-display {
      font-size: 1.1rem;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
      color: #e0e0e0;
      min-width: 48px;
      text-align: center;
      letter-spacing: 0.5px;
    }

    .timer-display.stoppage { color: #e94560; }

    .play-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.25);
      background: #0f3460;
      color: #e0e0e0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s;
    }

    .play-btn:hover { background: #1a4a7a; }

    .play-btn:focus-visible {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
    }

    .play-btn.running {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .play-btn svg {
      width: 14px;
      height: 14px;
    }

    .half-toggle {
      display: flex;
      border: 1px solid #1a4a7a;
      border-radius: 6px;
    }

    .half-toggle button {
      padding: 6px 8px;
      font-size: 0.75rem;
      font-weight: bold;
      border: none;
      border-radius: 0;
      background: transparent;
      color: #aaa;
      transition: background 0.15s, color 0.15s;
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .half-toggle button:first-child {
      border-radius: 5px 0 0 5px;
    }

    .half-toggle button:last-child {
      border-radius: 0 5px 5px 0;
    }

    .half-toggle button.active {
      background: #fff;
      color: #16213e;
    }

    .half-toggle button.active:disabled {
      opacity: 1;
    }

    .half-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
    }

    .reset-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 1px solid #1a4a7a;
      background: transparent;
      color: #aaa;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s, color 0.15s;
    }

    .reset-btn:hover {
      background: #1a4a7a;
      color: #e0e0e0;
    }

    .reset-btn:focus-visible {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
    }

    .reset-btn svg {
      width: 12px;
      height: 12px;
    }

    .confirm-overlay {
      position: fixed;
      inset: 0;
      z-index: 500;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .confirm-dialog {
      background: #16213e;
      border: 1px solid #1a4a7a;
      border-radius: 10px;
      padding: 24px;
      max-width: 320px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .confirm-dialog p {
      margin: 0 0 16px;
      font-size: 0.9rem;
      color: #e0e0e0;
      line-height: 1.4;
    }

    .confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: center;
    }

    .confirm-actions button {
      padding: 8px 20px;
      font-size: 0.85rem;
      border-radius: 6px;
    }

    .confirm-actions .confirm-yes {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .confirm-actions .confirm-yes:hover {
      background: #d13350;
    }

    select {
      appearance: none;
      -webkit-appearance: none;
      padding: 6px 26px 6px 10px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      background: #0f3460;
      color: #e0e0e0;
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      background-image: none;
    }

    select:focus-visible {
      outline: 2px solid #4ea8de;
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

    .drawer {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      width: calc(100vw - 24px);
      max-width: 456px;
      z-index: 200;
      background: #0f3460;
      border: 1px solid #1a4a7a;
      border-radius: 6px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 60vh;
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
      -webkit-overflow-scrolling: touch;
      animation: slideDown 0.15s ease-out;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .drawer label {
      font-size: 0.8rem;
      color: #aaa;
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .drawer-header .team-label {
      font-size: 0.9rem;
      color: #e0e0e0;
      font-weight: bold;
    }

    .mode-toggle {
      display: flex;
      border: 1px solid #1a4a7a;
      border-radius: 6px;
    }

    .mode-toggle button {
      padding: 6px 8px;
      font-size: 0.75rem;
      font-weight: bold;
      border: none;
      border-radius: 0;
      background: transparent;
      color: #aaa;
      transition: background 0.15s, color 0.15s;
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }

    .mode-toggle button:first-child {
      border-radius: 5px 0 0 5px;
    }

    .mode-toggle button:last-child {
      border-radius: 0 5px 5px 0;
    }

    .mode-toggle button.active {
      background: #fff;
      color: #16213e;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .roster-table th {
      text-align: left;
      font-size: 0.75rem;
      color: #aaa;
      font-weight: normal;
      padding: 2px 8px 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .roster-table th.time-col {
      text-align: right;
      width: 50px;
    }

    .roster-table td {
      padding: 5px 8px 5px 0;
      color: #e0e0e0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .roster-table td.jersey-col {
      color: #aaa;
      width: 32px;
    }

    .roster-table td.time-col {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-size: 0.8rem;
      color: #aaa;
    }

    .roster-table td.time-col.total {
      font-weight: bold;
      color: #e0e0e0;
    }

    .add-player-label {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 16px;
      margin-top: 2px;
    }

    .section-separator {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 10px;
      margin-top: 2px;
    }

    .delete-team-section {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 16px;
      margin-top: 2px;
    }

    button.delete-team-btn {
      background: transparent;
      color: #e94560;
      border: 1px solid #e94560;
      padding: 8px 14px;
    }

    button.delete-team-btn:hover {
      background: #e9456020;
    }

    .team-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .team-row select {
      flex: 1;
      min-width: 0;
    }

    .drawer-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px 0;
    }

    .drawer-empty p {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
    }

    button.add-team-btn-lg {
      padding: 8px 20px;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      background: #0f3460;
      color: #e0e0e0;
      cursor: pointer;
    }

    button.add-team-btn-lg:hover {
      background: #1a4a7a;
    }

    button.add-team-btn {
      padding: 4px 8px 6px;
      font-size: 1rem;
      font-weight: bold;
      line-height: 1;
      border: 1px solid rgba(255, 255, 255, 0.25);
      white-space: nowrap;
    }

    .team-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .team-name-input {
      width: 60%;
      padding: 6px 10px;
      border: 1px solid #1a4a7a;
      border-radius: 6px;
      background: #16213e;
      color: #e0e0e0;
      font: inherit;
      font-size: 0.85rem;
    }

    .player-input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid #1a4a7a;
      border-radius: 6px;
      background: #16213e;
      color: #e0e0e0;
      font: inherit;
      font-size: 0.85rem;
    }

    .team-name-input:focus,
    .player-input:focus {
      outline: none;
      border-color: #4ea8de;
    }

    .number-input {
      width: 30px;
      flex-shrink: 0;
    }

    .name-input {
      flex: 1;
      min-width: 0;
    }

    .roster-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .roster-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      transition: opacity 0.15s;
    }

    .roster-row.dragging { opacity: 0.4; }
    .roster-row.drag-over { border-top: 2px solid #4ea8de; }

    .drag-handle {
      cursor: grab;
      color: #666;
      font-size: 0.85rem;
      flex-shrink: 0;
      touch-action: none;
      display: flex;
      align-items: center;
      padding: 4px 2px;
    }

    .drag-handle:active { cursor: grabbing; }

    .drag-handle svg {
      width: 10px;
      height: 14px;
    }

    .add-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }

    button.sm {
      padding: 6px 10px;
      font-size: 0.85rem;
      border: 1px solid #4ade80;
      color: #4ade80;
      background: transparent;
      align-self: stretch;
    }

    button.danger {
      background: transparent;
      color: #e94560;
      border-color: #e94560;
      padding: 0 6px;
      align-self: stretch;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    button.danger svg {
      width: 9px;
      height: 9px;
    }

    button.danger:hover { background: #e9456020; }

    .caret {
      display: inline-block;
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid currentColor;
      margin-left: 2px;
      vertical-align: middle;
      transition: transform 0.2s;
    }

    details[open] > summary .caret {
      transform: rotate(180deg);
    }
  `;

  @property({ type: String }) formation: FormationKey = '4-3-3';
  @property({ type: String }) gameFormat: GameFormat = '11v11';
  @property({ type: String }) teamName = '';
  @property({ type: Array }) roster: RosterEntry[] = [];
  @property({ type: Number }) halfLength = 45;
  @property({ type: Array }) teams: StoredTeam[] = [];
  @property({ type: String }) activeTeamId: string | null = null;

  @state() private _editMode = false;
  @state() private _addNumber = '';
  @state() private _addName = '';
  @state() private _dragIdx: number | null = null;
  @state() private _dragOverIdx: number | null = null;
  @state() private _elapsed = 0;
  @state() private _running = false;
  @state() private _half: 1 | 2 = 1;
  @state() private _confirmAction: 'reset' | 'switch-half' | 'reset-game' | 'delete-team' | null = null;

  private _timerInterval: ReturnType<typeof setInterval> | null = null;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTimer();
  }

  // --- Timer ---

  private _toggleTimer() {
    if (this._running) {
      this._stopTimer();
    } else {
      this._startTimer();
    }
  }

  private _startTimer() {
    if (this._timerInterval) return;
    this._running = true;
    this._timerInterval = setInterval(() => {
      this._elapsed++;
      this.dispatchEvent(new TimerTickEvent(this._half));
    }, 1000);
  }

  private _stopTimer() {
    this._running = false;
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }

  private get _timeDisplay(): string {
    return formatTime(this._elapsed);
  }

  private get _inStoppage(): boolean {
    return this._elapsed >= this.halfLength * 60;
  }

  // --- Half toggle ---

  private _requestSwitchTo2H() {
    this._stopTimer();
    this._confirmAction = 'switch-half';
  }

  private _requestSwitchTo1H() {
    this._stopTimer();
    this._confirmAction = 'reset-game';
  }

  private _confirmSwitchHalf() {
    this._half = 2;
    this._elapsed = 0;
    this._confirmAction = null;
  }

  private _confirmResetGame() {
    this._half = 1;
    this._elapsed = 0;
    this.dispatchEvent(new ResetGameEvent());
    this._confirmAction = null;
  }

  // --- Reset ---

  private _requestReset() {
    this._stopTimer();
    this._confirmAction = 'reset';
  }

  private _confirmReset() {
    this._elapsed = 0;
    this.dispatchEvent(new ResetHalfEvent(this._half));
    this._confirmAction = null;
  }

  private _cancelConfirm() {
    this._confirmAction = null;
  }

  // --- Disclosure ---

  private _onDisclosureKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      const details = (e.currentTarget as HTMLElement).closest('details') as HTMLDetailsElement;
      if (details) {
        details.open = false;
        details.querySelector('summary')?.focus();
      }
      e.stopPropagation();
    }
  }

  // --- Team management ---

  private _onTeamSwitch(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this._stopTimer();
    this.dispatchEvent(new TeamSwitchedEvent(val));
  }

  private _addTeam() {
    this._editMode = true;
    this.dispatchEvent(new TeamAddedEvent());
  }

  private _requestDeleteTeam() {
    this._confirmAction = 'delete-team';
  }

  private _confirmDeleteTeam() {
    if (this.activeTeamId) {
      this.dispatchEvent(new TeamDeletedEvent(this.activeTeamId));
    }
    this._confirmAction = null;
  }

  // --- Roster management ---

  private _onTeamNameInput(e: InputEvent) {
    const val = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new RosterUpdatedEvent(val, this.roster));
  }

  private _onFormationChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as FormationKey;
    this.dispatchEvent(new FormationChangedEvent(val));
  }

  private _onGameFormatChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as GameFormat;
    this.dispatchEvent(new GameFormatChangedEvent(val));
  }

  private _onHalfLengthInput(e: InputEvent) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val > 0) {
      this.dispatchEvent(new SettingsChangedEvent(val));
    }
  }

  private _onAddNumberInput(e: InputEvent) {
    this._addNumber = (e.target as HTMLInputElement).value;
  }

  private _onAddNameInput(e: InputEvent) {
    this._addName = (e.target as HTMLInputElement).value;
  }

  private _addPlayer() {
    if (!this._addNumber.trim() && !this._addName.trim()) return;
    const entry: RosterEntry = {
      id: uid('p'),
      number: this._addNumber.trim(),
      name: this._addName.trim(),
      half1Time: 0,
      half2Time: 0,
    };
    const updated = [...this.roster, entry];
    this._addNumber = '';
    this._addName = '';
    this.dispatchEvent(new RosterUpdatedEvent(this.teamName, updated));
  }

  private _addPlayerKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this._addPlayer();
  }

  private _removePlayer(id: string) {
    const updated = this.roster.filter(p => p.id !== id);
    this.dispatchEvent(new RosterUpdatedEvent(this.teamName, updated));
  }

  private _onDragStart(idx: number) { this._dragIdx = idx; }

  private _onDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    this._dragOverIdx = idx;
  }

  private _onDragEnd() {
    if (this._dragIdx != null && this._dragOverIdx != null && this._dragIdx !== this._dragOverIdx) {
      const updated = [...this.roster];
      const [moved] = updated.splice(this._dragIdx, 1);
      updated.splice(this._dragOverIdx, 0, moved);
      this.dispatchEvent(new RosterUpdatedEvent(this.teamName, updated));
    }
    this._dragIdx = null;
    this._dragOverIdx = null;
  }

  private _updatePlayer(id: string, field: 'number' | 'name', value: string) {
    const updated = this.roster.map(p =>
      p.id === id ? { ...p, [field]: value } : p,
    );
    this.dispatchEvent(new RosterUpdatedEvent(this.teamName, updated));
  }

  // --- Render ---

  render() {
    return html`
      <div class="bar">
        <details class="roster-disclosure"
                 @keydown="${this._onDisclosureKeydown}">
          <summary aria-label="Roster${this.roster.length ? ` (${this.roster.length})` : ''}">
            <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" style="width:14px;height:14px"><path d="m600 185.26c80.25 0 145.69 65.25 145.69 145.69 0 80.441-65.25 145.69-145.69 145.69s-145.69-65.25-145.69-145.69c0-80.441 65.25-145.69 145.69-145.69z" fill="currentColor"/><path d="m267.56 351.37c62.812 0 114 51.188 114 114s-51.188 114-114 114-114-51.188-114-114 51.188-114 114-114z" fill="currentColor"/><path d="m932.44 351.37c62.812 0 114 51.188 114 114s-51.188 114-114 114-114-51.188-114-114 51.188-114 114-114z" fill="currentColor"/><path d="m681.37 566.26h-162.94c-78.75 0-142.87 64.125-142.87 142.87v285.19c0 11.438 9.1875 20.625 20.625 20.625h407.26c11.438 0 20.625-9.1875 20.625-20.625v-285.19c0-78.75-64.125-142.87-142.87-142.87z" fill="currentColor"/><path d="m991.87 651.56h-132c-1.5 0-3 0.1875-4.6875 0.375 6 18 9.1875 37.125 9.1875 57.188v264.94h218.44c11.438 0 20.625-9.1875 20.625-20.625v-189.94c0-61.688-50.062-111.75-111.56-111.75z" fill="currentColor"/><path d="m208.13 651.56c-61.5 0-111.56 50.25-111.56 111.75v189.94c0 11.438 9.1875 20.625 20.625 20.625h218.44v-264.94c0-20.062 3.375-39.188 9.1875-57.188-1.5 0-3-0.375-4.6875-0.375h-132z" fill="currentColor"/></svg>
            <span class="caret"></span>
          </summary>
          <div class="drawer">
            ${this.teams.length === 0 ? html`
              <div class="drawer-empty">
                <p>No teams yet</p>
                <button class="add-team-btn-lg" @click="${this._addTeam}">+ Add team</button>
              </div>
            ` : html`
            <div class="drawer-header">
              <div class="team-row">
                <span class="select-wrap">
                  <select @change="${this._onTeamSwitch}">
                    ${this.teams.map(t => html`
                      <option value="${t.id}" .selected="${t.id === this.activeTeamId}">${t.teamName || 'Untitled'}</option>
                    `)}
                  </select>
                  <span class="caret"></span>
                </span>
                <button class="add-team-btn" @click="${this._addTeam}" aria-label="Add team">+</button>
              </div>
              <span class="spacer"></span>
              <div class="mode-toggle">
                <button class="${!this._editMode ? 'active' : ''}"
                        @click="${() => this._editMode = false}">${!this._editMode ? html`<span class="half-dot"></span>` : nothing}View</button>
                <button class="${this._editMode ? 'active' : ''}"
                        @click="${() => this._editMode = true}">Edit${this._editMode ? html`<span class="half-dot"></span>` : nothing}</button>
              </div>
            </div>

            <div class="drawer-header section-separator">
              <div class="team-name-row">
                ${this._editMode ? html`
                  <label>Team name</label>
                  <input
                    class="team-name-input"
                    type="text"
                    placeholder="Enter team name"
                    .value="${this.teamName}"
                    @input="${this._onTeamNameInput}" />
                ` : html`
                  <span class="team-label">${this.teamName || 'Roster'}</span>
                `}
              </div>
              ${this._editMode ? html`
                <span class="select-wrap">
                  <select
                    .value="${this.gameFormat}"
                    @change="${this._onGameFormatChange}">
                    ${GAME_FORMATS.map(f => html`
                      <option value="${f.key}" ?selected="${f.key === this.gameFormat}">${f.label}</option>
                    `)}
                  </select>
                  <span class="caret"></span>
                </span>
              ` : nothing}
            </div>

            ${this._editMode ? html`
              <div class="roster-list">
                ${this.roster.map((p, i) => html`
                  <div class="roster-row ${this._dragIdx === i ? 'dragging' : ''} ${this._dragOverIdx === i ? 'drag-over' : ''}"
                       draggable="true"
                       @dragstart="${() => this._onDragStart(i)}"
                       @dragover="${(e: DragEvent) => this._onDragOver(e, i)}"
                       @dragend="${this._onDragEnd}">
                    <span class="drag-handle"><svg viewBox="0 0 10 14" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="2" r="1" fill="currentColor"/><circle cx="7" cy="2" r="1" fill="currentColor"/><circle cx="3" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="7" cy="12" r="1" fill="currentColor"/></svg></span>
                    <input
                      class="player-input number-input"
                      type="text"
                      maxlength="2"
                      placeholder="#"
                      .value="${p.number}"
                      @input="${(e: InputEvent) => this._updatePlayer(p.id, 'number', (e.target as HTMLInputElement).value)}" />
                    <input
                      class="player-input name-input"
                      type="text"
                      placeholder="Player name"
                      .value="${p.name}"
                      @input="${(e: InputEvent) => this._updatePlayer(p.id, 'name', (e.target as HTMLInputElement).value)}" />
                    <button class="danger" @click="${() => this._removePlayer(p.id)}"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
                  </div>
                `)}
              </div>

              <label class="add-player-label">Add player</label>
              <div class="add-row">
                <input
                  class="player-input number-input"
                  type="text"
                  maxlength="2"
                  placeholder="#"
                  .value="${this._addNumber}"
                  @input="${this._onAddNumberInput}"
                  @keydown="${this._addPlayerKeydown}" />
                <input
                  class="player-input name-input"
                  type="text"
                  placeholder="Player name"
                  .value="${this._addName}"
                  @input="${this._onAddNameInput}"
                  @keydown="${this._addPlayerKeydown}" />
                <button class="sm" @click="${this._addPlayer}">Add</button>
              </div>

              <div class="delete-team-section">
                <button class="delete-team-btn" @click="${this._requestDeleteTeam}">Delete team</button>
              </div>
            ` : html`
              ${this.roster.length === 0 ? html`
                <div style="color: #666; font-size: 0.8rem;">No players added yet</div>
              ` : html`
                <table class="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player name</th>
                      <th class="time-col">1H</th>
                      <th class="time-col">2H</th>
                      <th class="time-col" style="font-weight:bold;color:#e0e0e0">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.roster.map(p => html`
                      <tr>
                        <td class="jersey-col">${p.number}</td>
                        <td>${p.name}</td>
                        <td class="time-col">${formatTime(p.half1Time)}</td>
                        <td class="time-col">${formatTime(p.half2Time)}</td>
                        <td class="time-col total">${formatTime(p.half1Time + p.half2Time)}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              `}
            `}
            `}
          </div>
        </details>
        <span class="spacer"></span>
        <div class="timer">
          <div class="half-toggle">
            <button class="${this._half === 1 ? 'active' : ''}"
                    ?disabled="${this._half === 1 || this._running}"
                    @click="${this._requestSwitchTo1H}">${this._half === 1 ? html`<span class="half-dot"></span>` : nothing}1H</button>
            <button class="${this._half === 2 ? 'active' : ''}"
                    ?disabled="${this._half === 2 || this._running}"
                    @click="${this._requestSwitchTo2H}">2H${this._half === 2 ? html`<span class="half-dot"></span>` : nothing}</button>
          </div>
          <button class="play-btn ${this._running ? 'running' : ''}"
                  @click="${this._toggleTimer}"
                  aria-label="${this._running ? 'Stop' : 'Play'}">
            ${this._running ? svg`
              <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="1" width="10" height="12" rx="1" fill="currentColor"/>
              </svg>
            ` : svg`
              <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
              </svg>
            `}
          </button>
          <span class="timer-display ${this._inStoppage ? 'stoppage' : ''}">${this._timeDisplay}</span>
          <button class="reset-btn"
                  @click="${this._requestReset}"
                  aria-label="Reset timer">
            <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m1011.6 216c-206.4-206.4-537.6-211.2-750-18l-49.199-49.199c-19.199-19.199-48-26.398-74.398-19.199-26.398 8.3984-46.801 30-51.602 56.398l-55.203 256.8c-4.8008 25.199 2.3984 50.398 20.398 68.398s43.199 25.199 68.398 20.398l256.8-54c14.398-3.6016 27.602-10.801 37.199-20.398 8.3984-8.3984 15.602-19.199 19.199-31.199 7.1992-26.398 0-55.199-19.199-74.398l-46.801-46.801c154.8-136.8 390-130.8 537.61 16.801 153.6 153.6 153.6 403.2 0 556.8-153.6 153.6-403.2 153.6-556.8-0.003906-49.199-49.199-84-110.4-102-177.6-10.801-39.602-51.602-63.602-91.199-52.801-39.602 10.801-63.602 51.602-52.801 91.199 24 92.398 73.199 177.6 141.6 244.8 212.4 212.4 556.8 212.4 769.2 0 210-211.2 210-556.8-1.1992-768z" fill="currentColor"/></svg>
          </button>
        </div>
        <span class="spacer"></span>
        <span class="select-wrap">
          <select @change="${this._onFormationChange}">
            ${FORMATIONS_BY_FORMAT[this.gameFormat].map(f => html`
              <option value="${f.key}" .selected="${f.key === this.formation}">${f.label}</option>
            `)}
          </select>
          <span class="caret"></span>
        </span>
        <details class="settings-disclosure"
                 @keydown="${this._onDisclosureKeydown}">
          <summary aria-label="Settings">
            <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" style="width:14px;height:14px"><path d="m1170 681.6v-163.2l-186-51.598c-4.8008-14.398-10.801-30-18-44.398l94.801-166.8-116.4-116.4-168 94.801c-13.199-7.1992-28.801-13.199-43.199-18l-50.402-186h-165.6l-50.398 186c-14.398 6-30 12-43.199 18l-168-94.801-116.4 116.4 94.801 166.8c-7.1992 14.398-13.199 28.801-18 44.398l-186 51.602v164.4l186 50.402c4.8008 14.398 10.801 28.801 18 43.199l-94.801 166.8 116.4 116.4 168-94.801c13.199 7.1992 28.801 13.199 43.199 18l51.602 186h164.4l50.402-184.8c14.398-6 30-12 43.199-18l168 94.801 116.4-116.4-94.801-166.8c7.1992-14.398 13.199-28.801 18-43.199zm-570 112.8c-108 0-194.4-86.398-194.4-194.4s86.398-194.4 194.4-194.4 194.4 87.598 194.4 194.4-86.398 194.4-194.4 194.4z" fill="currentColor"/></svg>
            <span class="caret"></span>
          </summary>
          <div class="drawer settings-drawer">
            <div class="settings-row">
              <label for="half-length">Half length (min):</label>
              <input
                id="half-length"
                class="player-input settings-number"
                type="text"
                inputmode="numeric"
                maxlength="2"
                .value="${String(this.halfLength)}"
                ?disabled="${this._running}"
                @input="${this._onHalfLengthInput}" />
            </div>
          </div>
        </details>
      </div>

      ${this._confirmAction ? html`
        <div class="confirm-overlay" @click="${this._cancelConfirm}">
          <div class="confirm-dialog" @click="${(e: Event) => e.stopPropagation()}">
            ${this._confirmAction === 'reset' ? html`
              <p>Reset ${this._half === 1 ? '1H' : '2H'} clock?<br>All player time for this half will be cleared.</p>
            ` : this._confirmAction === 'switch-half' ? html`
              <p>Start 2nd half?<br>The clock will reset to 00:00.</p>
            ` : this._confirmAction === 'delete-team' ? html`
              <p>Delete "${this.teamName || 'Untitled'}"?<br>This cannot be undone.</p>
            ` : html`
              <p>Reset entire game?<br>The clock and all player times for both halves will be cleared.</p>
            `}
            <div class="confirm-actions">
              <button @click="${this._cancelConfirm}">Cancel</button>
              <button class="confirm-yes" @click="${
                this._confirmAction === 'reset' ? this._confirmReset
                : this._confirmAction === 'switch-half' ? this._confirmSwitchHalf
                : this._confirmAction === 'delete-team' ? this._confirmDeleteTeam
                : this._confirmResetGame}">
                ${this._confirmAction === 'reset' ? 'Reset'
                  : this._confirmAction === 'switch-half' ? 'Start 2H'
                  : this._confirmAction === 'delete-team' ? 'Delete'
                  : 'Reset Game'}
              </button>
            </div>
          </div>
        </div>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-toolbar': PtToolbar;
  }
}
