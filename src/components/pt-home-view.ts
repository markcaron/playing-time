import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { StoredTeam, GameFormat } from '../lib/types.js';
import { parseRosterWithMeta } from '../lib/roster-parser.js';
import type { ParsedRoster } from '../lib/roster-parser.js';

export class TeamSelectedEvent extends Event {
  static readonly eventName = 'team-selected' as const;
  readonly teamId: string;
  constructor(teamId: string) {
    super(TeamSelectedEvent.eventName, { bubbles: true, composed: true });
    this.teamId = teamId;
  }
}

export class NavigateSettingsFromHomeEvent extends Event {
  static readonly eventName = 'navigate-settings' as const;
  constructor() {
    super(NavigateSettingsFromHomeEvent.eventName, { bubbles: true, composed: true });
  }
}

export class ImportExampleEvent extends Event {
  static readonly eventName = 'import-example' as const;
  constructor(public parsed: ParsedRoster) {
    super(ImportExampleEvent.eventName, { bubbles: true, composed: true });
  }
}

export class NavigateEditTeamEvent extends Event {
  static readonly eventName = 'navigate-edit-team' as const;
  constructor() {
    super(NavigateEditTeamEvent.eventName, { bubbles: true, composed: true });
  }
}

@customElement('pt-home-view')
export class PtHomeView extends LitElement {
  static styles = css`
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

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
      user-select: none;
    }

    .brand-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--pt-text);
    }

    .header h1 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .section-heading {
      margin: 0 16px 8px;
      font-size: 0.85rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .spacer { flex: 1; }

    .add-icon {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .settings-btn,
    .add-btn {
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

    .settings-btn:hover,
    .add-btn:hover {
      background: var(--pt-btn-hover);
    }

    .settings-btn svg {
      width: 21px;
      height: 21px;
    }

    .settings-btn:focus-visible,
    .add-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .home-body {
      flex: 1;
      overflow-y: auto;
      padding-top: 32px;
      -webkit-overflow-scrolling: touch;
    }

    .team-tile {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      margin: 10px 16px;
      border: 1px solid var(--pt-border-subtle);
      border-radius: 10px;
      background: var(--pt-bg-primary);
      box-shadow: 0 2px 6px var(--pt-shadow);
      color: var(--pt-text);
      cursor: pointer;
      font: inherit;
      text-align: left;
      width: calc(100% - 32px);
      transition: background 0.15s, box-shadow 0.15s;
      min-height: 44px;
    }

    .team-tile:hover {
      background: var(--pt-btn-hover);
      box-shadow: 0 4px 12px var(--pt-shadow-lg);
    }

    .team-tile:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: -2px;
    }

    .tile-jersey {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      color: var(--pt-text);
      align-self: flex-start;
    }

    .tile-info {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .tile-name {
      font-size: 0.9rem;
      font-weight: bold;
    }

    .tile-meta {
      font-size: 0.75rem;
      color: var(--pt-text-muted);
    }

    .tile-chevron {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      color: var(--pt-text-muted);
    }

    .add-team-bottom {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px 16px;
    }

    .example-link {
      font-size: 0.8rem;
      color: var(--pt-text-muted);
      text-decoration: underline;
      cursor: pointer;
    }

    .example-link:hover {
      color: var(--pt-accent);
    }

    .add-team-accent {
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

    .add-team-accent:hover {
      background: var(--pt-accent-solid-hover);
    }

    .add-team-accent:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 32px 16px;
      color: var(--pt-text-muted);
      font-size: 0.85rem;
    }
  `;

  @property({ type: Array }) teams: StoredTeam[] = [];
  @property({ type: String }) activeTeamId: string | null = null;

  private _onTeamClick(teamId: string) {
    this.dispatchEvent(new TeamSelectedEvent(teamId));
  }

  private _onSettings() {
    this.dispatchEvent(new NavigateSettingsFromHomeEvent());
  }

  private _onAddTeam() {
    this.dispatchEvent(new NavigateEditTeamEvent());
  }

  private async _onTryExample(e: Event) {
    e.preventDefault();
    try {
      const res = await fetch('/examples/uswnt.md');
      const text = await res.text();
      const parsed = parseRosterWithMeta(text);
      this.dispatchEvent(new ImportExampleEvent(parsed));
    } catch { /* silently fail */ }
  }

  render() {
    return html`
      <div class="header">
        <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" class="brand-icon"><path d="m660 243.6v-63.602h60v-120h-240v120h60v63.602c-219.6 30-390 218.4-390 446.4 0 248.4 201.6 450 450 450s450-201.6 450-450c0-228-170.4-416.4-390-446.4zm-60 776.4c-182.4 0-330-147.6-330-330s147.6-330 330-330 330 147.6 330 330-147.6 330-330 330z" fill="currentColor"/><path d="m151.2 247.2 85.199 84c48-49.199 104.4-86.398 168-112.8l-45.598-110.4c-78 32.398-148.8 79.199-207.6 139.2z" fill="currentColor"/><path d="m1042.8 241.2c-58.801-57.598-126-102-201.6-133.2l-45.602 110.4c61.199 25.199 116.4 61.199 163.2 108z" fill="currentColor"/><path d="m642.48 732.32-84.863-84.852 179.89-179.91 84.863 84.852z" fill="currentColor"/></svg>
        <h1>PlayingTime</h1>
        <span class="spacer"></span>
        <button class="settings-btn" @click="${this._onSettings}" aria-label="Settings" title="Settings">
          <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m1050 549.98h-159.42c-20.859-59.859-77.297-99.984-140.68-99.984-63.422 0-119.86 40.125-140.68 99.984h-459.24c-27.609 0-50.016 22.406-50.016 50.016s22.406 50.016 50.016 50.016h459.24c20.812 59.859 77.25 99.984 140.68 99.984 63.375 0 119.86-40.125 140.68-99.984h159.42c27.609 0 50.016-22.406 50.016-50.016s-22.406-50.016-50.016-50.016zm-300 99.984v0.046875c-20.203 0-38.438-12.188-46.172-30.891-7.7812-18.656-3.4688-40.172 10.828-54.469s35.812-18.609 54.469-10.828c18.703 7.7344 30.891 25.969 30.891 46.172-0.046875 27.609-22.406 49.969-50.016 50.016z" fill="currentColor"/><path d="m150 300h150c2.9531-0.32812 5.8594-0.89062 8.6719-1.7344 20.25 60.422 76.688 101.34 140.44 101.72 63.75 0.42188 120.71-39.797 141.66-99.984h459.24c27.609 0 50.016-22.406 50.016-50.016s-22.406-49.969-50.016-49.969h-459.24c-20.953-60.234-77.906-100.41-141.66-100.03-63.75 0.42188-120.19 41.297-140.44 101.77-2.8125-0.84375-5.7188-1.4531-8.6719-1.7344h-150c-27.609 0-50.016 22.359-50.016 49.969s22.406 50.016 50.016 50.016zm300-99.984c20.203 0 38.438 12.188 46.172 30.844 7.7812 18.703 3.4688 40.219-10.828 54.516s-35.812 18.562-54.469 10.828c-18.703-7.7344-30.891-25.969-30.891-46.219 0.046875-27.609 22.406-49.969 50.016-49.969z" fill="currentColor"/><path d="m150 999.98h150c2.9531-0.28125 5.8594-0.89062 8.6719-1.7344 20.25 60.469 76.688 101.34 140.44 101.77 63.75 0.375 120.71-39.797 141.66-100.03h459.24c27.609 0 50.016-22.359 50.016-49.969s-22.406-50.016-50.016-50.016h-459.24c-20.953-60.188-77.906-100.41-141.66-99.984-63.75 0.375-120.19 41.297-140.44 101.72-2.8125-0.84375-5.7188-1.4062-8.6719-1.7344h-150c-27.609 0-50.016 22.406-50.016 50.016s22.406 49.969 50.016 49.969zm300-99.984c20.203 0 38.438 12.188 46.172 30.844 7.7812 18.703 3.4688 40.219-10.828 54.516s-35.812 18.562-54.469 10.828c-18.703-7.7344-30.891-25.969-30.891-46.172 0.046875-27.609 22.406-49.969 50.016-50.016z" fill="currentColor"/></svg>
        </button>
        <button class="add-btn" @click="${this._onAddTeam}" aria-label="Add Team" title="Add Team"><svg class="add-icon" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m600 99.984c275.95 0 500.02 224.06 500.02 500.02s-224.06 500.02-500.02 500.02-500.02-224.06-500.02-500.02 224.06-500.02 500.02-500.02zm0 100.03c-220.78 0-399.98 179.26-399.98 399.98 0 220.78 179.26 399.98 399.98 399.98 220.78 0 399.98-179.26 399.98-399.98 0-220.78-179.26-399.98-399.98-399.98zm-50.016 450h-150c-27.609 0-49.969-22.406-49.969-50.016s22.406-50.016 49.969-50.016h150v-150c0-27.609 22.406-49.969 50.016-49.969s50.016 22.406 50.016 49.969v150h150c27.609 0 49.969 22.406 49.969 50.016s-22.406 50.016-49.969 50.016h-150v150c0 27.609-22.406 49.969-50.016 49.969s-50.016-22.406-50.016-49.969z" fill-rule="evenodd" fill="currentColor"/></svg> Add Team</button>
      </div>

      <div class="home-body">
        <h2 class="section-heading">My Teams</h2>
        ${this.teams.length === 0
          ? html`
            <div class="empty-state">
              <span>No teams yet</span>
              <button class="add-btn" @click="${this._onAddTeam}"><svg class="add-icon" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m600 99.984c275.95 0 500.02 224.06 500.02 500.02s-224.06 500.02-500.02 500.02-500.02-224.06-500.02-500.02 224.06-500.02 500.02-500.02zm0 100.03c-220.78 0-399.98 179.26-399.98 399.98 0 220.78 179.26 399.98 399.98 399.98 220.78 0 399.98-179.26 399.98-399.98 0-220.78-179.26-399.98-399.98-399.98zm-50.016 450h-150c-27.609 0-49.969-22.406-49.969-50.016s22.406-50.016 49.969-50.016h150v-150c0-27.609 22.406-49.969 50.016-49.969s50.016 22.406 50.016 49.969v150h150c27.609 0 49.969 22.406 49.969 50.016s-22.406 50.016-49.969 50.016h-150v150c0 27.609-22.406 49.969-50.016 49.969s-50.016-22.406-50.016-49.969z" fill-rule="evenodd" fill="currentColor"/></svg> Add Team</button>
            </div>
          `
          : html`
            ${this.teams.map(t => html`
              <button class="team-tile" @click="${() => this._onTeamClick(t.id)}">
                <svg class="tile-jersey" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m443.34 117.56-238.13 100.22c-32.812 13.828-57.609 41.766-67.406 75.984l-80.859 282.56c-1.4062 5.0156-0.70312 10.406 2.0156 14.906 2.7188 4.4531 7.2188 7.5938 12.375 8.625l202.78 40.641v424.69c0 10.312 8.3906 18.75 18.75 18.75h614.21c10.359 0 18.75-8.4375 18.75-18.75v-424.69l202.82-40.641c5.1562-1.0312 9.6094-4.1719 12.375-8.625 2.6719-4.5 3.4219-9.8906 1.9688-14.906 0 0-55.031-192.52-80.859-282.56-9.7969-34.219-34.547-62.156-67.359-75.984l-238.18-100.22c-8.8594-3.75-19.125-0.1875-23.766 8.2969-25.594 47.062-75.516 79.078-132.84 79.078s-107.3-32.016-132.89-79.078c-4.5938-8.4844-14.859-12.047-23.766-8.2969zm444.98 631.13h-576.71v297.74h576.71zm0-37.5v-230.34h-576.71v230.34zm-789.71-144.1 175.5 35.156v-42.422l-163.6-34.266zm990.84-41.531-163.64 34.266v42.422l175.55-35.156zm-815.34-296.11-54.375 22.922c-22.359 9.375-39.188 28.406-45.844 51.703 0 0-30.891 107.77-53.062 185.34l153.28 32.109zm651.71 0v292.08l153.32-32.109-53.062-185.34c-6.6562-23.297-23.531-42.328-45.844-51.703zm-98.109-41.297c-45.984 77.859-130.82 130.08-227.72 130.08-96.898 0-181.74-52.219-227.76-130.08l-60.609 25.547v229.64h576.71v-229.64l-19.734-8.3438zm-34.875-14.719c-21.469-9-35.859-15.047-35.859-15.047-33.844 50.672-91.547 84.047-156.98 84.047-65.484 0-123.19-33.375-157.03-84.047l-35.812 15.047c40.078 64.406 111.52 107.3 192.84 107.3 81.324 0 152.72-42.891 192.84-107.3z" fill-rule="evenodd" fill="currentColor"/></svg>
                <div class="tile-info">
                  <span class="tile-name">${t.teamName || 'Untitled'}</span>
                  <span class="tile-meta">${t.gameFormat} &middot; ${t.halfLength} min halves &middot; ${t.players.length} player${t.players.length !== 1 ? 's' : ''}</span>
                </div>
                <svg class="tile-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="9,4 17,12 9,20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            `)}
            <div class="add-team-bottom">
              <button class="add-team-accent" @click="${this._onAddTeam}"><svg class="add-icon" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m600 99.984c275.95 0 500.02 224.06 500.02 500.02s-224.06 500.02-500.02 500.02-500.02-224.06-500.02-500.02 224.06-500.02 500.02-500.02zm0 100.03c-220.78 0-399.98 179.26-399.98 399.98 0 220.78 179.26 399.98 399.98 399.98 220.78 0 399.98-179.26 399.98-399.98 0-220.78-179.26-399.98-399.98-399.98zm-50.016 450h-150c-27.609 0-49.969-22.406-49.969-50.016s22.406-50.016 49.969-50.016h150v-150c0-27.609 22.406-49.969 50.016-49.969s50.016 22.406 50.016 49.969v150h150c27.609 0 49.969 22.406 49.969 50.016s-22.406 50.016-49.969 50.016h-150v150c0 27.609-22.406 49.969-50.016 49.969s-50.016-22.406-50.016-49.969z" fill-rule="evenodd" fill="currentColor"/></svg> Add Team</button>
              <a href="#" class="example-link" @click="${this._onTryExample}">Try with USWNT roster</a>
            </div>
          `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-home-view': PtHomeView;
  }
}
