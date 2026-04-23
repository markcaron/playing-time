import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { RosterEntry, FormationKey, GameFormat, StoredTeam, StoredGamePlan } from '../lib/types.js';
import { FORMATIONS_BY_FORMAT } from '../lib/types.js';

function formationLabel(key: FormationKey, format: GameFormat): string {
  const entry = FORMATIONS_BY_FORMAT[format]?.find(f => f.key === key);
  return entry?.label ?? key;
}

function sortRoster(roster: RosterEntry[], order: 'alpha' | 'number'): RosterEntry[] {
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

export class NavigateBackEvent extends Event {
  static readonly eventName = 'navigate-back' as const;
  constructor() {
    super(NavigateBackEvent.eventName, { bubbles: true, composed: true });
  }
}

export class NavigateNextEvent extends Event {
  static readonly eventName = 'navigate-next' as const;
  constructor() {
    super(NavigateNextEvent.eventName, { bubbles: true, composed: true });
  }
}

export class NavigateSettingsFromTeamEvent extends Event {
  static readonly eventName = 'navigate-settings' as const;
  constructor() {
    super(NavigateSettingsFromTeamEvent.eventName, { bubbles: true, composed: true });
  }
}

export class NavigateEditEvent extends Event {
  static readonly eventName = 'navigate-edit' as const;
  constructor() {
    super(NavigateEditEvent.eventName, { bubbles: true, composed: true });
  }
}

export class GamePlanSelectedEvent extends Event {
  static readonly eventName = 'game-plan-selected' as const;
  constructor(public planId: string) {
    super(GamePlanSelectedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class CreateGamePlanEvent extends Event {
  static readonly eventName = 'create-game-plan' as const;
  constructor() {
    super(CreateGamePlanEvent.eventName, { bubbles: true, composed: true });
  }
}

@customElement('pt-team-view')
export class PtTeamView extends LitElement {
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
      z-index: 2;
      user-select: none;
    }

    .header h1 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--pt-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }

    .spacer { flex: 1; }

    .back-btn {
      background: transparent;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      color: var(--pt-text);
      cursor: pointer;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      min-height: 44px;
      font: inherit;
      font-size: 0.85rem;
      gap: 6px;
      margin-right: 4px;
    }

    .back-btn:hover { background: var(--pt-btn-hover); }

    .settings-btn {
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
      transition: background 0.15s;
    }

    .settings-btn:hover { background: var(--pt-btn-hover); }

    .settings-btn svg {
      width: 21px;
      height: 21px;
    }

    .settings-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .back-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .back-btn svg {
      width: 18px;
      height: 18px;
    }

    /* ── Hero area ────────────────────────────────── */

    .hero {
      background: var(--pt-hero-bg);
      padding: 24px 16px;
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .hero-info {
      flex: 1;
      min-width: 0;
    }

    .hero h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: bold;
      color: var(--pt-hero-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .hero-meta {
      margin-top: 6px;
      font-size: 0.8rem;
      color: var(--pt-hero-text);
      opacity: 0.7;
    }

    .edit-btn {
      background: transparent;
      border: 1px solid var(--pt-hero-text);
      border-radius: 6px;
      color: var(--pt-hero-text);
      cursor: pointer;
      padding: 6px 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.15s;
      min-height: 44px;
      font: inherit;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .edit-btn:hover { opacity: 0.8; }

    .edit-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .edit-btn svg {
      width: 22px;
      height: 22px;
    }

    /* ── Tabs ─────────────────────────────────────── */

    [role="tablist"] {
      display: flex;
      border-bottom: 2px solid var(--pt-border-subtle);
      flex-shrink: 0;
      padding: 0 16px;
      gap: 0;
    }

    [role="tab"] {
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      padding: 12px 16px;
      font: inherit;
      font-size: 0.85rem;
      font-weight: bold;
      color: var(--pt-text-muted);
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
      min-height: 44px;
    }

    [role="tab"]:hover {
      color: var(--pt-text);
    }

    [role="tab"][aria-selected="true"] {
      color: var(--pt-accent);
      border-bottom-color: var(--pt-accent);
    }

    [role="tab"]:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: -2px;
    }

    [role="tabpanel"] {
      flex: 1;
      overflow-y: auto;
      padding: 24px 16px 20px;
      -webkit-overflow-scrolling: touch;
    }

    [role="tabpanel"][hidden] {
      display: none;
    }

    /* ── Roster panel content ─────────────────────── */

    .panel-heading {
      margin: 0 0 8px 0;
      font-size: 0.9rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .panel-desc {
      margin: 0 0 16px 0;
      font-size: 0.8rem;
      color: var(--pt-text-muted);
      line-height: 1.4;
    }

    .roster-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
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

    .roster-table td.pos-col {
      color: var(--pt-text-muted);
      font-size: 0.8rem;
      white-space: nowrap;
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

    .empty-warning--plans {
      margin-top: 16px;
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

    .edit-link:hover { opacity: 0.7; }

    .plan-tile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      margin-bottom: 10px;
      border: 1px solid var(--pt-border-subtle);
      border-radius: 10px;
      background: var(--pt-bg-primary);
      box-shadow: 0 2px 6px var(--pt-shadow);
      color: var(--pt-text);
      cursor: pointer;
      font: inherit;
      text-align: left;
      width: 100%;
      transition: background 0.15s, box-shadow 0.15s;
      min-height: 44px;
    }

    .plan-tile:hover {
      background: var(--pt-btn-hover);
      box-shadow: 0 4px 12px var(--pt-shadow-lg);
    }

    .plan-tile:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: -2px;
    }

    .plan-icon {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      color: var(--pt-text);
      align-self: flex-start;
    }

    .plan-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }

    .plan-name {
      font-size: 0.9rem;
      font-weight: bold;
    }

    .plan-meta {
      font-size: 0.75rem;
      color: var(--pt-text-muted);
    }

    .plan-chevron {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--pt-text-muted);
    }

    .add-plan-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px 0;
    }

    .add-plan-accent {
      padding: 8px 24px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: var(--pt-accent-solid);
      border: none;
      color: var(--pt-accent-solid-text);
      font-weight: bold;
      border-radius: 6px;
      min-height: 44px;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      transition: background 0.15s;
    }

    .add-plan-accent:hover { background: var(--pt-accent-solid-hover); }

    .add-plan-accent:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .add-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .empty-plans {
      color: var(--pt-text-muted);
      font-size: 0.85rem;
      text-align: center;
      padding: 16px 0;
    }

    /* ── Footer ───────────────────────────────────── */

    .team-footer {
      display: flex;
      justify-content: flex-end;
      padding: 10px calc(12px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));
      background: var(--pt-bg-primary);
      box-shadow: 0 -2px 6px var(--pt-shadow);
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .next-btn {
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
      transition: background 0.15s;
    }

    .next-btn:hover { background: var(--pt-accent-solid-hover); }

    .next-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }
  `;

  @property({ type: String }) teamName = '';
  @property({ type: Array }) roster: RosterEntry[] = [];
  @property({ type: String }) rosterSort: 'alpha' | 'number' = 'alpha';
  @property({ type: String }) gameFormat: GameFormat = '11v11';
  @property({ type: String }) formation: FormationKey = '1-4-3-3';
  @property({ type: Number }) halfLength = 45;
  @property({ type: Array }) teams: StoredTeam[] = [];
  @property({ type: String }) activeTeamId: string | null = null;
  @property({ type: Array }) gamePlans: StoredGamePlan[] = [];

  @state() private _activeTab: 'roster' | 'plans' = 'plans';

  private _navigateBack() {
    this.dispatchEvent(new NavigateBackEvent());
  }

  private _navigateNext() {
    this.dispatchEvent(new NavigateNextEvent());
  }

  private _navigateEdit() {
    this.dispatchEvent(new NavigateEditEvent());
  }

  private _navigateSettings() {
    this.dispatchEvent(new NavigateSettingsFromTeamEvent());
  }

  private _selectPlan(planId: string) {
    this.dispatchEvent(new GamePlanSelectedEvent(planId));
  }

  private _createPlan() {
    this.dispatchEvent(new CreateGamePlanEvent());
  }

  private _selectTab(tab: 'roster' | 'plans') {
    this._activeTab = tab;
  }

  private _onTabKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      this._activeTab = this._activeTab === 'roster' ? 'plans' : 'roster';
      const next = this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement;
      next?.focus();
    }
  }

  render() {
    return html`
      <div class="header">
        <button class="back-btn" @click="${this._navigateBack}" aria-label="Back" title="Back">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="15,4 7,12 15,20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h1>Team</h1>
        <span class="spacer"></span>
        <button class="settings-btn" @click="${this._navigateSettings}" aria-label="Settings" title="Settings">
          <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m1050 549.98h-159.42c-20.859-59.859-77.297-99.984-140.68-99.984-63.422 0-119.86 40.125-140.68 99.984h-459.24c-27.609 0-50.016 22.406-50.016 50.016s22.406 50.016 50.016 50.016h459.24c20.812 59.859 77.25 99.984 140.68 99.984 63.375 0 119.86-40.125 140.68-99.984h159.42c27.609 0 50.016-22.406 50.016-50.016s-22.406-50.016-50.016-50.016zm-300 99.984v0.046875c-20.203 0-38.438-12.188-46.172-30.891-7.7812-18.656-3.4688-40.172 10.828-54.469s35.812-18.609 54.469-10.828c18.703 7.7344 30.891 25.969 30.891 46.172-0.046875 27.609-22.406 49.969-50.016 50.016z" fill="currentColor"/><path d="m150 300h150c2.9531-0.32812 5.8594-0.89062 8.6719-1.7344 20.25 60.422 76.688 101.34 140.44 101.72 63.75 0.42188 120.71-39.797 141.66-99.984h459.24c27.609 0 50.016-22.406 50.016-50.016s-22.406-49.969-50.016-49.969h-459.24c-20.953-60.234-77.906-100.41-141.66-100.03-63.75 0.42188-120.19 41.297-140.44 101.77-2.8125-0.84375-5.7188-1.4531-8.6719-1.7344h-150c-27.609 0-50.016 22.359-50.016 49.969s22.406 50.016 50.016 50.016zm300-99.984c20.203 0 38.438 12.188 46.172 30.844 7.7812 18.703 3.4688 40.219-10.828 54.516s-35.812 18.562-54.469 10.828c-18.703-7.7344-30.891-25.969-30.891-46.219 0.046875-27.609 22.406-49.969 50.016-49.969z" fill="currentColor"/><path d="m150 999.98h150c2.9531-0.28125 5.8594-0.89062 8.6719-1.7344 20.25 60.469 76.688 101.34 140.44 101.77 63.75 0.375 120.71-39.797 141.66-100.03h459.24c27.609 0 50.016-22.359 50.016-49.969s-22.406-50.016-50.016-50.016h-459.24c-20.953-60.188-77.906-100.41-141.66-99.984-63.75 0.375-120.19 41.297-140.44 101.72-2.8125-0.84375-5.7188-1.4062-8.6719-1.7344h-150c-27.609 0-50.016 22.406-50.016 50.016s22.406 49.969 50.016 49.969zm300-99.984c20.203 0 38.438 12.188 46.172 30.844 7.7812 18.703 3.4688 40.219-10.828 54.516s-35.812 18.562-54.469 10.828c-18.703-7.7344-30.891-25.969-30.891-46.172 0.046875-27.609 22.406-49.969 50.016-50.016z" fill="currentColor"/></svg>
        </button>
      </div>

      <div class="hero">
        <div class="hero-info">
          <h2>${this.teamName || 'Untitled'}</h2>
          <div class="hero-meta">${this.gameFormat} &middot; ${this.halfLength} min halves &middot; ${this.roster.length} player${this.roster.length !== 1 ? 's' : ''}</div>
        </div>
        <button class="edit-btn" @click="${this._navigateEdit}" aria-label="Edit Team" title="Edit Team">
          <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m751.21 316.68c-14.977 0-29.969 5.6602-41.281 16.973l-17.441 17.441c-6.3828 6.3867-9.9727 15.047-9.9766 24.074 0 9.0312 3.582 17.695 9.9648 24.082l108.3 108.42h-0.003907c6.3828 6.3906 15.039 9.9805 24.066 9.9883 9.0273 0.003906 17.691-3.5781 24.078-9.957l17.566-17.547c22.625-22.625 22.625-60.078 0-82.703l-73.984-73.801c-11.312-11.312-26.305-16.973-41.281-16.973zm-131.75 107.39-244.17 244.04c-26.129 26.129-43.371 59.723-49.445 96.172l-8.3477 50.738c-6.5156 39.094 28.527 74.137 67.621 67.617l50.508-8.3945c36.449-6.0781 70.043-23.5 96.172-49.629l244.26-244.13h-0.003906c4.0977-4.1016 6.4023-9.6602 6.4023-15.461 0-5.7969-2.3086-11.359-6.4102-15.457l-125.64-125.5c-4.1055-4.1016-9.6719-6.4023-15.473-6.4023-5.8047 0-11.367 2.3047-15.473 6.4062z" fill="currentColor"/></svg>
          Edit
        </button>
      </div>

      <div role="tablist" aria-label="Team sections" @keydown="${this._onTabKeydown}">
        <button role="tab"
                id="tab-plans"
                aria-selected="${this._activeTab === 'plans'}"
                aria-controls="panel-plans"
                tabindex="${this._activeTab === 'plans' ? 0 : -1}"
                @click="${() => this._selectTab('plans')}">Matches</button>
        <button role="tab"
                id="tab-roster"
                aria-selected="${this._activeTab === 'roster'}"
                aria-controls="panel-roster"
                tabindex="${this._activeTab === 'roster' ? 0 : -1}"
                @click="${() => this._selectTab('roster')}">Roster</button>
      </div>

      <div role="tabpanel"
           id="panel-plans"
           aria-labelledby="tab-plans"
           ?hidden="${this._activeTab !== 'plans'}">
        <h3 class="panel-heading">Matches</h3>
        <p class="panel-desc">Creating a match allows you to plan lineups and substitutions.</p>
        ${this.roster.length === 0 ? html`
          <div class="empty-warning empty-warning--plans"><span class="warning-icon">&#9888;</span> You must add players before you can create matches. <a href="#" class="edit-link" @click="${(e: Event) => { e.preventDefault(); this._navigateEdit(); }}">Edit Roster</a></div>
        ` : html`
          ${this.gamePlans.length === 0 ? html`
            <p class="empty-plans">No matches yet.</p>
          ` : this.gamePlans.map(plan => html`
            <button class="plan-tile" @click="${() => this._selectPlan(plan.id)}">
              <svg class="plan-icon" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m1025 1175h-850c-13.801 0-25-11.25-25-25v-1100c0-13.75 11.199-25 25-25h850c13.75 0 25 11.25 25 25v1100c0 13.75-11.25 25-25 25zm-825-50h800v-1050h-800z" fill="currentColor"/><path d="m775 225h-350c-13.801 0-25-11.25-25-25v-150c0-13.75 11.199-25 25-25h350c13.75 0 25 11.25 25 25v150c0 13.75-11.25 25-25 25zm-325-50h300v-100h-300z" fill="currentColor"/><path d="m775 1175h-350c-13.801 0-25-11.25-25-25v-150c0-13.75 11.199-25 25-25h350c13.75 0 25 11.25 25 25v150c0 13.75-11.25 25-25 25zm-325-50h300v-100h-300z" fill="currentColor"/><path d="m200 575h800v50h-800z" fill="currentColor"/><path d="m600 795.3c-107.7 0-195.3-87.602-195.3-195.3s87.602-195.3 195.3-195.3 195.3 87.602 195.3 195.3-87.602 195.3-195.3 195.3zm0-340.6c-80.148 0-145.3 65.301-145.3 145.3s65.199 145.3 145.3 145.3 145.3-65.301 145.3-145.3-65.102-145.3-145.3-145.3z" fill="currentColor"/></svg>
              <div class="plan-info">
                <span class="plan-name">${plan.matchType ?? 'vs'} ${plan.opponentName || 'Opponent'}</span>
                <span class="plan-meta">${formationLabel(plan.formation, this.gameFormat)}</span>
              </div>
              <svg class="plan-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><polyline points="9,4 17,12 9,20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          `)}
          <div class="add-plan-bottom">
            <button class="add-plan-accent" @click="${this._createPlan}"><svg class="add-icon" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m600 99.984c275.95 0 500.02 224.06 500.02 500.02s-224.06 500.02-500.02 500.02-500.02-224.06-500.02-500.02 224.06-500.02 500.02-500.02zm0 100.03c-220.78 0-399.98 179.26-399.98 399.98 0 220.78 179.26 399.98 399.98 399.98 220.78 0 399.98-179.26 399.98-399.98 0-220.78-179.26-399.98-399.98-399.98zm-50.016 450h-150c-27.609 0-49.969-22.406-49.969-50.016s22.406-50.016 49.969-50.016h150v-150c0-27.609 22.406-49.969 50.016-49.969s50.016 22.406 50.016 49.969v150h150c27.609 0 49.969 22.406 49.969 50.016s-22.406 50.016-49.969 50.016h-150v150c0 27.609-22.406 49.969-50.016 49.969s-50.016-22.406-50.016-49.969z" fill-rule="evenodd" fill="currentColor"/></svg> Create Match</button>
          </div>
        `}
      </div>

      <div role="tabpanel"
           id="panel-roster"
           aria-labelledby="tab-roster"
           ?hidden="${this._activeTab !== 'roster'}">
        <h3 class="panel-heading">Roster</h3>
        ${this.roster.length === 0 ? html`
          <div class="empty-warning"><span class="warning-icon">&#9888;</span> No players added yet. <a href="#" class="edit-link" @click="${(e: Event) => { e.preventDefault(); this._navigateEdit(); }}">Edit Roster</a></div>
        ` : html`
          <table class="roster-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Positions</th>
              </tr>
            </thead>
            <tbody>
              ${sortRoster(this.roster, this.rosterSort).map(p => html`
                <tr>
                  <td class="jersey-col">${p.number}</td>
                  <td>${p.nickname ? html`${p.name} <span class="pos-col">(${p.nickname})</span>` : p.name}</td>
                  <td class="pos-col">${p.primaryPos ?? ''}${p.secondaryPos ? html` / ${p.secondaryPos}` : nothing}</td>
                </tr>
              `)}
            </tbody>
          </table>
        `}
      </div>

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-team-view': PtTeamView;
  }
}
