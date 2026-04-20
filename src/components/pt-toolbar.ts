import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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

@customElement('pt-settings-bar')
export class PtSettingsBar extends LitElement {
  static styles = css`
    *, *::before, *::after {
      box-sizing: border-box;
    }

    :host {
      display: block;
      z-index: 100;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .settings-bar {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background: #16213e;
      user-select: none;
    }

    .roster-btn {
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .roster-btn.hint {
      outline: 2px solid #7fff00;
      outline-offset: 2px;
      animation: hintPulse 1.5s ease-in-out infinite;
    }

    @keyframes hintPulse {
      0%, 100% { outline-color: #7fff00; }
      50% { outline-color: rgba(127, 255, 0, 0.4); }
    }

    .roster-btn.open {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .roster-overlay {
      position: fixed;
      inset: 0;
      z-index: 300;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 16px;
    }

    .roster-dialog {
      background: #0f3460;
      border: 1px solid #1a4a7a;
      border-radius: 10px;
      width: 100%;
      max-width: 520px;
      height: 100%;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .roster-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .roster-dialog-header h2 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: bold;
      color: #e0e0e0;
    }

    .roster-dialog-close {
      background: transparent;
      border: none;
      color: #aaa;
      cursor: pointer;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.15s;
    }

    .roster-dialog-close:hover { color: #fff; }

    .roster-dialog-close svg {
      width: 14px;
      height: 14px;
    }

    .roster-dialog-body {
      flex: 1;
      overflow-y: auto;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      -webkit-overflow-scrolling: touch;
    }

    .roster-dialog-footer {
      display: flex;
      justify-content: flex-end;
      padding: 12px 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      flex-shrink: 0;
    }

    .roster-dialog-footer button {
      padding: 8px 24px;
      background: #4ea8de;
      border: none;
      color: #fff;
      font-weight: bold;
    }

    .roster-dialog-footer button:hover {
      background: #3a8fc4;
    }

    .settings-btn {
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .settings-btn.open {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .settings-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settings-row label { white-space: nowrap; }

    .settings-number {
      width: 56px !important;
      flex-shrink: 0;
    }

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 14px;
      min-height: 44px;
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
      min-height: 44px;
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

    .roster-dialog-body label {
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
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
    }

    .mode-toggle button {
      padding: 6px 14px;
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

    .mode-toggle button:first-child { border-radius: 5px 0 0 5px; }
    .mode-toggle button:last-child { border-radius: 0 5px 5px 0; }

    .mode-toggle button.active {
      background: #fff;
      color: #16213e;
    }

    .half-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
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
      font-size: 0.8rem;
      color: #aaa;
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

    .empty-warning {
      background: #fef3c7;
      border: 1px solid #f0c040;
      border-radius: 6px;
      padding: 10px 14px;
      color: #151515;
      font-size: 0.85rem;
      text-align: center;
    }

    .edit-team-action { text-align: center; }

    button.edit-team-btn {
      border: 1px solid #16a34a;
      color: #fff;
      background: #16a34a;
      font-weight: bold;
    }

    button.edit-team-btn:hover { background: #15803d; }

    .roster-table th.total-col {
      font-weight: bold;
      color: #e0e0e0;
    }

    .settings-dialog { max-width: 360px; }

    .settings-branding {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding-top: 16px;
      margin-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 0.75rem;
      color: rgba(78, 168, 222, 0.6);
    }

    .branding-icon { width: 12px; height: 12px; }

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

    button.add-team-btn-lg:hover { background: #1a4a7a; }

    button.add-team-btn {
      padding: 6px 14px;
      font-size: 0.85rem;
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
      min-height: 44px;
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
      min-height: 44px;
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

    .number-input { width: 48px; flex-shrink: 0; }
    .name-input { flex: 1; min-width: 0; }

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
    .drag-handle svg { width: 10px; height: 14px; }

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

    button.danger svg { width: 9px; height: 9px; }
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
  `;

  @property({ type: String }) formation: FormationKey = '4-3-3';
  @property({ type: String }) gameFormat: GameFormat = '11v11';
  @property({ type: String }) teamName = '';
  @property({ type: Array }) roster: RosterEntry[] = [];
  @property({ type: Number }) halfLength = 45;
  @property({ type: Boolean }) showRosterHint = false;
  @property({ type: Array }) teams: StoredTeam[] = [];
  @property({ type: String }) activeTeamId: string | null = null;
  @property({ type: Boolean }) timerRunning = false;

  @state() private _rosterOpen = false;
  @state() private _settingsOpen = false;
  @state() private _editMode = false;
  @state() private _addNumber = '';
  @state() private _addName = '';
  @state() private _dragIdx: number | null = null;
  @state() private _dragOverIdx: number | null = null;
  @state() private _confirmAction: 'delete-team' | null = null;

  private _openRoster() { this._rosterOpen = true; }
  private _closeRoster() { this._rosterOpen = false; }
  private _openSettings() { this._settingsOpen = true; }
  private _closeSettings() { this._settingsOpen = false; }

  private _onTeamSwitch(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.dispatchEvent(new TeamSwitchedEvent(val));
  }

  private _addTeam() {
    this._editMode = true;
    this._rosterOpen = true;
    this.dispatchEvent(new TeamAddedEvent());
  }

  private _requestDeleteTeam() { this._confirmAction = 'delete-team'; }

  private _confirmDeleteTeam() {
    if (this.activeTeamId) {
      this.dispatchEvent(new TeamDeletedEvent(this.activeTeamId));
    }
    this._confirmAction = null;
  }

  private _cancelConfirm() { this._confirmAction = null; }

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

  private _onAddNumberInput(e: InputEvent) { this._addNumber = (e.target as HTMLInputElement).value; }
  private _onAddNameInput(e: InputEvent) { this._addName = (e.target as HTMLInputElement).value; }

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

  private _addPlayerKeydown(e: KeyboardEvent) { if (e.key === 'Enter') this._addPlayer(); }

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

  render() {
    return html`
      <div class="settings-bar">
        <button class="roster-btn ${this._rosterOpen ? 'open' : ''} ${this.showRosterHint && !this._rosterOpen ? 'hint' : ''}"
                @click="${this._openRoster}"
                aria-label="Roster${this.roster.length ? ` (${this.roster.length})` : ''}">
          <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg" style="width:28px;height:28px"><path d="M1250.75 484.752L1150 585.501V790.128L1350 650.128L1250.75 484.752Z" fill="currentColor"/><path d="M450 585.499L349.251 484.75L250 650.123L450 790.123V585.499Z" fill="currentColor"/><path d="M500 575.125V1275.13H1100V575.125C1100 568.5 1102.63 562.125 1107.31 557.437L1224.25 440.5L1210 416.688C1203.62 406.001 1193.44 398.063 1181.5 394.5L950.059 325.063L947.497 330.125C925.059 375 884.871 410.188 835.871 421.063C761.371 437.625 687.991 400.937 655.311 335.563L650.061 325L418.621 394.437C406.684 398 396.496 405.937 390.121 416.625L375.871 440.437L492.808 557.375C497.495 562.062 500.121 568.437 500.121 575.063L500 575.125ZM950 575.125C977.625 575.125 1000 597.5 1000 625.125C1000 652.751 977.625 675.125 950 675.125C922.375 675.125 900 652.751 900 625.125C900 597.5 922.375 575.125 950 575.125ZM600 1125.13H700V1175.13H600V1125.13Z" fill="currentColor"/></svg>
        </button>
        <span class="spacer"></span>
        <span class="select-wrap">
          <select @change="${this._onFormationChange}">
            ${FORMATIONS_BY_FORMAT[this.gameFormat].map(f => html`
              <option value="${f.key}" .selected="${f.key === this.formation}">${f.label}</option>
            `)}
          </select>
          <span class="caret"></span>
        </span>
        <button class="settings-btn ${this._settingsOpen ? 'open' : ''}"
                @click="${this._openSettings}"
                aria-label="Settings">
          <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" style="width:14px;height:14px"><path d="m1170 681.6v-163.2l-186-51.598c-4.8008-14.398-10.801-30-18-44.398l94.801-166.8-116.4-116.4-168 94.801c-13.199-7.1992-28.801-13.199-43.199-18l-50.402-186h-165.6l-50.398 186c-14.398 6-30 12-43.199 18l-168-94.801-116.4 116.4 94.801 166.8c-7.1992 14.398-13.199 28.801-18 44.398l-186 51.602v164.4l186 50.402c4.8008 14.398 10.801 28.801 18 43.199l-94.801 166.8 116.4 116.4 168-94.801c13.199 7.1992 28.801 13.199 43.199 18l51.602 186h164.4l50.402-184.8c14.398-6 30-12 43.199-18l168 94.801 116.4-116.4-94.801-166.8c7.1992-14.398 13.199-28.801 18-43.199zm-570 112.8c-108 0-194.4-86.398-194.4-194.4s86.398-194.4 194.4-194.4 194.4 87.598 194.4 194.4-86.398 194.4-194.4 194.4z" fill="currentColor"/></svg>
        </button>
      </div>

      ${this._rosterOpen ? html`
        <div class="roster-overlay" @click="${this._closeRoster}">
          <div class="roster-dialog" @click="${(e: Event) => e.stopPropagation()}">
            <div class="roster-dialog-header">
              <h2>Roster</h2>
              <button class="roster-dialog-close" @click="${this._closeRoster}" aria-label="Close">
                <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="roster-dialog-body">
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
                    <button class="add-team-btn" @click="${this._addTeam}">Add team</button>
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
                    <div class="empty-warning">No players added yet</div>
                    <div class="edit-team-action">
                      <button class="edit-team-btn" @click="${() => this._editMode = true}">Edit team</button>
                    </div>
                  ` : html`
                    <table class="roster-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Player name</th>
                          <th class="time-col">1H</th>
                          <th class="time-col">2H</th>
                          <th class="time-col total-col">Total</th>
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
            ${this.teams.length > 0 ? html`
              <div class="roster-dialog-footer">
                <button @click="${this._closeRoster}">Done</button>
              </div>
            ` : nothing}
          </div>
        </div>
      ` : nothing}

      ${this._settingsOpen ? html`
        <div class="roster-overlay" @click="${this._closeSettings}">
          <div class="roster-dialog settings-dialog" @click="${(e: Event) => e.stopPropagation()}">
            <div class="roster-dialog-header">
              <h2>Settings</h2>
              <button class="roster-dialog-close" @click="${this._closeSettings}" aria-label="Close">
                <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="roster-dialog-body">
              <div class="settings-row">
                <label for="half-length">Half length (min):</label>
                <input
                  id="half-length"
                  class="player-input settings-number"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  .value="${String(this.halfLength)}"
                  ?disabled="${this.timerRunning}"
                  @input="${this._onHalfLengthInput}" />
              </div>
              <div class="settings-branding">
                <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" class="branding-icon"><path d="m660 243.6v-63.602h60v-120h-240v120h60v63.602c-219.6 30-390 218.4-390 446.4 0 248.4 201.6 450 450 450s450-201.6 450-450c0-228-170.4-416.4-390-446.4zm-60 776.4c-182.4 0-330-147.6-330-330s147.6-330 330-330 330 147.6 330 330-147.6 330-330 330z" fill="currentColor"/><path d="m151.2 247.2 85.199 84c48-49.199 104.4-86.398 168-112.8l-45.598-110.4c-78 32.398-148.8 79.199-207.6 139.2z" fill="currentColor"/><path d="m1042.8 241.2c-58.801-57.598-126-102-201.6-133.2l-45.602 110.4c61.199 25.199 116.4 61.199 163.2 108z" fill="currentColor"/><path d="m642.48 732.32-84.863-84.852 179.89-179.91 84.863 84.852z" fill="currentColor"/></svg>
                Playing Time by Mark Caron
              </div>
            </div>
            <div class="roster-dialog-footer">
              <button @click="${this._closeSettings}">Done</button>
            </div>
          </div>
        </div>
      ` : nothing}

      ${this._confirmAction ? html`
        <div class="confirm-overlay" @click="${this._cancelConfirm}">
          <div class="confirm-dialog" @click="${(e: Event) => e.stopPropagation()}">
            <p>Delete "${this.teamName || 'Untitled'}"?<br>This cannot be undone.</p>
            <div class="confirm-actions">
              <button @click="${this._cancelConfirm}">Cancel</button>
              <button class="confirm-yes" @click="${this._confirmDeleteTeam}">Delete</button>
            </div>
          </div>
        </div>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-settings-bar': PtSettingsBar;
  }
}
