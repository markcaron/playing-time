import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { RosterEntry, FormationKey } from '../lib/types.js';
import { FORMATION_LABELS } from '../lib/types.js';
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

    .bar-wrap {
      position: relative;
    }

    .bar {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background: #16213e;
      user-select: none;
    }

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

    button:hover {
      background: #1a4a7a;
    }

    button:focus-visible {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
    }

    button[aria-expanded="true"] {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .spacer { flex: 1; }

    select {
      appearance: none;
      -webkit-appearance: none;
      padding: 6px 26px 6px 10px;
      border: 1px solid transparent;
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
      top: 100%;
      left: 0;
      right: 0;
      z-index: 200;
      background: #0f3460;
      border-top: 1px solid #1a4a7a;
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
      overflow: hidden;
    }

    .mode-toggle button {
      padding: 4px 10px;
      font-size: 0.75rem;
      border: none;
      border-radius: 0;
      background: transparent;
      color: #aaa;
      transition: background 0.15s, color 0.15s;
    }

    .mode-toggle button.active {
      background: #1a4a7a;
      color: #e0e0e0;
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

    .roster-table td {
      padding: 5px 8px 5px 0;
      color: #e0e0e0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .roster-table td.jersey-col {
      color: #aaa;
      width: 32px;
    }

    .add-player-label {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 16px;
      margin-top: 2px;
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

    .roster-row.dragging {
      opacity: 0.4;
    }

    .roster-row.drag-over {
      border-top: 2px solid #4ea8de;
    }

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

    .drag-handle:active {
      cursor: grabbing;
    }

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

    button.danger:hover {
      background: #e9456020;
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
      transition: transform 0.2s;
    }

    [aria-expanded="true"] .caret {
      transform: rotate(180deg);
    }
  `;

  @property({ type: String }) formation: FormationKey = '4-3-3';
  @property({ type: String }) teamName = '';
  @property({ type: Array }) roster: RosterEntry[] = [];

  @state() private _drawerOpen = false;
  @state() private _editMode = false;
  @state() private _addNumber = '';
  @state() private _addName = '';
  @state() private _dragIdx: number | null = null;
  @state() private _dragOverIdx: number | null = null;

  private _toggleDrawer() {
    this._drawerOpen = !this._drawerOpen;
  }

  private _onTeamNameInput(e: InputEvent) {
    const val = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new RosterUpdatedEvent(val, this.roster));
  }

  private _onFormationChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as FormationKey;
    this.dispatchEvent(new FormationChangedEvent(val));
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

  private _onDragStart(idx: number) {
    this._dragIdx = idx;
  }

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

  render() {
    return html`
      <div class="bar-wrap">
        <div class="bar">
          <button
            @click="${this._toggleDrawer}"
            aria-expanded="${this._drawerOpen}">
            Roster${this.roster.length ? html` (${this.roster.length})` : nothing} <span class="caret"></span>
          </button>
          <span class="spacer"></span>
          <span class="select-wrap">
            <select
              .value="${this.formation}"
              @change="${this._onFormationChange}">
              ${FORMATION_LABELS.map(f => html`
                <option value="${f.key}" ?selected="${f.key === this.formation}">${f.label}</option>
              `)}
            </select>
            <span class="caret"></span>
          </span>
        </div>

        ${this._drawerOpen ? html`
          <div class="drawer">
            <div class="drawer-header">
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
              <div class="mode-toggle">
                <button class="${!this._editMode ? 'active' : ''}"
                        @click="${() => this._editMode = false}">View</button>
                <button class="${this._editMode ? 'active' : ''}"
                        @click="${() => this._editMode = true}">Edit</button>
              </div>
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
            ` : html`
              ${this.roster.length === 0 ? html`
                <div style="color: #666; font-size: 0.8rem;">No players added yet</div>
              ` : html`
                <table class="roster-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Player name</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.roster.map(p => html`
                      <tr>
                        <td class="jersey-col">${p.number}</td>
                        <td>${p.name}</td>
                      </tr>
                    `)}
                  </tbody>
                </table>
              `}
            `}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _updatePlayer(id: string, field: 'number' | 'name', value: string) {
    const updated = this.roster.map(p =>
      p.id === id ? { ...p, [field]: value } : p,
    );
    this.dispatchEvent(new RosterUpdatedEvent(this.teamName, updated));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-toolbar': PtToolbar;
  }
}
