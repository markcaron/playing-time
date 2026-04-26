import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { RosterEntry, GameEvent, TimeDisplayFormat, Position } from '../lib/types.js';
import { formatTime } from '../lib/types.js';

export class NavigateStatsBackEvent extends Event {
  static readonly eventName = 'navigate-stats-back' as const;
  constructor() {
    super(NavigateStatsBackEvent.eventName, { bubbles: true, composed: true });
  }
}

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

    .stats-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      -webkit-overflow-scrolling: touch;
    }

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
      font-size: 0.7rem;
      white-space: pre-line;
      color: var(--pt-text-muted);
    }

    h3 {
      font-size: 0.85rem;
      margin: 24px 0 8px;
      color: var(--pt-text);
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
  `;

  @property({ type: String }) teamName = '';
  @property({ type: Array }) roster: RosterEntry[] = [];
  @property({ type: Array }) gameEvents: GameEvent[] = [];
  @property({ type: String }) timeDisplayFormat: TimeDisplayFormat = 'mm:ss';

  private _onBack() {
    this.dispatchEvent(new NavigateStatsBackEvent());
  }

  private _renderPositionCell(p: RosterEntry) {
    if (!p.positionTimes) return '';
    const entries = Object.entries(p.positionTimes)
      .filter(([, time]) => time != null && time > 0) as [Position, number][];
    if (entries.length === 0) return '';
    return entries.map(([pos, time]) => `${formatTime(time, this.timeDisplayFormat)} (${pos})`).join('\n');
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

      <div class="stats-body">
        <table class="times-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>1st</th>
              <th>2nd</th>
              <th>Total</th>
              <th>Bench</th>
              <th>Position</th>
            </tr>
          </thead>
          <tbody>
            ${this.roster.map(p => html`
              <tr>
                <td>${p.number}</td>
                <td>${p.nickname || p.name}</td>
                <td>${formatTime(p.half1Time, this.timeDisplayFormat)}</td>
                <td>${formatTime(p.half2Time, this.timeDisplayFormat)}</td>
                <td class="total">${formatTime(p.half1Time + p.half2Time, this.timeDisplayFormat)}</td>
                <td>${formatTime(p.benchTime, this.timeDisplayFormat)}</td>
                <td class="position-col">${this._renderPositionCell(p)}</td>
              </tr>
            `)}
          </tbody>
        </table>

        ${this.gameEvents.length > 0 ? html`
          <h3>Substitutions & Swaps</h3>
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
                  <td>${ev.playerA} ↔ ${ev.playerB}</td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-stats-view': PtStatsView;
  }
}
