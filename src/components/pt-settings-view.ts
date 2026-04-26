import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  BenchTimeToggleEvent,
  OnFieldTimeToggleEvent,
  LargeTimeDisplayEvent,
  TimeFormatChangedEvent,
  RosterSortChangedEvent,
} from './pt-toolbar.js';

export class NavigateSettingsBackEvent extends Event {
  static readonly eventName = 'navigate-settings-back' as const;
  constructor() {
    super(NavigateSettingsBackEvent.eventName, { bubbles: true, composed: true });
  }
}

@customElement('pt-settings-view')
export class PtSettingsView extends LitElement {
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

    .header h1 {
      margin: 0;
      font-size: 0.95rem;
      font-weight: bold;
      color: var(--pt-text);
    }

    .settings-body {
      flex: 1;
      overflow-y: auto;
      padding: 32px 16px 20px;
      -webkit-overflow-scrolling: touch;
      display: flex;
      flex-direction: column;
    }

    .settings-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .settings-row label {
      white-space: nowrap;
    }

    .slide-toggle {
      order: -1;
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
      border: 1px solid var(--pt-text-muted);
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
      border: 1px solid var(--pt-text-muted);
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

    .settings-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .settings-preview {
      display: flex;
      justify-content: center;
      padding: 16px;
      margin-bottom: 16px;
    }

    .settings-branding {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-top: auto;
      padding-top: 32px;
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

    .settings-footer {
      display: flex;
      justify-content: flex-end;
      padding: 8px calc(12px + env(safe-area-inset-right)) calc(8px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));
      background: var(--pt-bg-primary);
      box-shadow: 0 -2px 6px var(--pt-shadow);
      flex-shrink: 0;
      z-index: 1;
      position: relative;
    }

    .settings-footer button {
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

    .settings-footer button:hover {
      background: var(--pt-accent-solid-hover);
    }

    .settings-footer button:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }
  `;

  @property({ type: Boolean }) showOnFieldTime = true;
  @property({ type: Boolean }) showBenchTime = true;
  @property({ type: Boolean }) largeTimeDisplay = false;
  @property({ type: String }) timeDisplayFormat: 'mm:ss' | 'mm' | 'm' = 'mm:ss';
  @property({ type: String }) rosterSort: 'alpha' | 'number' = 'alpha';
  @property({ type: String }) playerDisplayMode: 'number' | 'position' = 'number';

  @state() private _colorScheme: 'system' | 'light' | 'dark' = 'system';

  connectedCallback() {
    super.connectedCallback();
    const saved = localStorage.getItem('pt-color-scheme');
    if (saved === 'light' || saved === 'dark') this._colorScheme = saved;
    else this._colorScheme = 'system';
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

  private _onTimeFormatChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as 'mm:ss' | 'mm' | 'm';
    this.dispatchEvent(new TimeFormatChangedEvent(val));
  }

  private _onRosterSortChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as 'alpha' | 'number';
    this.dispatchEvent(new RosterSortChangedEvent(val));
  }

  private _onColorSchemeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as 'system' | 'light' | 'dark';
    this._colorScheme = val;
    if (val === 'system') {
      document.documentElement.style.colorScheme = '';
      localStorage.removeItem('pt-color-scheme');
    } else {
      document.documentElement.style.colorScheme = val;
      localStorage.setItem('pt-color-scheme', val);
    }
    const light = val === 'light' || (val === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#ffffff' : '#16213e');
  }

  private _onPlayerLabelChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.dispatchEvent(new CustomEvent('display-mode-changed', {
      detail: { mode: val },
      bubbles: true,
      composed: true,
    }));
  }

  private _onDone() {
    this.dispatchEvent(new NavigateSettingsBackEvent());
  }

  render() {
    return html`
      <div class="header">
        <h1>Settings</h1>
        <span class="spacer"></span>
        <button class="close-btn" @click="${this._onDone}" aria-label="Close" title="Close">
          <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>

      <div class="settings-body">
        <div class="settings-options">
        <label class="settings-row">
          Show on-field time
          <span class="slide-toggle">
            <input type="checkbox"
                   .checked="${this.showOnFieldTime}"
                   @change="${this._onOnFieldTimeToggle}" />
            <span class="slide-track"></span>
            <span class="slide-thumb">${this.showOnFieldTime ? 'On' : 'Off'}</span>
          </span>
        </label>
        <label class="settings-row">
          Show bench time
          <span class="slide-toggle">
            <input type="checkbox"
                   .checked="${this.showBenchTime}"
                   @change="${this._onBenchTimeToggle}" />
            <span class="slide-track"></span>
            <span class="slide-thumb">${this.showBenchTime ? 'On' : 'Off'}</span>
          </span>
        </label>
        <label class="settings-row">
          Larger time display
          <span class="slide-toggle">
            <input type="checkbox"
                   .checked="${this.largeTimeDisplay}"
                   @change="${this._onLargeTimeDisplayToggle}" />
            <span class="slide-track"></span>
            <span class="slide-thumb">${this.largeTimeDisplay ? 'On' : 'Off'}</span>
          </span>
        </label>
        <div class="settings-row">
          <label for="time-format-select">Player timer format</label>
          <span class="select-wrap">
            <select id="time-format-select"
                    .value="${this.timeDisplayFormat}"
                    @change="${this._onTimeFormatChange}">
              <option value="mm:ss" ?selected="${this.timeDisplayFormat === 'mm:ss'}">Minutes & seconds (mm:ss)</option>
              <option value="mm" ?selected="${this.timeDisplayFormat === 'mm'}">Minutes only (mm)</option>
              <option value="m" ?selected="${this.timeDisplayFormat === 'm'}">Minutes short (m)</option>
            </select>
            <span class="caret"></span>
          </span>
        </div>
        <div class="settings-row">
          <label for="roster-sort-select">Roster sort</label>
          <span class="select-wrap">
            <select id="roster-sort-select"
                    .value="${this.rosterSort}"
                    @change="${this._onRosterSortChange}">
              <option value="alpha" ?selected="${this.rosterSort === 'alpha'}">Alphabetically</option>
              <option value="number" ?selected="${this.rosterSort === 'number'}">Jersey number</option>
            </select>
            <span class="caret"></span>
          </span>
        </div>
        <div class="settings-row">
          <label for="color-scheme-select">Appearance</label>
          <span class="select-wrap">
            <select id="color-scheme-select"
                    .value="${this._colorScheme}"
                    @change="${this._onColorSchemeChange}">
              <option value="system" ?selected="${this._colorScheme === 'system'}">System</option>
              <option value="light" ?selected="${this._colorScheme === 'light'}">Light</option>
              <option value="dark" ?selected="${this._colorScheme === 'dark'}">Dark</option>
            </select>
            <span class="caret"></span>
          </span>
        </div>
        <div class="settings-row">
          <label for="player-label-select">Player label</label>
          <span class="select-wrap">
            <select id="player-label-select"
                    .value="${this.playerDisplayMode}"
                    @change="${this._onPlayerLabelChange}">
              <option value="number" ?selected="${this.playerDisplayMode === 'number'}">Jersey number</option>
              <option value="position" ?selected="${this.playerDisplayMode === 'position'}">Field position</option>
            </select>
            <span class="caret"></span>
          </span>
        </div>
        </div>

        <div class="settings-preview">
          <svg viewBox="0 0 68 80" xmlns="http://www.w3.org/2000/svg" width="68" height="80">
            <circle cx="34" cy="30" r="16" fill="var(--pt-accent-solid)" />
            <text class="player-label" x="34" y="34" text-anchor="middle" font-size="12" font-weight="bold" fill="var(--pt-accent-solid-text)">${this.playerDisplayMode === 'position' ? 'CM' : '10'}</text>
            ${this.showOnFieldTime ? html`<text class="player-time" x="34" y="60" text-anchor="middle" font-size="10" fill="var(--pt-text)">12:34</text>` : ''}
          </svg>
        </div>

        <div class="settings-branding">
          <span class="branding-title">
            <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg" class="branding-icon"><path d="m660 243.6v-63.602h60v-120h-240v120h60v63.602c-219.6 30-390 218.4-390 446.4 0 248.4 201.6 450 450 450s450-201.6 450-450c0-228-170.4-416.4-390-446.4zm-60 776.4c-182.4 0-330-147.6-330-330s147.6-330 330-330 330 147.6 330 330-147.6 330-330 330z" fill="currentColor"/><path d="m151.2 247.2 85.199 84c48-49.199 104.4-86.398 168-112.8l-45.598-110.4c-78 32.398-148.8 79.199-207.6 139.2z" fill="currentColor"/><path d="m1042.8 241.2c-58.801-57.598-126-102-201.6-133.2l-45.602 110.4c61.199 25.199 116.4 61.199 163.2 108z" fill="currentColor"/><path d="m642.48 732.32-84.863-84.852 179.89-179.91 84.863 84.852z" fill="currentColor"/></svg>
            PlayingTime by Mark Caron
          </span>
          <span class="branding-version">Version 2.0.1-beta</span>
          <span class="branding-license">CC BY-NC-SA 4.0</span>
        </div>
      </div>

      <div class="settings-footer">
        <button @click="${this._onDone}">Done</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-settings-view': PtSettingsView;
  }
}
