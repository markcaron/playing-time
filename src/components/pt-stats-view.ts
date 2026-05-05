import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { RosterEntry, GameEvent, TimeDisplayFormat, Position } from '../lib/types.js';
import { formatTime } from '../lib/types.js';

export class NavigateStatsBackEvent extends Event {
  static readonly eventName = 'navigate-stats-back' as const;
  constructor() {
    super(NavigateStatsBackEvent.eventName, { bubbles: true, composed: true });
  }
}

type StatsTab = 'totals' | 'halves' | 'positions' | 'subs';

const TABS: { id: StatsTab; label: string }[] = [
  { id: 'totals', label: 'Totals' },
  { id: 'halves', label: 'Halves' },
  { id: 'positions', label: 'Positions' },
  { id: 'subs', label: 'Subs' },
];

@customElement('pt-stats-view')
export class PtStatsView extends LitElement {
  static styles = css`
    *, *::before, *::after { box-sizing: border-box; }

    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--pt-bg-body);
      font-family: system-ui, -apple-system, sans-serif;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: calc(8px + env(safe-area-inset-top)) calc(12px + env(safe-area-inset-right)) 8px calc(12px + env(safe-area-inset-left));
      background: var(--pt-bg-primary);
      box-shadow: 0 2px 6px var(--pt-shadow);
      flex-shrink: 0;
      z-index: 1;
    }

    .header h2 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .spacer { flex: 1; }

    .back-btn {
      background: transparent;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      color: var(--pt-text);
      cursor: pointer;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      min-height: 44px;
      transition: background 0.15s;
    }

    .back-btn:hover { background: var(--pt-btn-hover); }
    .back-btn:focus-visible { outline: 2px solid var(--pt-accent); outline-offset: 2px; }
    .back-btn svg { width: 14px; height: 14px; }

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
      padding: 16px;
      -webkit-overflow-scrolling: touch;
    }

    [role="tabpanel"][hidden] {
      display: none;
    }

    /* ── Tables ───────────────────────────────────── */

    .times-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .times-table th {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 2px solid var(--pt-border-subtle);
      font-size: 0.75rem;
      color: var(--pt-text-muted);
      white-space: nowrap;
    }

    .times-table td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--pt-border-subtle);
      vertical-align: top;
    }

    .total { font-weight: bold; }

    .position-col {
      line-height: 1.8;
    }

    .position-tag {
      display: inline-block;
      background: var(--pt-bg-primary, #f0f0f0);
      border: 1px solid var(--pt-border-subtle, #ccc);
      border-radius: 4px;
      padding: 2px 6px;
      margin: 2px;
      font-size: 0.8rem;
      white-space: nowrap;
    }

    .events-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }

    .events-table th {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 2px solid var(--pt-border-subtle);
      font-size: 0.75rem;
      color: var(--pt-text-muted);
    }

    .events-table td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--pt-border-subtle);
    }

    .sub-arrows {
      display: inline;
      font-weight: bold;
      white-space: nowrap;
    }

    .sub-arrow-down {
      color: var(--pt-danger-light);
      margin: 0 0.2em;
    }

    .sub-arrow-up {
      color: var(--pt-success);
      margin: 0 0.2em;
    }
  `;

  @property({ type: String }) teamName = '';
  @property({ type: Array }) roster: RosterEntry[] = [];
  @property({ type: Array }) gameEvents: GameEvent[] = [];
  @property({ type: String }) timeDisplayFormat: TimeDisplayFormat = 'mm:ss';

  @state() private _activeTab: StatsTab = 'totals';

  private _onBack() {
    this.dispatchEvent(new NavigateStatsBackEvent());
  }

  private _selectTab(tab: StatsTab) {
    this._activeTab = tab;
  }

  private _onTabKeydown(e: KeyboardEvent) {
    const currentIndex = TABS.findIndex(t => t.id === this._activeTab);
    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (currentIndex + 1) % TABS.length;
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = (currentIndex - 1 + TABS.length) % TABS.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = TABS.length - 1;
        break;
      default:
        return;
    }

    this._activeTab = TABS[newIndex].id;
    const next = this.shadowRoot?.querySelector(`[role="tab"][aria-selected="true"]`) as HTMLElement;
    next?.focus();
  }

  private _renderPositionTags(p: RosterEntry) {
    if (!p.positionTimes) return nothing;
    const entries = Object.entries(p.positionTimes)
      .filter(([, time]) => time != null && time > 0) as [Position, number][];
    if (entries.length === 0) return nothing;
    return entries.map(([pos, time]) =>
      html`<span class="position-tag">${formatTime(time, this.timeDisplayFormat)} (${pos})</span>`
    );
  }

  /** Sub: playerB leaves field (↓), playerA enters (↑). Swap: symmetric ↔. */
  private _renderEventPlayers(ev: GameEvent) {
    if (ev.type === 'swap') {
      return html`${ev.playerA} ↔ ${ev.playerB}`;
    }
    return html`${ev.playerB} <span class="sub-arrows" aria-hidden="true"><span class="sub-arrow-down">↓</span><span class="sub-arrow-up">↑</span></span> ${ev.playerA}`;
  }

  render() {
    return html`
      <div class="header">
        <h2>${this.teamName} — Times & Stats</h2>
        <span class="spacer"></span>
        <button class="back-btn" @click="${this._onBack}" aria-label="Back" title="Back">
          <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>

      <div role="tablist" aria-label="Stats sections" @keydown="${this._onTabKeydown}">
        ${TABS.map(tab => html`
          <button role="tab"
                  id="stats-tab-${tab.id}"
                  aria-selected="${this._activeTab === tab.id}"
                  aria-controls="stats-panel-${tab.id}"
                  tabindex="${this._activeTab === tab.id ? 0 : -1}"
                  @click="${() => this._selectTab(tab.id)}">${tab.label}</button>
        `)}
      </div>

      <!-- Totals panel -->
      <div role="tabpanel"
           id="stats-panel-totals"
           aria-labelledby="stats-tab-totals"
           tabindex="0"
           ?hidden="${this._activeTab !== 'totals'}">
        <table class="times-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Total</th>
              <th>Bench</th>
            </tr>
          </thead>
          <tbody>
            ${this.roster.map(p => html`
              <tr>
                <td>${p.number}</td>
                <td>${p.nickname || p.name}</td>
                <td class="total">${formatTime(p.half1Time + p.half2Time, this.timeDisplayFormat)}</td>
                <td>${formatTime(p.benchTime, this.timeDisplayFormat)}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      <!-- Halves panel -->
      <div role="tabpanel"
           id="stats-panel-halves"
           aria-labelledby="stats-tab-halves"
           tabindex="0"
           ?hidden="${this._activeTab !== 'halves'}">
        <table class="times-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>1st</th>
              <th>2nd</th>
            </tr>
          </thead>
          <tbody>
            ${this.roster.map(p => html`
              <tr>
                <td>${p.number}</td>
                <td>${p.nickname || p.name}</td>
                <td>${formatTime(p.half1Time, this.timeDisplayFormat)}</td>
                <td>${formatTime(p.half2Time, this.timeDisplayFormat)}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      <!-- Positions panel -->
      <div role="tabpanel"
           id="stats-panel-positions"
           aria-labelledby="stats-tab-positions"
           tabindex="0"
           ?hidden="${this._activeTab !== 'positions'}">
        <table class="times-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Positions</th>
            </tr>
          </thead>
          <tbody>
            ${this.roster.map(p => html`
              <tr>
                <td>${p.number}</td>
                <td>${p.nickname || p.name}</td>
                <td class="position-col">${this._renderPositionTags(p)}</td>
              </tr>
            `)}
          </tbody>
        </table>
      </div>

      <!-- Subs panel -->
      <div role="tabpanel"
           id="stats-panel-subs"
           aria-labelledby="stats-tab-subs"
           tabindex="0"
           ?hidden="${this._activeTab !== 'subs'}">
        ${this.gameEvents.length > 0 ? html`
          <table class="events-table">
            <thead>
              <tr>
                <th>Half</th>
                <th>Time</th>
                <th>Type</th>
                <th>Players</th>
              </tr>
            </thead>
            <tbody>
              ${this.gameEvents.map(ev => html`
                <tr>
                  <td>${ev.half === 1 ? '1st' : '2nd'}</td>
                  <td>${formatTime(ev.elapsed, 'mm:ss')}</td>
                  <td>${ev.type === 'sub' ? 'Sub' : 'Swap'}</td>
                  <td>${this._renderEventPlayers(ev)}</td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : html`<p>No substitutions or swaps recorded.</p>`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-stats-view': PtStatsView;
  }
}
