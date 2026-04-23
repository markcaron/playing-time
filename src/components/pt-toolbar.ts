import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { RosterEntry, FormationKey, GameFormat, StoredTeam } from '../lib/types.js';
import { FORMATIONS_BY_FORMAT, getStandardHalfLength } from '../lib/types.js';

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

export class TimeFormatChangedEvent extends Event {
  static readonly eventName = 'time-format-changed' as const;
  constructor(public timeDisplayFormat: 'mm:ss' | 'mm') {
    super(TimeFormatChangedEvent.eventName, { bubbles: true, composed: true });
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

export class NavigateSettingsEvent extends Event {
  static readonly eventName = 'navigate-settings' as const;
  constructor() {
    super(NavigateSettingsEvent.eventName, { bubbles: true, composed: true });
  }
}

export class EditLineupRequestEvent extends Event {
  static readonly eventName = 'edit-lineup-request' as const;
  constructor() {
    super(EditLineupRequestEvent.eventName, { bubbles: true, composed: true });
  }
}

export class AttendanceChangedEvent extends Event {
  static readonly eventName = 'attendance-changed' as const;
  constructor(public absentIds: Set<string>) {
    super(AttendanceChangedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class NavigateTeamEvent extends Event {
  static readonly eventName = 'navigate-team' as const;
  constructor() {
    super(NavigateTeamEvent.eventName, { bubbles: true, composed: true });
  }
}

export class OpponentChangedEvent extends Event {
  static readonly eventName = 'opponent-changed' as const;
  constructor(public opponentName: string, public matchType: 'vs' | '@') {
    super(OpponentChangedEvent.eventName, { bubbles: true, composed: true });
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
      padding: calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 8px calc(12px + env(safe-area-inset-left));
      background: var(--pt-bg-primary);
      user-select: none;
      box-shadow: 0 2px 6px var(--pt-shadow);
      z-index: 1;
    }

    .roster-btn {
      max-width: 200px;
      margin-right: 4px;
    }

    .edit-lineup-btn {
    }

    .roster-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    .phase-label {
      font-size: 0.85rem;
      font-weight: normal;
      color: var(--pt-text-muted);
      flex-shrink: 0;
    }

    .team-name-label {
      margin: 0;
      font-size: 0.85rem;
      font-weight: normal;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      margin-right: 4px;
    }

    .match-type-wrap {
      flex-shrink: 0;
    }

    .match-type-select {
      appearance: none;
      -webkit-appearance: none;
      padding: 4px 22px 4px 8px;
      min-height: 36px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.8rem;
      cursor: pointer;
      flex-shrink: 0;
    }

    .match-label {
      font-size: 0.85rem;
      font-weight: bold;
      color: inherit;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .opponent-input {
      padding: 4px 8px;
      min-height: 36px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.8rem;
      flex: 1;
      min-width: 60px;
      max-width: 140px;
    }

    .opponent-input::placeholder {
      color: var(--pt-text-muted);
    }

    .opponent-input:focus,
    .match-type-select:focus {
      outline: none;
      border-color: var(--pt-accent);
    }

    .roster-badge {
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 9px;
      background: var(--pt-accent);
      color: var(--pt-text-white);
      font-size: 0.65rem;
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
      height: fit-content;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px var(--pt-shadow-lg);
      color: var(--pt-text);
    }

    dialog::backdrop {
      background: var(--pt-backdrop);
    }

    dialog.settings-dialog {
      max-width: 360px;
    }

    .roster-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--pt-border-subtle);
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

    .roster-dialog-close:hover { color: var(--pt-text); }

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
      border-top: 1px solid var(--pt-border-subtle);
      flex-shrink: 0;
    }

    .roster-dialog-footer button {
      padding: 8px 24px;
      background: var(--pt-accent-solid);
      border: none;
      color: var(--pt-accent-solid-text);
      font-weight: bold;
    }

    .roster-dialog-footer button:hover {
      background: var(--pt-accent-solid-hover);
    }

    .edit-lineup-btn svg {
      width: 24px;
      height: 24px;
    }

    .settings-btn svg {
      width: 21px;
      height: 21px;
    }

    .settings-btn {
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
      color: var(--pt-accent);
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
      border-bottom: 1px solid var(--pt-border-subtle);
    }

    .roster-table td {
      padding: 5px 8px 5px 0;
      color: var(--pt-text);
      border-bottom: 1px solid var(--pt-border-subtle);
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
      border: 2px dashed var(--pt-border);
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
      background: var(--pt-hover-overlay);
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

    .section-separator {
      border-top: 1px solid var(--pt-border-subtle);
      padding-top: 10px;
      margin-top: 2px;
      margin-bottom: 10px;
    }

    .delete-team-section {
      border-top: 1px solid var(--pt-border-subtle);
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
      border: 1px solid var(--pt-border-on-white);
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
      border-top: 1px solid var(--pt-border-subtle);
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
      border-top: 1px solid var(--pt-border-subtle);
      font-size: 0.75rem;
      color: var(--pt-text-muted);
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
      border: 1px solid var(--pt-border);
      border-radius: 6px;
      background: var(--pt-bg-surface);
      color: var(--pt-text);
      cursor: pointer;
    }

    button.add-team-btn-lg:hover { background: var(--pt-btn-hover); }

    button.add-team-btn {
      padding: 6px 14px;
      font-size: 0.85rem;
      border: 1px solid var(--pt-border);
      white-space: nowrap;
      margin-left: auto;
    }

    .team-fields-row {
      display: flex;
      gap: 10px;
      align-items: flex-end;
      border-top: 1px solid var(--pt-border-subtle);
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
      border-top: 1px solid var(--pt-border-subtle);
      padding-top: 16px;
      margin-top: 2px;
      border-bottom: 1px solid var(--pt-border-subtle);
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
      background: var(--pt-hover-overlay);
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

  @property({ type: String }) formation: FormationKey = '1-4-3-3';
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
  @property({ type: String }) matchPhase: 'plan' | 'game' = 'plan';
  @property({ type: Boolean }) half1Started = false;
  @property({ type: Boolean }) half2Started = false;
  @property({ type: String }) opponentName = '';
  @property({ type: String }) matchType: 'vs' | '@' = 'vs';
  @property({ type: Boolean }) largeTimeDisplay = false;


  private _openRoster() { this.dispatchEvent(new NavigateTeamEvent()); }
  private _openSettings() { this.dispatchEvent(new NavigateSettingsEvent()); }
  private _onEditLineup() { this.dispatchEvent(new EditLineupRequestEvent()); }

  private _onMatchTypeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as 'vs' | '@';
    this.dispatchEvent(new OpponentChangedEvent(this.opponentName, val));
  }

  private _onOpponentInput(e: InputEvent) {
    const val = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new OpponentChangedEvent(val, this.matchType));
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


  render() {
    return html`
      <div class="settings-bar">
        ${this.matchPhase === 'game' ? html`
          <button class="roster-btn"
                  @click="${this._openRoster}"
                  aria-label="Back to Team"
                  title="Back to Team">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="roster-icon"><polyline points="15,4 7,12 15,20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        ` : nothing}
        <h2 class="team-name-label">${this.matchPhase === 'plan' ? html`<span class="phase-label">Plan:</span> ` : nothing}<strong>${this.teamName || 'Team'}</strong>${this.matchPhase === 'game' && this.opponentName ? html` <span class="match-label">${this.matchType} ${this.opponentName}</span>` : nothing}</h2>
        ${this.matchPhase === 'plan' ? html`
          <span class="select-wrap match-type-wrap">
            <select class="match-type-select"
                    aria-label="Match type"
                    .value="${this.matchType}"
                    @change="${this._onMatchTypeChange}">
              <option value="vs" ?selected="${this.matchType === 'vs'}">vs</option>
              <option value="@" ?selected="${this.matchType === '@'}">@</option>
            </select>
            <span class="caret"></span>
          </span>
          <input class="opponent-input"
                 type="text"
                 placeholder="Opponent"
                 aria-label="Opponent name"
                 .value="${this.opponentName}"
                 @input="${this._onOpponentInput}" />
        ` : nothing}
        <span class="spacer"></span>
        <button class="settings-btn"
                @click="${this._openSettings}"
                aria-label="Settings"
                title="Settings">
          <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m1050 549.98h-159.42c-20.859-59.859-77.297-99.984-140.68-99.984-63.422 0-119.86 40.125-140.68 99.984h-459.24c-27.609 0-50.016 22.406-50.016 50.016s22.406 50.016 50.016 50.016h459.24c20.812 59.859 77.25 99.984 140.68 99.984 63.375 0 119.86-40.125 140.68-99.984h159.42c27.609 0 50.016-22.406 50.016-50.016s-22.406-50.016-50.016-50.016zm-300 99.984v0.046875c-20.203 0-38.438-12.188-46.172-30.891-7.7812-18.656-3.4688-40.172 10.828-54.469s35.812-18.609 54.469-10.828c18.703 7.7344 30.891 25.969 30.891 46.172-0.046875 27.609-22.406 49.969-50.016 50.016z" fill="currentColor"/><path d="m150 300h150c2.9531-0.32812 5.8594-0.89062 8.6719-1.7344 20.25 60.422 76.688 101.34 140.44 101.72 63.75 0.42188 120.71-39.797 141.66-99.984h459.24c27.609 0 50.016-22.406 50.016-50.016s-22.406-49.969-50.016-49.969h-459.24c-20.953-60.234-77.906-100.41-141.66-100.03-63.75 0.42188-120.19 41.297-140.44 101.77-2.8125-0.84375-5.7188-1.4531-8.6719-1.7344h-150c-27.609 0-50.016 22.359-50.016 49.969s22.406 50.016 50.016 50.016zm300-99.984c20.203 0 38.438 12.188 46.172 30.844 7.7812 18.703 3.4688 40.219-10.828 54.516s-35.812 18.562-54.469 10.828c-18.703-7.7344-30.891-25.969-30.891-46.219 0.046875-27.609 22.406-49.969 50.016-49.969z" fill="currentColor"/><path d="m150 999.98h150c2.9531-0.28125 5.8594-0.89062 8.6719-1.7344 20.25 60.469 76.688 101.34 140.44 101.77 63.75 0.375 120.71-39.797 141.66-100.03h459.24c27.609 0 50.016-22.359 50.016-49.969s-22.406-50.016-50.016-50.016h-459.24c-20.953-60.188-77.906-100.41-141.66-99.984-63.75 0.375-120.19 41.297-140.44 101.72-2.8125-0.84375-5.7188-1.4062-8.6719-1.7344h-150c-27.609 0-50.016 22.406-50.016 50.016s22.406 49.969 50.016 49.969zm300-99.984c20.203 0 38.438 12.188 46.172 30.844 7.7812 18.703 3.4688 40.219-10.828 54.516s-35.812 18.562-54.469 10.828c-18.703-7.7344-30.891-25.969-30.891-46.172 0.046875-27.609 22.406-49.969 50.016-50.016z" fill="currentColor"/></svg>
        </button>
      </div>

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-settings-bar': PtSettingsBar;
  }
}
