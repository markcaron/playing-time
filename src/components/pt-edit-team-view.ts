import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { RosterEntry, FormationKey, GameFormat, StoredTeam, Position } from '../lib/types.js';
import { GAME_FORMATS, FORMATIONS_BY_FORMAT, POSITIONS, FORMATION_KEY_MIGRATION, getStandardHalfLength, getDefaultFormation } from '../lib/types.js';
import { uid } from '../lib/svg-utils.js';
import { parseRosterWithMeta, serializeRosterYaml } from '../lib/roster-parser.js';

function sortRoster<T extends { number: string; name: string }>(roster: T[], order: 'alpha' | 'number'): T[] {
  return [...roster].sort((a, b) => {
    if (order === 'number') {
      const numA = parseInt(a.number, 10);
      const numB = parseInt(b.number, 10);
      const aHas = !isNaN(numA);
      const bHas = !isNaN(numB);
      if (aHas && bHas) return numA - numB;
      if (aHas) return -1;
      if (bHas) return 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export class TeamSavedEvent extends Event {
  static readonly eventName = 'team-saved' as const;
  teamData: StoredTeam;
  constructor(teamData: StoredTeam) {
    super(TeamSavedEvent.eventName, { bubbles: true, composed: true });
    this.teamData = teamData;
  }
}

export class EditCancelledEvent extends Event {
  static readonly eventName = 'edit-cancelled' as const;
  constructor() {
    super(EditCancelledEvent.eventName, { bubbles: true, composed: true });
  }
}

export class EditTeamDeletedEvent extends Event {
  static readonly eventName = 'edit-team-deleted' as const;
  teamId: string;
  constructor(teamId: string) {
    super(EditTeamDeletedEvent.eventName, { bubbles: true, composed: true });
    this.teamId = teamId;
  }
}

const ALL_FORMATION_KEYS = new Set(Object.values(FORMATIONS_BY_FORMAT).flat().map(f => f.key));

@customElement('pt-edit-team-view')
export class PtEditTeamView extends LitElement {
  static styles = css`
    *, *::before, *::after {
      box-sizing: border-box;
    }

    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--pt-bg-body);
      font-family: system-ui, -apple-system, sans-serif;
      color: var(--pt-text);
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

    /* ── Header bar ──────────────────────────────── */

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 8px calc(12px + env(safe-area-inset-left));
      background: var(--pt-bg-primary);
      box-shadow: 0 2px 6px var(--pt-shadow);
      flex-shrink: 0;
      z-index: 1;
      user-select: none;
    }

    .header h1 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .spacer { flex: 1; }

    .close-btn {
      background: transparent;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      color: var(--pt-text);
      cursor: pointer;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      transition: background 0.15s;
    }

    .close-btn:hover { background: var(--pt-btn-hover); }

    .close-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .close-btn svg {
      width: 14px;
      height: 14px;
    }

    /* ── Scrollable body ─────────────────────────── */

    .edit-body {
      flex: 1;
      overflow-y: auto;
      padding: 0 0 20px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      -webkit-overflow-scrolling: touch;
    }

    /* ── Shared form / button styles ─────────────── */

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 14px;
      min-height: 44px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    button:hover { background: var(--pt-btn-hover); }

    button:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.35;
      cursor: default;
      pointer-events: none;
    }

    /* ── Select ───────────────────────────────────── */

    select {
      appearance: none;
      -webkit-appearance: none;
      padding: 6px 26px 6px 10px;
      min-height: 44px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      background-image: none;
    }

    select:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .select-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 100%;
    }

    .select-wrap select {
      width: 100%;
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
      transition: transform 0.2s;
    }

    /* ── Team hero area ─────────────────────────────── */

    .team-hero {
      background: var(--pt-hero-bg);
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex-shrink: 0;
    }

    .team-hero .team-field label,
    .team-hero .half-length-unit {
      color: var(--pt-hero-text);
    }

    .team-hero .team-name-input,
    .team-hero select,
    .team-hero .player-input {
      background: light-dark(var(--pt-navy-800), var(--pt-white));
      color: light-dark(var(--pt-neutral-200), var(--pt-navy-700));
      border-color: light-dark(var(--pt-navy-600), rgba(0,0,0,0.15));
    }

    .team-hero .team-name-input:focus,
    .team-hero select:focus,
    .team-hero .player-input:focus {
      border-color: var(--pt-accent);
    }

    .team-hero .caret {
      border-top-color: light-dark(var(--pt-neutral-200), var(--pt-navy-700));
    }

    .team-fields-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 16px;
      align-items: flex-end;
    }

    .team-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .team-field label {
      font-size: 0.8rem;
      color: var(--pt-text);
      font-weight: bold;
      white-space: nowrap;
    }

    .team-name-field {
      flex-basis: 100%;
      max-width: 400px;
      width: 100%;
    }

    .half-length-input-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .half-length-unit {
      font-size: 0.8rem;
      color: var(--pt-text);
    }

    .team-name-input {
      width: 100%;
      padding: 6px 10px;
      min-height: 44px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
    }

    .player-input {
      width: 100%;
      padding: 6px 10px;
      min-height: 44px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
    }

    .team-name-input:focus,
    .player-input:focus {
      outline: none;
      border-color: var(--pt-accent);
    }

    .pos-col {
      color: var(--pt-text-muted);
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .settings-number {
      width: 56px !important;
      flex-shrink: 0;
    }

    /* ── Roster table ──────────────────────────────── */

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      margin: 0 16px;
      width: calc(100% - 32px);
    }

    .roster-table th {
      text-align: left;
      font-size: 0.75rem;
      color: var(--pt-text-muted);
      font-weight: normal;
      padding: 6px 8px;
      border-bottom: 1px solid var(--pt-border-subtle);
    }

    .roster-table td {
      padding: 8px;
      color: var(--pt-text);
      border-bottom: 1px solid var(--pt-border-subtle);
    }

    .roster-table td.jersey-col {
      color: var(--pt-text-muted);
      width: 32px;
    }

    .action-cell {
      text-align: right;
      white-space: nowrap;
      width: 1%;
    }

    .edit-row-btn {
      background: transparent;
      border: none;
      color: var(--pt-text-muted);
      cursor: pointer;
      padding: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      min-height: 44px;
      min-width: 44px;
      transition: color 0.15s;
    }

    .edit-row-btn:hover { color: var(--pt-accent); }

    .edit-row-btn svg {
      width: 30px;
      height: 30px;
    }

    .delete-row-btn {
      background: transparent;
      border: none;
      color: var(--pt-text-muted);
      cursor: pointer;
      padding: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      min-height: 44px;
      min-width: 44px;
      transition: color 0.15s;
    }

    .delete-row-btn:hover { color: var(--pt-danger-light); }

    .delete-row-btn svg {
      width: 24px;
      height: 24px;
    }

    .action-cell .action-group {
      display: flex;
      gap: 0;
      align-items: center;
    }

    /* ── Edit player dialog fields ────────────────── */

    .edit-player-fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .edit-player-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .edit-player-field label {
      font-size: 0.8rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .edit-player-field input,
    .edit-player-field select {
      padding: 6px 10px;
      min-height: 44px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
    }

    .edit-player-field input:focus,
    .edit-player-field select:focus {
      outline: none;
      border-color: var(--pt-accent);
    }

    .edit-player-field .select-wrap select {
      width: 100%;
      appearance: none;
      -webkit-appearance: none;
      padding-right: 26px;
      cursor: pointer;
    }

    .edit-player-row {
      display: flex;
      gap: 10px;
    }

    .edit-player-row .edit-player-field {
      flex: 1;
      min-width: 0;
    }

    .edit-player-row .edit-player-field.number-field {
      flex: 0 0 64px;
    }

    .edit-player-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      align-items: center;
      margin-top: 24px;
    }

    .edit-player-actions .cancel-btn {
      margin-right: auto;
    }

    .edit-player-actions .save-player-btn {
      padding: 8px 20px;
      background: var(--pt-accent-solid);
      border: none;
      color: var(--pt-accent-solid-text);
      font-weight: bold;
    }

    .edit-player-actions .save-player-btn:hover {
      background: var(--pt-accent-solid-hover);
    }

    /* ── Add player ──────────────────────────────── */

    .add-player-card {
      padding: 16px;
      margin: 0 16px;
      background: var(--pt-bg-primary);
      border: 1px solid var(--pt-border-subtle);
      border-radius: 10px;
      box-shadow: 0 2px 6px var(--pt-shadow);
    }

    .add-player-fieldset {
      border: none;
      margin: 0;
      padding: 0;
    }

    .add-player-legend {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
      font-weight: bold;
      color: var(--pt-text);
      padding: 0;
      margin-bottom: 12px;
    }

    .add-player-legend svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .add-row {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .add-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .add-field label {
      font-size: 0.75rem;
      color: var(--pt-text-muted);
      font-weight: normal;
      white-space: nowrap;
    }

    .add-field.num-field { width: 52px; flex-shrink: 0; }
    .add-field.name-field { flex: 1; min-width: 140px; }
    .add-field.nickname-field { flex: 1; min-width: 120px; }
    .add-field.pos-field { width: 90px; flex-shrink: 0; }

    .add-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .add-player-btn {
      min-height: 44px;
      padding: 6px 14px;
      border: 1px solid var(--pt-success-light);
      background: var(--pt-success-light);
      color: var(--pt-accent-solid-text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border-radius: 6px;
      font: inherit;
      font-size: 0.85rem;
      transition: background 0.15s, color 0.15s;
      flex-shrink: 0;
      margin-left: auto;
    }

    .add-player-btn:hover {
      background: var(--pt-success-hover);
      border-color: var(--pt-success-hover);
      color: var(--pt-accent-solid-text);
    }


    /* ── Drop zone ───────────────────────────────── */

    .drop-zone {
      border: 2px dashed var(--pt-border);
      border-radius: 10px;
      padding: 24px 16px;
      max-width: 400px;
      margin: 0 16px;
      align-self: center;
      width: 100%;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .drop-zone:hover,
    .drop-zone.dragover {
      border-color: var(--pt-accent);
      background: var(--pt-btn-hover);
    }

    .drop-zone:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .drop-zone p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--pt-text-muted);
    }

    .drop-zone .drop-hint {
      font-size: 0.75rem;
      color: var(--pt-text-muted);
    }

    .drop-zone .browse-btn {
      padding: 6px 16px;
      min-height: 36px;
      font-size: 0.8rem;
      border: 1px solid var(--pt-border);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      cursor: pointer;
      font: inherit;
    }

    .drop-zone .browse-btn:hover {
      background: var(--pt-hover-overlay);
    }

    .drop-zone .drop-error {
      color: var(--pt-danger-light);
      font-size: 0.8rem;
    }

    .example-link {
      display: block;
      text-align: center;
      margin: 24px 0;
      font-size: 0.8rem;
      color: var(--pt-text-muted);
      text-decoration: underline;
      cursor: pointer;
    }

    .example-link:hover {
      color: var(--pt-accent);
    }

    /* ── Delete / export section ──────────────────── */

    .section-separator {
      margin-bottom: 10px;
    }

    .delete-team-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 0 16px;
    }

    button.export-btn {
      padding: 8px 14px;
      border: 1px solid var(--pt-accent);
      color: var(--pt-accent);
      background: transparent;
    }

    button.export-btn:hover {
      background: var(--pt-hover-overlay);
    }

    button.delete-team-btn {
      background: transparent;
      color: var(--pt-danger-light);
      border: 1px solid var(--pt-danger-light);
      padding: 8px 14px;
    }

    button.delete-team-btn:hover {
      background: var(--pt-hover-overlay);
    }

    /* ── Confirm dialog ──────────────────────────── */

    dialog:not([open]) {
      display: none;
    }

    dialog {
      background: var(--pt-bg-surface);
      border: 1px solid var(--pt-border);
      border-radius: 10px;
      padding: 0;
      width: calc(100% - 32px);
      max-width: 400px;
      box-shadow: 0 8px 32px var(--pt-shadow-lg);
      color: var(--pt-text);
    }

    dialog::backdrop {
      background: var(--pt-backdrop);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--pt-border-subtle);
      flex-shrink: 0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .dialog-close {
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
      min-height: 0;
    }

    .dialog-close:hover { color: var(--pt-text); }

    .dialog-close svg {
      width: 14px;
      height: 14px;
    }

    .dialog-body {
      padding: 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .dialog-body p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--pt-text);
      line-height: 1.4;
    }

    .confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: space-between;
      margin-top: 32px;
    }

    .confirm-actions button {
      padding: 8px 20px;
      font-size: 0.85rem;
      border-radius: 6px;
    }

    .confirm-actions .cancel-btn {
      border: 1px solid var(--pt-text-muted);
      color: var(--pt-text);
      background: transparent;
    }

    .confirm-actions .cancel-btn:hover {
      background: var(--pt-hover-overlay);
    }

    .confirm-actions .confirm-yes {
      background: var(--pt-danger);
      border-color: var(--pt-danger);
      color: var(--pt-text-white);
    }

    .confirm-actions .confirm-yes:hover {
      background: var(--pt-danger-hover);
    }

    /* ── Footer bar ──────────────────────────────── */

    .edit-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px calc(12px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));
      background: var(--pt-bg-primary);
      box-shadow: 0 -2px 6px var(--pt-shadow);
      flex-shrink: 0;
      z-index: 1;
      position: relative;
    }

    .cancel-btn {
      padding: 8px 24px;
      background: transparent;
      border: 1px solid var(--pt-text-muted);
      color: var(--pt-text);
      font-weight: bold;
      border-radius: 6px;
      min-height: 44px;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
    }

    .cancel-btn:hover {
      background: var(--pt-btn-hover);
    }

    .cancel-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .save-btn {
      padding: 8px 24px;
      background: var(--pt-accent-solid);
      border: none;
      color: var(--pt-accent-solid-text);
      font-weight: bold;
      border-radius: 6px;
      min-height: 44px;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
    }

    .save-btn:hover {
      background: var(--pt-accent-solid-hover);
    }

    .save-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }
  `;

  @property({ type: Array }) teams: StoredTeam[] = [];
  @property({ type: String }) teamId: string | null = null;
  @property({ type: String }) rosterSort: 'alpha' | 'number' = 'alpha';

  @state() private _draftName = '';
  @state() private _draftFormat: GameFormat = '11v11';
  @state() private _draftHalfLength = 45;
  @state() private _draftRoster: RosterEntry[] = [];
  @state() private _draftFormation: FormationKey = '1-4-3-3';

  @state() private _addNumber = '';
  @state() private _addName = '';
  @state() private _addNickname = '';
  @state() private _addPrimaryPos: Position | '' = '';
  @state() private _addSecondaryPos: Position | '' = '';
  @state() private _editIdx: number | null = null;
  @state() private _editNumber = '';
  @state() private _editName = '';
  @state() private _editNickname = '';
  @state() private _editPrimaryPos: Position | '' = '';
  @state() private _editSecondaryPos: Position | '' = '';
  @state() private _deleteIdx: number | null = null;
  @state() private _dropZoneDragover = false;
  @state() private _dropError = '';

  @query('#confirm-dialog') private _confirmDialog!: HTMLDialogElement;
  @query('#edit-player-dialog') private _editPlayerDialog!: HTMLDialogElement;

  private _prevTeamId: string | null | undefined = undefined;
  private _abortController = new AbortController();
  private _dropErrorTimer: ReturnType<typeof setTimeout> | null = null;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._abortController.abort();
    if (this._dropErrorTimer) clearTimeout(this._dropErrorTimer);
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadDraft();
  }

  willUpdate(changed: Map<string | number | symbol, unknown>) {
    if (changed.has('teamId') && this._prevTeamId !== this.teamId) {
      this._prevTeamId = this.teamId;
      this._loadDraft();
    }
    if (changed.has('teams') && this.teamId) {
      const existing = this.teams.find(t => t.id === this.teamId);
      if (existing && this._prevTeamId === this.teamId) {
        // Re-sync if teams array updated externally while editing same team
      }
    }
  }

  private _loadDraft() {
    if (this.teamId) {
      const team = this.teams.find(t => t.id === this.teamId);
      if (team) {
        this._draftName = team.teamName;
        this._draftFormat = team.gameFormat;
        this._draftHalfLength = team.halfLength;
        this._draftFormation = team.formation;
        this._draftRoster = team.players.map(p => ({
          id: p.id || uid('p'),
          number: p.number,
          name: p.name,
          nickname: p.nickname,
          primaryPos: p.primaryPos,
          secondaryPos: p.secondaryPos,
          half1Time: p.half1Time ?? 0,
          half2Time: p.half2Time ?? 0,
          benchTime: p.benchTime ?? 0,
          onFieldTime: p.onFieldTime ?? 0,
        }));
      }
    } else {
      this._draftName = '';
      this._draftFormat = '11v11';
      this._draftHalfLength = 45;
      this._draftFormation = '1-4-3-3';
      this._draftRoster = [];
    }
    this._addNumber = '';
    this._addName = '';
    this._addNickname = '';
    this._addPrimaryPos = '';
    this._addSecondaryPos = '';
    this._dropError = '';
    this._dropZoneDragover = false;
    this._editIdx = null;
    this._deleteIdx = null;
  }

  /* ── Cancel / Save ──────────────────────────────── */

  private _onCancel() {
    this.dispatchEvent(new EditCancelledEvent());
  }

  private _onSave() {
    const sorted = [...this._draftRoster].sort((a, b) => a.name.localeCompare(b.name));
    const teamData: StoredTeam = {
      id: this.teamId ?? uid('team'),
      teamName: this._draftName,
      players: sorted.map(p => ({
        id: p.id,
        number: p.number,
        name: p.name,
        nickname: p.nickname || undefined,
        primaryPos: p.primaryPos || undefined,
        secondaryPos: p.secondaryPos || undefined,
        half1Time: p.half1Time,
        half2Time: p.half2Time,
        benchTime: p.benchTime,
        onFieldTime: p.onFieldTime,
      })),
      halfLength: this._draftHalfLength,
      gameFormat: this._draftFormat,
      formation: this._draftFormation,
    };
    if (this.teamId) {
      const existing = this.teams.find(t => t.id === this.teamId);
      if (existing?.fieldPositions) {
        teamData.fieldPositions = existing.fieldPositions;
      }
      if (existing?.showBenchTime !== undefined) {
        teamData.showBenchTime = existing.showBenchTime;
      }
      if (existing?.showOnFieldTime !== undefined) {
        teamData.showOnFieldTime = existing.showOnFieldTime;
      }
      if (existing?.largeTimeDisplay !== undefined) {
        teamData.largeTimeDisplay = existing.largeTimeDisplay;
      }
    }
    this.dispatchEvent(new TeamSavedEvent(teamData));
  }

  /* ── Team field handlers ────────────────────────── */

  private _onTeamNameInput(e: InputEvent) {
    this._draftName = (e.target as HTMLInputElement).value;
  }

  private _onGameFormatChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as GameFormat;
    this._draftFormat = val;
    this._draftHalfLength = getStandardHalfLength(val);
    this._draftFormation = getDefaultFormation(val);
  }

  private _onHalfLengthInput(e: InputEvent) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val > 0) {
      this._draftHalfLength = val;
    }
  }

  /* ── Add / remove / update players ──────────────── */

  private _onAddNumberInput(e: InputEvent) { this._addNumber = (e.target as HTMLInputElement).value; }
  private _onAddNameInput(e: InputEvent) { this._addName = (e.target as HTMLInputElement).value; }
  private _onAddNicknameInput(e: InputEvent) { this._addNickname = (e.target as HTMLInputElement).value; }
  private _onAddPrimaryPosChange(e: Event) { this._addPrimaryPos = (e.target as HTMLSelectElement).value as Position | ''; }
  private _onAddSecondaryPosChange(e: Event) { this._addSecondaryPos = (e.target as HTMLSelectElement).value as Position | ''; }

  private _addPlayer() {
    if (!this._addNumber.trim() && !this._addName.trim()) return;
    const entry: RosterEntry = {
      id: uid('p'),
      number: this._addNumber.trim(),
      name: this._addName.trim(),
      nickname: this._addNickname.trim() || undefined,
      primaryPos: this._addPrimaryPos || undefined,
      secondaryPos: this._addSecondaryPos || undefined,
      half1Time: 0,
      half2Time: 0,
      benchTime: 0,
      onFieldTime: 0,
    };
    this._draftRoster = [...this._draftRoster, entry];
    this._addNumber = '';
    this._addName = '';
    this._addNickname = '';
    this._addPrimaryPos = '';
    this._addSecondaryPos = '';
  }

  private _addPlayerKeydown(e: KeyboardEvent) { if (e.key === 'Enter') this._addPlayer(); }


  /* ── Edit player dialog ─────────────────────────── */

  private _openEditPlayer(idx: number) {
    const p = this._draftRoster[idx];
    this._editIdx = idx;
    this._editNumber = p.number;
    this._editName = p.name;
    this._editNickname = p.nickname ?? '';
    this._editPrimaryPos = p.primaryPos ?? '';
    this._editSecondaryPos = p.secondaryPos ?? '';
    this._editPlayerDialog?.showModal();
  }

  private _saveEditPlayer() {
    if (this._editIdx == null) return;
    this._draftRoster = this._draftRoster.map((p, i) =>
      i === this._editIdx ? {
        ...p,
        number: this._editNumber.trim(),
        name: this._editName.trim(),
        nickname: this._editNickname.trim() || undefined,
        primaryPos: (this._editPrimaryPos || undefined) as Position | undefined,
        secondaryPos: (this._editSecondaryPos || undefined) as Position | undefined,
      } : p,
    );
    this._editIdx = null;
    this._editPlayerDialog?.close();
  }

  private _cancelEditPlayer() {
    this._editIdx = null;
    this._editPlayerDialog?.close();
  }

  @query('#delete-player-dialog') private _deletePlayerDialog!: HTMLDialogElement;

  private _requestDeletePlayer() {
    if (this._editIdx == null) return;
    this._deleteIdx = this._editIdx;
    this._editPlayerDialog?.close();
    this._deletePlayerDialog?.showModal();
  }

  private _requestDeletePlayerDirect(idx: number) {
    this._deleteIdx = idx;
    this._deletePlayerDialog?.showModal();
  }

  private _confirmDeletePlayer() {
    if (this._deleteIdx != null) {
      this._draftRoster = this._draftRoster.filter((_, i) => i !== this._deleteIdx);
    }
    this._deleteIdx = null;
    this._editIdx = null;
    this._deletePlayerDialog?.close();
  }

  private _cancelDeletePlayer() {
    this._deleteIdx = null;
    this._deletePlayerDialog?.close();
  }

  /* ── File import / drop zone ────────────────────── */

  private _importRoster(text: string) {
    const parsed = parseRosterWithMeta(text);
    if (parsed.players.length === 0) {
      this._dropError = 'Could not parse roster. Check the format.';
      this._dropErrorTimer = setTimeout(() => this._dropError = '', 4000);
      return;
    }
    this._dropError = '';
    this._applyParsedRoster(parsed);
  }

  private _applyParsedRoster(parsed: ReturnType<typeof parseRosterWithMeta>) {
    if (parsed.meta.name && !this._draftName) this._draftName = parsed.meta.name;
    if (parsed.meta.format && GAME_FORMATS.some(f => f.key === parsed.meta.format)) {
      this._draftFormat = parsed.meta.format as GameFormat;
    }
    if (parsed.meta.halfLength != null && parsed.meta.halfLength > 0 && parsed.meta.halfLength <= 90) {
      this._draftHalfLength = parsed.meta.halfLength;
    }
    if (parsed.meta.formation) {
      const migrated = FORMATION_KEY_MIGRATION[parsed.meta.formation] ?? parsed.meta.formation;
      if (ALL_FORMATION_KEYS.has(migrated as FormationKey)) {
        this._draftFormation = migrated as FormationKey;
      }
    }
    this._draftRoster = parsed.players.map(p => ({
      id: uid('p'),
      number: p.number,
      name: p.name,
      nickname: p.nickname,
      primaryPos: POSITIONS.includes(p.primaryPos as Position) ? p.primaryPos as Position : undefined,
      secondaryPos: POSITIONS.includes(p.secondaryPos as Position) ? p.secondaryPos as Position : undefined,
      half1Time: 0,
      half2Time: 0,
      benchTime: 0,
      onFieldTime: 0,
    }));
  }

  private _onDropZoneDragover(e: DragEvent) {
    e.preventDefault();
    this._dropZoneDragover = true;
  }

  private _onDropZoneDragleave() {
    this._dropZoneDragover = false;
  }

  private _onDropZoneDrop(e: DragEvent) {
    e.preventDefault();
    this._dropZoneDragover = false;
    const file = e.dataTransfer?.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this._importRoster(reader.result as string);
      reader.readAsText(file);
    }
  }

  private _onDropZoneClick(e: Event) {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    const input = this.shadowRoot?.querySelector('#roster-file-input') as HTMLInputElement;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  private async _onTryExample(e: Event) {
    e.preventDefault();
    try {
      const res = await fetch('/examples/uswnt.yaml', { signal: this._abortController.signal });
      const text = await res.text();
      if (this._abortController.signal.aborted) return;
      this._applyParsedRoster(parseRosterWithMeta(text));
    } catch { /* silently fail — includes AbortError */ }
  }

  private _onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this._importRoster(reader.result as string);
      reader.readAsText(file);
    }
  }


  /* ── Export roster ──────────────────────────────── */

  private _exportRoster() {
    if (this._draftRoster.length === 0) return;
    const yaml = serializeRosterYaml(
      {
        name: this._draftName || 'Untitled',
        format: this._draftFormat,
        halfLength: this._draftHalfLength,
        formation: this._draftFormation,
      },
      this._draftRoster,
    );
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this._draftName || 'roster'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Delete team ────────────────────────────────── */

  private _requestDeleteTeam() { this._confirmDialog?.showModal(); }

  private _confirmDeleteTeam() {
    this._confirmDialog?.close();
    if (this.teamId) {
      this.dispatchEvent(new EditTeamDeletedEvent(this.teamId));
    }
  }

  private _cancelConfirm() { this._confirmDialog?.close(); }

  /* ── Render ─────────────────────────────────────── */

  render() {
    const isNew = this.teamId == null;

    return html`
      <div class="header">
        <h1>${isNew ? 'Create New Team' : 'Edit Team'}</h1>
        <span class="spacer"></span>
        <button class="close-btn" @click="${this._onCancel}" aria-label="Close" title="Close">
          <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>

      <div class="edit-body">
        <div class="team-hero">
          <div class="team-field team-name-field">
            <label for="team-name-input">Team name</label>
            <input
              id="team-name-input"
              class="team-name-input"
              type="text"
              placeholder="Enter team name"
              .value="${this._draftName}"
              @input="${this._onTeamNameInput}" />
          </div>
          <div class="team-fields-row">
            <div class="team-field">
              <label for="format-select">Format</label>
              <span class="select-wrap">
                <select
                  id="format-select"
                  .value="${this._draftFormat}"
                  @change="${this._onGameFormatChange}">
                  ${GAME_FORMATS.map(f => html`
                    <option value="${f.key}" ?selected="${f.key === this._draftFormat}">${f.label}</option>
                  `)}
                </select>
                <span class="caret"></span>
              </span>
            </div>
            <div class="team-field">
              <label for="formation-select">Formation</label>
              <span class="select-wrap">
                <select
                  id="formation-select"
                  .value="${this._draftFormation}"
                  @change="${(e: Event) => this._draftFormation = (e.target as HTMLSelectElement).value as FormationKey}">
                  ${FORMATIONS_BY_FORMAT[this._draftFormat].map(f => html`
                    <option value="${f.key}" ?selected="${f.key === this._draftFormation}">${f.label}</option>
                  `)}
                </select>
                <span class="caret"></span>
              </span>
            </div>
            <div class="team-field">
              <label for="half-length">Half length</label>
              <div class="half-length-input-wrap">
                <input
                  id="half-length"
                  class="player-input settings-number"
                  type="text"
                  inputmode="numeric"
                  maxlength="3"
                  .value="${String(this._draftHalfLength)}"
                  @input="${this._onHalfLengthInput}" />
                <span class="half-length-unit">min</span>
              </div>
            </div>
          </div>
        </div>

        ${this._draftRoster.length === 0 ? html`
          <div class="drop-zone ${this._dropZoneDragover ? 'dragover' : ''}"
               tabindex="0"
               @dragover="${this._onDropZoneDragover}"
               @dragleave="${this._onDropZoneDragleave}"
               @drop="${this._onDropZoneDrop}"
               @click="${this._onDropZoneClick}"
            >
            <input type="file" id="roster-file-input" accept=".md,.csv,.txt" hidden
                   aria-label="Upload roster file"
                   @change="${this._onFileSelected}" />
            <p>Drag & drop or click to upload a roster</p>
            <button class="browse-btn" @click="${(e: Event) => { e.stopPropagation(); const input = this.shadowRoot?.querySelector('#roster-file-input') as HTMLInputElement; if (input) { input.value = ''; input.click(); } }}">Browse Files</button>
            <p class="drop-hint">Supports .csv and .md</p>
            ${this._dropError ? html`<p class="drop-error">${this._dropError}</p>` : nothing}
          </div>
          <a href="#" class="example-link" @click="${this._onTryExample}">Or try the USWNT example</a>
        ` : nothing}

        <div class="add-player-card">
          <fieldset class="add-player-fieldset">
            <legend class="add-player-legend">
              <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m600 600c110.44 0 200.02-89.531 200.02-200.02 0-110.44-89.578-199.97-200.02-199.97s-200.02 89.531-200.02 199.97c0 110.48 89.578 200.02 200.02 200.02z" fill="currentColor" fill-rule="evenodd"/><path d="m944.58 901.5c3 16.5 4.5 32.484 5.0156 48.984 0.42188-0.46875 0.46875 29.156 0.46875 35.531 0 8.4844-6.4688 15-15 15h-669.98c-8.4844 0-15-6.5156-15-15 0-17.016-0.51562-33.516 0.98438-50.016 1.0312-8.4844 2.0156-20.016 5.0156-33.984 5.4844-27.516 16.5-64.5 39-102 46.5-78.516 138-150 305.02-150 166.97 0 258.47 71.484 305.48 149.48 22.5 37.5 33.516 74.484 39 102z" fill="currentColor"/></svg>
              Add Player
            </legend>
            <div class="add-row">
              <div class="add-field num-field">
                <label for="add-number">Num.</label>
                <input id="add-number"
                  class="player-input"
                  type="text"
                  inputmode="numeric"
                  maxlength="2"
                  placeholder="#"
                  .value="${this._addNumber}"
                  @input="${this._onAddNumberInput}"
                  @keydown="${this._addPlayerKeydown}" />
              </div>
              <div class="add-field name-field">
                <label for="add-name">Player Name</label>
                <input id="add-name"
                  class="player-input"
                  type="text"
                  placeholder="Name"
                  .value="${this._addName}"
                  @input="${this._onAddNameInput}"
                  @keydown="${this._addPlayerKeydown}" />
              </div>
              <div class="add-field nickname-field">
                <label for="add-nickname">Nickname</label>
                <input id="add-nickname"
                  class="player-input"
                  type="text"
                  placeholder="Optional"
                  .value="${this._addNickname}"
                  @input="${this._onAddNicknameInput}"
                  @keydown="${this._addPlayerKeydown}" />
              </div>
              <div class="add-field pos-field">
                <label for="add-pos1">Position 1</label>
                <span class="select-wrap">
                  <select id="add-pos1" class="player-input" .value="${this._addPrimaryPos}" @change="${this._onAddPrimaryPosChange}">
                    <option value="">—</option>
                    ${POSITIONS.map(p => html`<option value="${p}" ?selected="${p === this._addPrimaryPos}">${p}</option>`)}
                  </select>
                  <span class="caret"></span>
                </span>
              </div>
              <div class="add-field pos-field">
                <label for="add-pos2">Position 2</label>
                <span class="select-wrap">
                  <select id="add-pos2" class="player-input" .value="${this._addSecondaryPos}" @change="${this._onAddSecondaryPosChange}">
                    <option value="">—</option>
                    ${POSITIONS.map(p => html`<option value="${p}" ?selected="${p === this._addSecondaryPos}">${p}</option>`)}
                  </select>
                  <span class="caret"></span>
                </span>
              </div>
              <button class="add-player-btn" @click="${this._addPlayer}" aria-label="Add Player" title="Add Player">
                <svg class="add-icon" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m600 99.984c275.95 0 500.02 224.06 500.02 500.02s-224.06 500.02-500.02 500.02-500.02-224.06-500.02-500.02 224.06-500.02 500.02-500.02zm0 100.03c-220.78 0-399.98 179.26-399.98 399.98 0 220.78 179.26 399.98 399.98 399.98 220.78 0 399.98-179.26 399.98-399.98 0-220.78-179.26-399.98-399.98-399.98zm-50.016 450h-150c-27.609 0-49.969-22.406-49.969-50.016s22.406-50.016 49.969-50.016h150v-150c0-27.609 22.406-49.969 50.016-49.969s50.016 22.406 50.016 49.969v150h150c27.609 0 49.969 22.406 49.969 50.016s-22.406 50.016-49.969 50.016h-150v150c0 27.609-22.406 49.969-50.016 49.969s-50.016-22.406-50.016-49.969z" fill-rule="evenodd" fill="currentColor"/></svg>
                Add
              </button>
            </div>
          </fieldset>
        </div>

        ${this._draftRoster.length > 0 ? html`
          <table class="roster-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Positions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${sortRoster(this._draftRoster.map((p, i) => ({ ...p, _idx: i })), this.rosterSort).map(p => html`
                <tr>
                  <td class="jersey-col">${p.number}</td>
                  <td>${p.nickname ? html`${p.name} <span class="pos-col">(${p.nickname})</span>` : p.name}</td>
                  <td class="pos-col">${p.primaryPos ?? ''}${p.secondaryPos ? html` / ${p.secondaryPos}` : nothing}</td>
                  <td class="action-cell">
                    <div class="action-group">
                      <button class="edit-row-btn" aria-label="Edit ${p.name}" title="Edit" @click="${() => this._openEditPlayer(p._idx)}">
                        <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m751.21 316.68c-14.977 0-29.969 5.6602-41.281 16.973l-17.441 17.441c-6.3828 6.3867-9.9727 15.047-9.9766 24.074 0 9.0312 3.582 17.695 9.9648 24.082l108.3 108.42h-0.003907c6.3828 6.3906 15.039 9.9805 24.066 9.9883 9.0273 0.003906 17.691-3.5781 24.078-9.957l17.566-17.547c22.625-22.625 22.625-60.078 0-82.703l-73.984-73.801c-11.312-11.312-26.305-16.973-41.281-16.973zm-131.75 107.39-244.17 244.04c-26.129 26.129-43.371 59.723-49.445 96.172l-8.3477 50.738c-6.5156 39.094 28.527 74.137 67.621 67.617l50.508-8.3945c36.449-6.0781 70.043-23.5 96.172-49.629l244.26-244.13h-0.003906c4.0977-4.1016 6.4023-9.6602 6.4023-15.461 0-5.7969-2.3086-11.359-6.4102-15.457l-125.64-125.5c-4.1055-4.1016-9.6719-6.4023-15.473-6.4023-5.8047 0-11.367 2.3047-15.473 6.4062z" fill="currentColor"/></svg>
                      </button>
                      <button class="delete-row-btn" aria-label="Delete ${p.name}" title="Delete" @click="${() => this._requestDeletePlayerDirect(p._idx)}">
                        <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m300 393.61 55.172 618.74h489.74l55.078-618.74zm123.14 117.33h75.094v374.76h-75.094zm139.22 0h75.094v374.76h-75.094zm139.55 0h75.094v374.76h-75.094z" fill="currentColor"/><path d="m410.44 149.95v112.41h-147.89v75h674.9v-75h-147.89v-112.41zm75 75h229.18v37.406h-229.18z" fill="currentColor"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : nothing}

        ${!isNew ? html`
          <div class="delete-team-section">
            <button class="delete-team-btn" @click="${this._requestDeleteTeam}">Delete Team</button>
            <button class="export-btn" @click="${this._exportRoster}" ?disabled="${this._draftRoster.length === 0}">Export Roster</button>
          </div>
        ` : nothing}
      </div>

      <div class="edit-footer">
        <button class="cancel-btn" @click="${this._onCancel}">Cancel</button>
        <button class="save-btn" @click="${this._onSave}">Save</button>
      </div>

      <dialog id="confirm-dialog" class="confirm-dialog">
        <div class="dialog-header">
          <h2>Delete Team</h2>
          <button class="dialog-close" @click="${this._cancelConfirm}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          <p>Delete "${this._draftName || 'Untitled'}"? This cannot be undone.</p>
          <div class="confirm-actions">
            <button class="cancel-btn" @click="${this._cancelConfirm}">Cancel</button>
            <button class="confirm-yes" @click="${this._confirmDeleteTeam}">Delete</button>
          </div>
        </div>
      </dialog>

      <dialog id="edit-player-dialog">
        <div class="dialog-header">
          <h2>Edit Player</h2>
          <button class="dialog-close" @click="${this._cancelEditPlayer}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="edit-player-fields">
            <div class="edit-player-row">
              <div class="edit-player-field number-field">
                <label for="edit-player-number">#</label>
                <input id="edit-player-number" type="text" inputmode="numeric" maxlength="2"
                       .value="${this._editNumber}"
                       @input="${(e: InputEvent) => this._editNumber = (e.target as HTMLInputElement).value}" />
              </div>
              <div class="edit-player-field">
                <label for="edit-player-name">Player Name</label>
                <input id="edit-player-name" type="text"
                       .value="${this._editName}"
                       @input="${(e: InputEvent) => this._editName = (e.target as HTMLInputElement).value}" />
              </div>
            </div>
            <div class="edit-player-field">
              <label for="edit-player-nickname">Nickname</label>
              <input id="edit-player-nickname" type="text" placeholder="Optional"
                     .value="${this._editNickname}"
                     @input="${(e: InputEvent) => this._editNickname = (e.target as HTMLInputElement).value}" />
            </div>
            <div class="edit-player-row">
              <div class="edit-player-field">
                <label for="edit-player-primary">Position 1</label>
                <span class="select-wrap">
                  <select id="edit-player-primary"
                          .value="${this._editPrimaryPos}"
                          @change="${(e: Event) => this._editPrimaryPos = (e.target as HTMLSelectElement).value as Position | ''}">
                    <option value="">—</option>
                    ${POSITIONS.map(pos => html`<option value="${pos}" ?selected="${pos === this._editPrimaryPos}">${pos}</option>`)}
                  </select>
                  <span class="caret"></span>
                </span>
              </div>
              <div class="edit-player-field">
                <label for="edit-player-secondary">Position 2</label>
                <span class="select-wrap">
                  <select id="edit-player-secondary"
                          .value="${this._editSecondaryPos}"
                          @change="${(e: Event) => this._editSecondaryPos = (e.target as HTMLSelectElement).value as Position | ''}">
                    <option value="">—</option>
                    ${POSITIONS.map(pos => html`<option value="${pos}" ?selected="${pos === this._editSecondaryPos}">${pos}</option>`)}
                  </select>
                  <span class="caret"></span>
                </span>
              </div>
            </div>
          </div>
          <div class="edit-player-actions">
            <button class="cancel-btn" @click="${this._cancelEditPlayer}">Cancel</button>
            <button class="save-player-btn" @click="${this._saveEditPlayer}">Save</button>
          </div>
        </div>
      </dialog>

      <dialog id="delete-player-dialog" class="confirm-dialog">
        <div class="dialog-header">
          <h2>Delete Player</h2>
          <button class="dialog-close" @click="${this._cancelDeletePlayer}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          <p>Are you sure you want to delete ${this._deleteIdx != null ? this._draftRoster[this._deleteIdx]?.name || 'this player' : 'this player'}?</p>
          <div class="confirm-actions">
            <button class="cancel-btn" @click="${this._cancelDeletePlayer}">Cancel</button>
            <button class="confirm-yes" @click="${this._confirmDeletePlayer}">Delete</button>
          </div>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-edit-team-view': PtEditTeamView;
  }
}
