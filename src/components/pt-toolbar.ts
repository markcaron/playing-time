import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { enableDragDropTouch } from '@dragdroptouch/drag-drop-touch';
import type { RosterEntry, FormationKey, GameFormat, StoredTeam } from '../lib/types.js';
import { FORMATIONS_BY_FORMAT, GAME_FORMATS, getPlayerCount, getStandardHalfLength } from '../lib/types.js';
import { uid } from '../lib/svg-utils.js';
import { parseRoster } from '../lib/roster-parser.js';

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

export class BenchTimeToggleEvent extends Event {
  static readonly eventName = 'bench-time-toggle' as const;
  constructor(public showBenchTime: boolean) {
    super(BenchTimeToggleEvent.eventName, { bubbles: true, composed: true });
  }
}

export class OnFieldTimeToggleEvent extends Event {
  static readonly eventName = 'on-field-time-toggle' as const;
  constructor(public showOnFieldTime: boolean) {
    super(OnFieldTimeToggleEvent.eventName, { bubbles: true, composed: true });
  }
}

export class LargeTimeDisplayEvent extends Event {
  static readonly eventName = 'large-time-display' as const;
  constructor(public largeTimeDisplay: boolean) {
    super(LargeTimeDisplayEvent.eventName, { bubbles: true, composed: true });
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

    .settings-bar {
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 8px 12px;
      background: var(--pt-bg-primary);
      user-select: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      z-index: 1;
    }

    .roster-btn {
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .team-name-label {
      display: inline-block;
      margin-left: 8px;
      font-size: 0.85rem;
      font-weight: bold;
      color: var(--pt-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
      vertical-align: middle;
    }

    .roster-badge {
      min-width: 20px;
      height: 20px;
      padding: 0 5px;
      border-radius: 10px;
      background: var(--pt-accent);
      color: var(--pt-text-white);
      font-size: 0.7rem;
      font-weight: bold;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .row-idx {
      font-size: 0.65rem;
      color: var(--pt-text-muted);
      width: 14px;
      text-align: right;
      flex-shrink: 0;
    }

    .roster-btn.hint {
      outline: 2px solid var(--pt-hint);
      outline-offset: 2px;
      animation: hintPulse 1.5s ease-in-out infinite;
    }

    @keyframes hintPulse {
      0%, 100% { outline-color: var(--pt-hint); }
      50% { outline-color: rgba(127, 255, 0, 0.4); }
    }

    .roster-btn.open {
      background: var(--pt-danger);
      border-color: var(--pt-danger);
      color: var(--pt-text-white);
    }

    dialog:not([open]) {
      display: none;
    }

    dialog {
      background: var(--pt-bg-surface);
      border: 1px solid var(--pt-border);
      border-radius: 10px;
      padding: 0;
      width: calc(100% - 32px);
      max-width: 520px;
      max-height: calc(100dvh - 32px);
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      color: var(--pt-text);
    }

    dialog::backdrop {
      background: rgba(0, 0, 0, 0.6);
    }

    dialog#roster-dialog,
    dialog#settings-dialog {
      height: calc(100dvh - 32px);
    }

    dialog.settings-dialog {
      max-width: 360px;
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
      color: var(--pt-text);
    }

    .roster-dialog-close {
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

    .roster-dialog-close:hover { color: var(--pt-text-white); }

    .roster-dialog-close svg {
      width: 14px;
      height: 14px;
    }

    .roster-dialog-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px 16px;
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
      background: var(--pt-accent);
      border: none;
      color: var(--pt-text-white);
      font-weight: bold;
    }

    .roster-dialog-footer button:hover {
      background: var(--pt-accent-hover);
    }

    .settings-btn {
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .settings-btn.open {
      background: var(--pt-danger);
      border-color: var(--pt-danger);
      color: var(--pt-text-white);
    }

    .settings-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
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
      background: var(--pt-bg-surface);
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    button:hover { background: var(--pt-border); }

    button:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.35;
      cursor: default;
      pointer-events: none;
    }

    .spacer { flex: 1; }

    dialog.confirm-dialog {
      max-width: 400px;
      height: auto;
    }

    dialog.confirm-dialog .roster-dialog-body p {
      margin: 0;
      font-size: 0.85rem;
      color: var(--pt-text);
      line-height: 1.4;
    }

    dialog.confirm-dialog .confirm-actions {
      margin-top: 32px;
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

    .confirm-actions .cancel-btn {
      border: 1px solid var(--pt-accent);
      color: var(--pt-text-white);
      background: transparent;
    }

    .confirm-actions .cancel-btn:hover {
      background: rgba(78, 168, 222, 0.15);
    }

    .confirm-actions .confirm-yes {
      background: var(--pt-danger);
      border-color: var(--pt-danger);
      color: var(--pt-text-white);
    }

    .confirm-actions .confirm-yes:hover {
      background: var(--pt-danger-hover);
    }

    select {
      appearance: none;
      -webkit-appearance: none;
      padding: 6px 26px 6px 10px;
      min-height: 44px;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      background: var(--pt-bg-surface);
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
    }

    .select-wrap .caret {
      position: absolute;
      right: 10px;
      pointer-events: none;
    }

    .roster-dialog-body label {
      font-size: 0.8rem;
      color: var(--pt-text-muted);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .drawer-header .team-label {
      font-size: 0.9rem;
      color: var(--pt-text);
      font-weight: bold;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mode-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: bold;
      color: var(--pt-text);
      cursor: pointer;
    }


    .roster-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .view-team-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .view-meta {
      font-size: 0.75rem;
      color: var(--pt-text-muted);
    }

    .roster-table th {
      text-align: left;
      font-size: 0.75rem;
      color: var(--pt-text-muted);
      font-weight: normal;
      padding: 2px 8px 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .roster-table td {
      padding: 5px 8px 5px 0;
      color: var(--pt-text);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .roster-table td.jersey-col {
      color: var(--pt-text-muted);
      width: 32px;
    }

    .add-player-fieldset {
      border: none;
      margin: 0;
      padding: 0;
    }

    .add-player-label {
      font-size: 0.8rem;
      color: var(--pt-text-muted);
      padding: 0;
      margin-bottom: 6px;
    }

    .drop-zone {
      border: 2px dashed rgba(255, 255, 255, 0.25);
      border-radius: 10px;
      padding: 24px 16px;
      margin-top: 16px;
      margin-bottom: 16px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .drop-zone:hover,
    .drop-zone.dragover {
      border-color: var(--pt-accent);
      background: rgba(78, 168, 222, 0.05);
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
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      cursor: pointer;
      font: inherit;
    }

    .drop-zone .browse-btn:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    .drop-zone .drop-error {
      color: var(--pt-danger-light);
      font-size: 0.8rem;
    }

    .section-separator {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 10px;
      margin-top: 2px;
      margin-bottom: 10px;
    }

    .delete-team-section {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 16px;
      margin-top: 2px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }

    button.export-btn {
      padding: 8px 14px;
      border: 1px solid var(--pt-accent);
      color: var(--pt-accent);
      background: transparent;
    }

    button.export-btn:hover {
      background: rgba(78, 168, 222, 0.1);
    }

    button.delete-team-btn {
      background: transparent;
      color: var(--pt-danger-light);
      border: 1px solid var(--pt-danger-light);
      padding: 8px 14px;
    }

    button.delete-team-btn:hover {
      background: rgba(248, 113, 113, 0.1);
    }

    .empty-warning {
      background: var(--pt-bg-warning);
      border: 1px solid var(--pt-warning);
      border-radius: 6px;
      padding: 10px 14px;
      margin-top: 8px;
      color: var(--pt-bg-dark);
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .empty-warning .warning-icon {
      flex-shrink: 0;
      font-size: 1.4rem;
      font-weight: bold;
      color: #b8860b;
    }

    .edit-link {
      color: var(--pt-bg-dark);
      font-weight: bold;
      text-decoration: underline;
      cursor: pointer;
    }

    .edit-link:hover {
      opacity: 0.7;
    }

    .slide-toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 66px;
      height: 36px;
      flex-shrink: 0;
      cursor: pointer;
    }

    .slide-toggle input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .slide-track {
      position: absolute;
      inset: 0;
      background: var(--pt-bg-primary);
      border: 1px solid var(--pt-border);
      border-radius: 18px;
      transition: background 0.2s;
    }

    .slide-thumb {
      position: absolute;
      width: 30px;
      height: 30px;
      left: 3px;
      top: 3px;
      background: var(--pt-text-white);
      border-radius: 50%;
      transition: transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: bold;
      color: var(--pt-text-on-light);
      user-select: none;
    }

    .slide-toggle input:checked ~ .slide-track {
      background: var(--pt-success);
    }

    .slide-toggle input:checked ~ .slide-thumb {
      transform: translateX(30px);
      color: var(--pt-success);
    }

    .slide-toggle input:focus-visible ~ .slide-track {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }


    .how-to-use {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 16px;
      margin-top: 8px;
      margin-bottom: 8px;
    }

    .how-to-heading {
      font-size: 0.85rem;
      font-weight: bold;
      color: var(--pt-text);
      margin: 0 0 24px 0;
    }

    .how-to-tip {
      margin: 32px 0 0 0;
      font-size: 0.8rem;
      color: var(--pt-text);
      line-height: 1.5;
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
      font-size: 0.85rem;
      color: var(--pt-text);
    }

    .onboarding-list svg {
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      fill: currentColor;
    }

    .settings-branding {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding-top: 16px;
      margin-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      font-size: 0.75rem;
      color: rgba(78, 168, 222, 0.6);
    }

    .branding-title {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .branding-version,
    .branding-license {
      font-size: 0.65rem;
      opacity: 0.8;
    }

    .branding-icon { width: 12px; height: 12px; }

    .team-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .team-select-wrap {
      max-width: 160px;
    }

    .team-select-wrap select {
      width: 100%;
      min-width: 0;
      text-overflow: ellipsis;
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
      color: var(--pt-text-muted);
    }

    button.add-team-btn-lg {
      padding: 8px 20px;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      background: var(--pt-bg-surface);
      color: var(--pt-text);
      cursor: pointer;
    }

    button.add-team-btn-lg:hover { background: var(--pt-border); }

    button.add-team-btn {
      padding: 6px 14px;
      font-size: 0.85rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      white-space: nowrap;
      margin-left: auto;
    }

    .team-fields-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 10px;
      margin-top: 2px;
    }

    .team-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .team-field label {
      font-size: 0.8rem;
      color: var(--pt-text-muted);
      white-space: nowrap;
    }

    .team-name-field {
      flex: 1;
      min-width: 0;
    }

    .half-length-input-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .half-length-unit {
      font-size: 0.8rem;
      color: var(--pt-text-muted);
    }

    .team-name-input {
      width: 100%;
      padding: 6px 10px;
      min-height: 44px;
      border: 1px solid var(--pt-border);
      border-radius: 6px;
      background: var(--pt-bg-primary);
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
    }

    .player-input {
      width: 100%;
      padding: 6px 10px;
      min-height: 44px;
      border: 1px solid var(--pt-border);
      border-radius: 6px;
      background: var(--pt-bg-primary);
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
    }

    .team-name-input:focus,
    .player-input:focus {
      outline: none;
      border-color: var(--pt-accent);
    }

    .number-input { width: 48px; flex-shrink: 0; }
    .name-input { flex: 1; min-width: 0; margin-right: 8px; }

    .roster-list {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 16px;
      margin-top: 2px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 16px;
      margin-bottom: 2px;
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
    .roster-row.drag-over { border-top: 2px solid var(--pt-accent); }

    .drag-area {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 36px;
      min-height: 36px;
      cursor: grab;
      touch-action: none;
      flex-shrink: 0;
      padding: 4px 2px;
      user-select: none;
      -webkit-user-select: none;
    }

    .drag-area:active { cursor: grabbing; }

    .drag-handle {
      color: var(--pt-text-muted);
      display: flex;
      align-items: center;
    }

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
      border: 1px solid var(--pt-success-light);
      color: var(--pt-success-light);
      background: transparent;
      align-self: stretch;
    }

    button.danger {
      background: transparent;
      color: var(--pt-danger-light);
      border-color: transparent;
      padding: 6px 10px;
      align-self: stretch;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    button.danger svg { width: 9px; height: 9px; }

    button.danger:hover,
    button.danger:focus-visible {
      border-color: var(--pt-danger-light);
      background: rgba(248, 113, 113, 0.1);
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
  @property({ type: Boolean }) showBenchTime = true;
  @property({ type: Boolean }) showOnFieldTime = true;
  @property({ type: Boolean }) largeTimeDisplay = false;

  @state() private _rosterOpen = false;
  @state() private _settingsOpen = false;
  @state() private _editMode = false;
  @state() private _addNumber = '';
  @state() private _addName = '';
  @state() private _dragIdx: number | null = null;
  @state() private _dragOverIdx: number | null = null;
  @state() private _dropZoneDragover = false;
  @state() private _dropError = '';

  @query('#roster-dialog') private _rosterDialog!: HTMLDialogElement;
  @query('#settings-dialog') private _settingsDialog!: HTMLDialogElement;
  @query('#confirm-dialog') private _confirmDialog!: HTMLDialogElement;

  firstUpdated() {
    if (this.shadowRoot) {
      enableDragDropTouch(this.shadowRoot, this.shadowRoot);
    }
  }

  private _openRoster() { this._rosterOpen = true; this._rosterDialog?.showModal(); }
  private _closeRoster() { this._rosterOpen = false; this._editMode = false; this._rosterDialog?.close(); }
  private _openSettings() { this._settingsOpen = true; this._settingsDialog?.showModal(); }
  private _closeSettings() { this._settingsOpen = false; this._settingsDialog?.close(); }

  private _onTeamSwitch(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.dispatchEvent(new TeamSwitchedEvent(val));
  }

  private _addTeam() {
    this._editMode = true;
    this.dispatchEvent(new TeamAddedEvent());
    requestAnimationFrame(() => this._rosterDialog?.showModal());
  }

  private _requestDeleteTeam() { this._confirmDialog?.showModal(); }

  private _exportRoster() {
    if (this.roster.length === 0) return;
    const header = 'Number,Name';
    const rows = this.roster.map(p => `${p.number},${p.name}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.teamName || 'roster'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private _confirmDeleteTeam() {
    this._confirmDialog?.close();
    if (this.activeTeamId) {
      this.dispatchEvent(new TeamDeletedEvent(this.activeTeamId));
    }
  }

  private _cancelConfirm() { this._confirmDialog?.close(); }

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
    const standardHL = getStandardHalfLength(val);
    this.dispatchEvent(new SettingsChangedEvent(standardHL));
  }

  private _onBenchTimeToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(new BenchTimeToggleEvent(checked));
  }

  private _onOnFieldTimeToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(new OnFieldTimeToggleEvent(checked));
  }

  private _onLargeTimeDisplayToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(new LargeTimeDisplayEvent(checked));
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
      benchTime: 0,
      onFieldTime: 0,
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

  // --- Roster import ---

  private _importRoster(text: string) {
    const parsed = parseRoster(text);
    if (parsed.length === 0) {
      this._dropError = 'Could not parse roster. Check the format.';
      setTimeout(() => this._dropError = '', 4000);
      return;
    }
    this._dropError = '';
    const entries: RosterEntry[] = parsed.map(p => ({
      id: uid('p'),
      number: p.number,
      name: p.name,
      half1Time: 0,
      half2Time: 0,
      benchTime: 0,
      onFieldTime: 0,
    }));
    this.dispatchEvent(new RosterUpdatedEvent(this.teamName, entries));
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
    e.stopPropagation();
    const input = this.shadowRoot?.querySelector('#roster-file-input') as HTMLInputElement;
    input?.click();
  }

  private _onFileSelected(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => this._importRoster(reader.result as string);
      reader.readAsText(file);
    }
  }

  private _onDropZonePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      e.preventDefault();
      this._importRoster(text);
    }
  }

  private _onDragStart(idx: number) {
    this._dragIdx = idx;
    const body = this.shadowRoot?.querySelector('.roster-dialog-body') as HTMLElement | null;
    if (body) body.style.overflow = 'hidden';
  }

  private _onDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    this._dragOverIdx = idx;
  }

  private _onDragEnd() {
    const body = this.shadowRoot?.querySelector('.roster-dialog-body') as HTMLElement | null;
    if (body) body.style.overflow = '';
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
                aria-label="Rosters${this.roster.length ? ` (${this.roster.length})` : ''}"
                title="Rosters">
          <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg" style="width:28px;height:28px"><path d="M1250.75 484.752L1150 585.501V790.128L1350 650.128L1250.75 484.752Z" fill="currentColor"/><path d="M450 585.499L349.251 484.75L250 650.123L450 790.123V585.499Z" fill="currentColor"/><path d="M500 575.125V1275.13H1100V575.125C1100 568.5 1102.63 562.125 1107.31 557.437L1224.25 440.5L1210 416.688C1203.62 406.001 1193.44 398.063 1181.5 394.5L950.059 325.063L947.497 330.125C925.059 375 884.871 410.188 835.871 421.063C761.371 437.625 687.991 400.937 655.311 335.563L650.061 325L418.621 394.437C406.684 398 396.496 405.937 390.121 416.625L375.871 440.437L492.808 557.375C497.495 562.062 500.121 568.437 500.121 575.063L500 575.125ZM950 575.125C977.625 575.125 1000 597.5 1000 625.125C1000 652.751 977.625 675.125 950 675.125C922.375 675.125 900 652.751 900 625.125C900 597.5 922.375 575.125 950 575.125ZM600 1125.13H700V1175.13H600V1125.13Z" fill="currentColor"/></svg>
        </button>
        ${this.teamName ? html`
          <span class="team-name-label">${this.teamName}</span>
        ` : nothing}
        ${this.roster.length > 0 ? html`<span class="roster-badge">${this.roster.length}</span>` : nothing}
        <span class="spacer"></span>
        <span class="select-wrap">
          <label for="formation-select" class="visually-hidden">Formation</label>
          <select id="formation-select" @change="${this._onFormationChange}">
            ${FORMATIONS_BY_FORMAT[this.gameFormat].map(f => html`
              <option value="${f.key}" .selected="${f.key === this.formation}">${f.label}</option>
            `)}
          </select>
          <span class="caret"></span>
        </span>
        <button class="settings-btn ${this._settingsOpen ? 'open' : ''}"
                @click="${this._openSettings}"
                aria-label="Settings"
                title="Settings">
          <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" style="width:14px;height:14px"><path d="m1170 681.6v-163.2l-186-51.598c-4.8008-14.398-10.801-30-18-44.398l94.801-166.8-116.4-116.4-168 94.801c-13.199-7.1992-28.801-13.199-43.199-18l-50.402-186h-165.6l-50.398 186c-14.398 6-30 12-43.199 18l-168-94.801-116.4 116.4 94.801 166.8c-7.1992 14.398-13.199 28.801-18 44.398l-186 51.602v164.4l186 50.402c4.8008 14.398 10.801 28.801 18 43.199l-94.801 166.8 116.4 116.4 168-94.801c13.199 7.1992 28.801 13.199 43.199 18l51.602 186h164.4l50.402-184.8c14.398-6 30-12 43.199-18l168 94.801 116.4-116.4-94.801-166.8c7.1992-14.398 13.199-28.801 18-43.199zm-570 112.8c-108 0-194.4-86.398-194.4-194.4s86.398-194.4 194.4-194.4 194.4 87.598 194.4 194.4-86.398 194.4-194.4 194.4z" fill="currentColor"/></svg>
        </button>
      </div>

      <dialog id="roster-dialog" @close="${() => this._rosterOpen = false}">
            <div class="roster-dialog-header">
              <h2>Rosters</h2>
              ${this.teams.length > 0 ? html`
                <label class="mode-toggle">
                  Edit
                  <span class="slide-toggle">
                    <input type="checkbox"
                           .checked="${this._editMode}"
                           @change="${(e: Event) => this._editMode = (e.target as HTMLInputElement).checked}" />
                    <span class="slide-track"></span>
                    <span class="slide-thumb">${this._editMode ? 'On' : 'Off'}</span>
                  </span>
                </label>
              ` : nothing}
              <button class="roster-dialog-close" @click="${this._closeRoster}" aria-label="Close" title="Close">
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
                    <span class="select-wrap team-select-wrap">
                      <label for="team-select" class="visually-hidden">Team</label>
                      <select id="team-select" @change="${this._onTeamSwitch}">
                        ${this.teams.map(t => html`
                          <option value="${t.id}" .selected="${t.id === this.activeTeamId}">${t.teamName || 'Untitled'}</option>
                        `)}
                      </select>
                      <span class="caret"></span>
                    </span>
                    <button class="add-team-btn" @click="${this._addTeam}">Add team</button>
                  </div>
                </div>

                ${!this._editMode ? html`
                  <div class="drawer-header section-separator">
                    <div class="view-team-info">
                      <span class="team-label">${this.teamName || 'Roster'}</span>
                      <span class="view-meta">${this.gameFormat} &middot; ${this.halfLength} min halves &middot; ${this.roster.length} player${this.roster.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ` : nothing}

                ${this._editMode ? html`
                  <div class="team-fields-row">
                    <div class="team-field team-name-field">
                      <label for="team-name-input">Team name</label>
                      <input
                        id="team-name-input"
                        class="team-name-input"
                        type="text"
                        placeholder="Enter team name"
                        .value="${this.teamName}"
                        @input="${this._onTeamNameInput}" />
                    </div>
                    <div class="team-field format-field">
                      <label for="format-select">Format</label>
                      <span class="select-wrap">
                        <select
                          id="format-select"
                          .value="${this.gameFormat}"
                          @change="${this._onGameFormatChange}">
                          ${GAME_FORMATS.map(f => html`
                            <option value="${f.key}" ?selected="${f.key === this.gameFormat}">${f.label}</option>
                          `)}
                        </select>
                        <span class="caret"></span>
                      </span>
                    </div>
                    <div class="team-field half-length-field">
                      <label for="half-length">Half length</label>
                      <div class="half-length-input-wrap">
                        <input
                          id="half-length"
                          class="player-input settings-number"
                          type="text"
                          inputmode="numeric"
                          maxlength="3"
                          .value="${String(this.halfLength)}"
                          ?disabled="${this.timerRunning}"
                          @input="${this._onHalfLengthInput}" />
                        <span class="half-length-unit">min</span>
                      </div>
                    </div>
                  </div>
                  ${this.roster.length > 0 ? html`<div class="roster-list">
                    ${this.roster.map((p, i) => html`
                      <div class="roster-row ${this._dragIdx === i ? 'dragging' : ''} ${this._dragOverIdx === i ? 'drag-over' : ''}"
                           @dragover="${(e: DragEvent) => this._onDragOver(e, i)}"
                           @dragend="${this._onDragEnd}">
                        <span class="drag-area"
                              draggable="true"
                              @dragstart="${() => this._onDragStart(i)}">
                          <span class="row-idx">${i + 1}</span>
                          <span class="drag-handle"><svg viewBox="0 0 10 14" xmlns="http://www.w3.org/2000/svg"><circle cx="3" cy="2" r="1" fill="currentColor"/><circle cx="7" cy="2" r="1" fill="currentColor"/><circle cx="3" cy="7" r="1" fill="currentColor"/><circle cx="7" cy="7" r="1" fill="currentColor"/><circle cx="3" cy="12" r="1" fill="currentColor"/><circle cx="7" cy="12" r="1" fill="currentColor"/></svg></span>
                        </span>
                        <input
                          class="player-input number-input"
                          type="text"
                          inputmode="numeric"
                          maxlength="2"
                          placeholder="#"
                          aria-label="Jersey number for player ${i + 1}"
                          .value="${p.number}"
                          @input="${(e: InputEvent) => this._updatePlayer(p.id, 'number', (e.target as HTMLInputElement).value)}" />
                        <input
                          class="player-input name-input"
                          type="text"
                          placeholder="Player name"
                          aria-label="Name for player ${i + 1}"
                          .value="${p.name}"
                          @input="${(e: InputEvent) => this._updatePlayer(p.id, 'name', (e.target as HTMLInputElement).value)}" />
                        <button class="danger" aria-label="Remove player" title="Remove player" @click="${() => this._removePlayer(p.id)}"><svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
                      </div>
                    `)}
                  </div>` : nothing}

                  ${this.roster.length === 0 ? html`
                    <div class="drop-zone ${this._dropZoneDragover ? 'dragover' : ''}"
                         tabindex="0"
                         @dragover="${this._onDropZoneDragover}"
                         @dragleave="${this._onDropZoneDragleave}"
                         @drop="${this._onDropZoneDrop}"
                         @paste="${this._onDropZonePaste}">
                      <input type="file" id="roster-file-input" accept=".md,.csv,.txt" hidden
                             @change="${this._onFileSelected}" />
                      <p>Drag & drop a roster file, or paste</p>
                      <button class="browse-btn" @click="${this._onDropZoneClick}">Browse files</button>
                      <p class="drop-hint">Supports .csv and .md formats</p>
                      ${this._dropError ? html`<p class="drop-error">${this._dropError}</p>` : nothing}
                    </div>
                  ` : nothing}

                  <fieldset class="add-player-fieldset">
                    <legend class="add-player-label">Add player</legend>
                    <div class="add-row">
                      <input
                        class="player-input number-input"
                        type="text"
                        inputmode="numeric"
                        maxlength="2"
                        placeholder="#"
                        aria-label="New player jersey number"
                        .value="${this._addNumber}"
                        @input="${this._onAddNumberInput}"
                        @keydown="${this._addPlayerKeydown}" />
                      <input
                        class="player-input name-input"
                        type="text"
                        placeholder="Player name"
                        aria-label="New player name"
                        .value="${this._addName}"
                        @input="${this._onAddNameInput}"
                        @keydown="${this._addPlayerKeydown}" />
                      <button class="sm" @click="${this._addPlayer}">Add</button>
                    </div>
                  </fieldset>

                  <div class="delete-team-section">
                    <button class="delete-team-btn" @click="${this._requestDeleteTeam}">Delete team</button>
                    <button class="export-btn" @click="${this._exportRoster}" ?disabled="${this.roster.length === 0}">Export roster</button>
                  </div>
                ` : html`
                  ${this.roster.length === 0 ? html`
                    <div class="empty-warning"><span class="warning-icon">&#9888;</span> No players added yet. <a href="#" class="edit-link" @click="${(e: Event) => { e.preventDefault(); this._editMode = true; }}">Edit roster</a></div>
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
              `}
            </div>
            ${this.teams.length > 0 ? html`
              <div class="roster-dialog-footer">
                <button @click="${this._closeRoster}">Done</button>
              </div>
            ` : nothing}
      </dialog>

      <dialog id="settings-dialog" class="settings-dialog" @close="${() => this._settingsOpen = false}">
            <div class="roster-dialog-header">
              <h2>Settings</h2>
              <button class="roster-dialog-close" @click="${this._closeSettings}" aria-label="Close" title="Close">
                <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </button>
            </div>
            <div class="roster-dialog-body">
              <label class="settings-row">
                Show on-field time:
                <span class="slide-toggle">
                  <input type="checkbox"
                         .checked="${this.showOnFieldTime}"
                         @change="${this._onOnFieldTimeToggle}" />
                  <span class="slide-track"></span>
                  <span class="slide-thumb">${this.showOnFieldTime ? 'On' : 'Off'}</span>
                </span>
              </label>
              <label class="settings-row">
                Show bench time:
                <span class="slide-toggle">
                  <input type="checkbox"
                         .checked="${this.showBenchTime}"
                         @change="${this._onBenchTimeToggle}" />
                  <span class="slide-track"></span>
                  <span class="slide-thumb">${this.showBenchTime ? 'On' : 'Off'}</span>
                </span>
              </label>
              <label class="settings-row">
                Larger time display:
                <span class="slide-toggle">
                  <input type="checkbox"
                         .checked="${this.largeTimeDisplay}"
                         @change="${this._onLargeTimeDisplayToggle}" />
                  <span class="slide-track"></span>
                  <span class="slide-thumb">${this.largeTimeDisplay ? 'On' : 'Off'}</span>
                </span>
              </label>
              <div class="how-to-use">
                <h3 class="how-to-heading">How to use</h3>
                <ol class="onboarding-list">
                  <li>
                    <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg"><path d="M1250.75 484.752L1150 585.501V790.128L1350 650.128L1250.75 484.752Z" fill="currentColor"/><path d="M450 585.499L349.251 484.75L250 650.123L450 790.123V585.499Z" fill="currentColor"/><path d="M500 575.125V1275.13H1100V575.125C1100 568.5 1102.63 562.125 1107.31 557.437L1224.25 440.5L1210 416.688C1203.62 406.001 1193.44 398.063 1181.5 394.5L950.059 325.063L947.497 330.125C925.059 375 884.871 410.188 835.871 421.063C761.371 437.625 687.991 400.937 655.311 335.563L650.061 325L418.621 394.437C406.684 398 396.496 405.937 390.121 416.625L375.871 440.437L492.808 557.375C497.495 562.062 500.121 568.437 500.121 575.063L500 575.125ZM950 575.125C977.625 575.125 1000 597.5 1000 625.125C1000 652.751 977.625 675.125 950 675.125C922.375 675.125 900 652.751 900 625.125C900 597.5 922.375 575.125 950 575.125ZM600 1125.13H700V1175.13H600V1125.13Z" fill="currentColor"/></svg>
                    Edit your team
                  </li>
                  <li>
                    <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg"><path d="M1438.88 1189.92C1442.57 1159.36 1436.19 1131.65 1419.73 1106.8C1401.26 1079.93 1364.65 1058.43 1309.9 1042.31C1254.82 1025.85 1218.54 1009.73 1201.08 993.943C1183.28 978.49 1176.22 960.188 1179.92 939.027C1197.38 927.272 1209.64 912.157 1216.69 893.683C1267.08 908.464 1308.22 901.412 1340.13 872.527C1316.62 848.678 1303.52 819.288 1300.83 784.361C1298.81 729.612 1293.77 681.081 1285.71 638.761C1277.65 596.105 1262.7 561.511 1240.88 534.977C1220.05 509.785 1192.85 493.831 1159.26 487.112C1157.24 486.779 1155.23 486.44 1153.21 486.107H1152.2C1104.51 481.737 1070.25 490.305 1049.43 511.799C1037.33 506.424 1025.58 502.898 1014.16 501.221C1012.14 500.883 1009.96 500.716 1007.61 500.716C982.418 498.362 958.402 505.081 935.564 520.867C911.382 543.372 894.924 570.075 886.195 600.971C877.461 632.543 870.575 672.345 865.539 720.373L859.997 812.065C855.627 836.246 842.362 856.736 820.195 873.528C856.133 900.398 896.939 903.924 942.62 884.106C952.021 908.294 966.631 925.924 986.449 937.007C989.475 959.845 982.589 977.814 965.793 990.918C948.662 1004.02 891.564 1029.88 794.498 1068.5C760.571 1085.3 740.087 1104.94 733.03 1127.45C725.644 1149.62 722.785 1170.44 724.467 1189.92L1438.88 1189.92Z" fill="currentColor"/><path d="M932.921 1148.58C927.885 1123.06 918.478 1103.41 904.708 1089.63C887.577 1069.82 822.421 1038.08 709.228 994.416C672.957 977.619 654.816 958.479 654.816 936.979L653.305 912.296C682.191 882.739 701.503 848.812 711.243 810.525C726.357 804.145 735.592 791.213 738.951 771.728C758.096 733.103 754.737 706.739 728.878 692.635C749.028 623.78 746.68 572.389 721.825 538.475L638.19 425.115C638.19 443.588 634.158 450.979 626.101 447.281C630.465 435.865 630.465 427.636 626.101 422.599C620.726 435.359 611.825 442.749 599.398 444.765L610.482 426.625C603.43 437.042 592.679 442.412 578.236 442.751C574.205 437.714 575.382 429.985 581.762 419.573C574.038 424.276 567.486 430.323 562.117 437.713C554.388 436.37 551.534 427.969 553.549 412.52C547.169 419.911 540.45 427.968 533.399 436.703C519.961 435.697 519.461 426.796 531.888 410C516.773 413.698 508.205 421.255 506.191 432.672C500.821 429.313 497.628 422.427 496.623 412.016C479.826 433.177 458.664 454.839 433.139 477.011L380.743 524.871C358.915 548.381 348.503 578.444 349.508 615.053C350.514 651.329 355.389 677.189 364.118 692.641C338.591 709.1 334.732 735.797 352.529 772.745C356.56 794.24 366.3 805.828 381.753 807.505C392.837 848.484 413.155 883.417 442.712 912.303C445.738 945.215 433.477 969.063 405.936 983.839C387.463 993.917 365.967 1003.32 341.447 1012.05L273.936 1039.26C227.587 1060.08 197.191 1080.07 182.748 1099.21C164.275 1126.75 157.055 1156.98 161.081 1189.9H932.415C935.441 1175.79 935.607 1162.02 932.92 1148.59L932.921 1148.58Z" fill="currentColor"/></svg>
                    Add players to your team
                  </li>
                  <li>
                    <svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="92" height="72" rx="8" fill="none" stroke="currentColor" stroke-width="6"/><polyline points="38,34 50,46 62,34" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    Set your formation
                  </li>
                  <li>
                    <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m713.7 816.12-212.88-86.832v-252.07c0-34.789-12.336-66.191-34.523-88.223-23.902-24.07-53.762-36.793-86.375-36.793-70.391 0-129.86 57.254-129.86 125.02v316.37c-70.008-58.246-88.246-58.234-98.93-58.234-36.504 0-71.074 15.707-94.848 43.094-42.973 49.488-39.562 125.32 7.6797 172.56l211.82 213.07c7.8945 7.9453 18.285 11.93 28.68 11.93 10.309 0 20.629-3.9258 28.512-11.762 15.84-15.758 15.91-41.352 0.16797-57.203l-211.92-213.16c-17.137-17.137-18.887-45.133-3.8867-62.41 7.2344-8.3281 17.352-13.609 28.344-14.914 17.977 9.9961 65.941 49.547 103.3 83.605 14.484 13.883 34.246 18 51.887 10.691 18.551-7.6797 30.086-25.957 30.086-47.699v-385.94c0-23.102 23.34-44.125 48.973-44.125 11.027 0 20.23 4.1055 29.172 13.094 8.9531 8.8906 10.836 21.781 10.836 31.031v306.45l263.14 107.33c26.473 10.871 44.258 35.953 44.258 62.398v180.23c0 22.344 18.109 40.441 40.441 40.441s40.441-18.109 40.441-40.441l-0.007812-180.23c0-58.883-37.941-114.04-94.5-137.27z" fill="currentColor"/><path d="m187.04 633.77c18.77-12.109 24.156-37.141 12.047-55.906-21.637-33.516-33.07-72.434-33.07-112.55 0-114.59 93.227-207.82 207.82-207.82 114.6 0 207.82 93.227 207.82 207.82 0 40.117-11.438 79.031-33.07 112.55-12.109 18.77-6.7188 43.801 12.047 55.906 6.7812 4.3789 14.375 6.4805 21.898 6.4805 13.273 0 26.281-6.5273 34.02-18.516 30.098-46.621 46.008-100.71 46.008-156.42 0-159.19-129.52-288.71-288.71-288.71s-288.71 129.52-288.71 288.71c0 55.703 15.91 109.8 46.008 156.42 12.094 18.754 37.129 24.164 55.895 12.035z" fill="currentColor"/><path d="m1092.6 156.41-0.70703 166.69c-0.097656 22.344 17.941 40.523 40.273 40.621h0.16797c22.262 0 40.344-18 40.441-40.273l1.0195-242.39c0.14062-31.211-25.156-56.82-56.68-57.059h-244.61c-22.344 0-40.441 18.109-40.441 40.441 0 22.332 18.109 40.441 40.441 40.441h157.96l-259.16 259.16c-15.793 15.793-15.793 41.398 0 57.191 7.8945 7.8945 18.254 11.844 28.609 11.844 10.344 0 20.699-3.9492 28.598-11.844l260.82-260.82c1.2461-1.2461 2.2188-2.6367 3.2734-4.0078zm0.21484-51.516-0.011719 2.5938c-0.67187-0.88672-1.3672-1.7539-2.1133-2.5938z" fill="currentColor"/></svg>
                    Drag to swap players and subs
                  </li>
                  <li>
                    <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m789.6 570-277.2-184.8c-24-15.602-55.199 1.1992-55.199 30v369.6c0 28.801 32.398 45.602 55.199 30l277.2-184.8c21.602-14.398 21.602-45.602 0.003906-60z" fill="currentColor"/><path d="m600 30c-314.4 0-570 255.6-570 570s255.6 570 570 570 570-255.6 570-570-255.6-570-570-570zm0 1051.2c-265.2 0-481.2-216-481.2-481.2s216-481.2 481.2-481.2 481.2 216 481.2 481.2-216 481.2-481.2 481.2z" fill="currentColor"/></svg>
                    Start the game
                  </li>
                  <li>
                    <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="M600,360c-182.4,0-330,147.6-330,330s147.6,330,330,330,330-147.6,330-330-147.6-330-330-330ZM642.48,732.32l-84.86-84.85,179.89-179.91,84.86,84.85-179.89,179.91Z" fill="none"/><path d="M1005.41,861.21c22.95-54.24,34.59-111.84,34.59-171.21,0-54.49-9.89-107.68-29.38-158.11-18.82-48.68-45.99-93.33-80.76-132.72-70.31-79.64-166.63-131.37-271.21-145.66l-8.65-1.18v-82.33h60v-100h-220v100h60v82.33l-8.65,1.18c-104.58,14.29-200.9,66.02-271.21,145.66-34.77,39.39-61.94,84.04-80.76,132.72-19.5,50.43-29.38,103.63-29.38,158.11,0,59.37,11.64,116.97,34.59,171.21,22.17,52.39,53.91,99.45,94.33,139.87,40.42,40.42,87.48,72.16,139.87,94.33,54.24,22.95,111.84,34.59,171.21,34.59s116.97-11.64,171.21-34.59c52.39-22.17,99.45-53.91,139.87-94.33s72.16-87.48,94.33-139.87ZM732.41,1003.3c-41.93,17.72-86.47,26.7-132.41,26.7s-90.48-8.98-132.41-26.7c-40.5-17.11-76.85-41.62-108.07-72.83-31.21-31.21-55.71-67.57-72.83-108.07-17.72-41.93-26.7-86.47-26.7-132.41s8.98-90.48,26.7-132.41c17.11-40.5,41.62-76.85,72.83-108.07s67.57-55.71,108.07-72.83c41.93-17.72,86.47-26.7,132.41-26.7s90.48,8.98,132.41,26.7c40.5,17.11,76.85,41.62,108.07,72.83,31.21,31.21,55.71,67.57,72.83,108.07,17.72,41.93,26.7,86.47,26.7,132.41s-8.98,90.48-26.7,132.41c-17.11,40.5-41.62,76.85-72.83,108.07s-67.57,55.71-108.07,72.83Z" fill="currentColor"/><path d="M353.41,121.15c-35.19,15.26-68.81,33.54-100.06,54.41-31.69,21.17-61.25,45.22-87.97,71.58l70.95,69.95c44.09-43.39,96.17-78.33,155.05-104.02l-37.97-91.92Z" fill="currentColor"/><path d="M942.79,173.04c-30.17-19.94-62.49-37.37-96.19-51.91l-37.97,91.92c56.53,24.5,106.93,57.84,150.05,99.23l69.9-70.9c-26.79-25.44-55.61-48.39-85.79-68.34Z" fill="currentColor"/><rect x="572.78" y="549.94" width="234.42" height="100.01" transform="translate(-222.12 663.67) rotate(-45)" fill="currentColor"/></svg>
                    Check players' times
                  </li>
                </ol>
                <p class="how-to-tip"><strong>Tip:</strong> change formations to reset player positions on the field.</p>
              </div>
              <div class="settings-branding">
                <span class="branding-title">
                  <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" class="branding-icon"><path d="m660 243.6v-63.602h60v-120h-240v120h60v63.602c-219.6 30-390 218.4-390 446.4 0 248.4 201.6 450 450 450s450-201.6 450-450c0-228-170.4-416.4-390-446.4zm-60 776.4c-182.4 0-330-147.6-330-330s147.6-330 330-330 330 147.6 330 330-147.6 330-330 330z" fill="currentColor"/><path d="m151.2 247.2 85.199 84c48-49.199 104.4-86.398 168-112.8l-45.598-110.4c-78 32.398-148.8 79.199-207.6 139.2z" fill="currentColor"/><path d="m1042.8 241.2c-58.801-57.598-126-102-201.6-133.2l-45.602 110.4c61.199 25.199 116.4 61.199 163.2 108z" fill="currentColor"/><path d="m642.48 732.32-84.863-84.852 179.89-179.91 84.863 84.852z" fill="currentColor"/></svg>
                  PlayingTime by Mark Caron
                </span>
                <span class="branding-version">Version 1.2.0-beta</span>
                <span class="branding-license">CC BY-NC-SA 4.0</span>
              </div>
            </div>
            <div class="roster-dialog-footer">
              <button @click="${this._closeSettings}">Done</button>
            </div>
      </dialog>

      <dialog id="confirm-dialog" class="confirm-dialog">
        <div class="roster-dialog-header">
          <h2>Delete team</h2>
          <button class="roster-dialog-close" @click="${this._cancelConfirm}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="roster-dialog-body">
          <p>Delete "${this.teamName || 'Untitled'}"? This cannot be undone.</p>
          <div class="confirm-actions">
            <button class="cancel-btn" @click="${this._cancelConfirm}">Cancel</button>
            <button class="confirm-yes" @click="${this._confirmDeleteTeam}">Delete</button>
          </div>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-settings-bar': PtSettingsBar;
  }
}
