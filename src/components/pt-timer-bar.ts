import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { RosterEntry, GameEvent } from '../lib/types.js';
import { formatTime } from '../lib/types.js';

export class TimerTickEvent extends Event {
  static readonly eventName = 'timer-tick' as const;
  constructor(public half: 1 | 2) {
    super(TimerTickEvent.eventName, { bubbles: true, composed: true });
  }
}

export class ResetHalfEvent extends Event {
  static readonly eventName = 'reset-half' as const;
  constructor(public half: 1 | 2) {
    super(ResetHalfEvent.eventName, { bubbles: true, composed: true });
  }
}

export class ResetGameEvent extends Event {
  static readonly eventName = 'reset-game' as const;
  constructor() {
    super(ResetGameEvent.eventName, { bubbles: true, composed: true });
  }
}

@customElement('pt-timer-bar')
export class PtTimerBar extends LitElement {
  static styles = css`
    *, *::before, *::after {
      box-sizing: border-box;
    }

    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .timer-bar {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
      background: var(--pt-text-white);
      user-select: none;
      box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.15);
    }

    .timer-left { justify-self: start; }
    .timer-center {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-self: center;
    }
    .timer-right {
      justify-self: end;
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .timer-display {
      font-size: 1.1rem;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
      color: var(--pt-bg-primary);
      min-width: 48px;
      text-align: center;
      letter-spacing: 0.5px;
    }

    .timer-display.stoppage { color: var(--pt-danger); }

    .play-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.15);
      background: var(--pt-bg-primary);
      color: var(--pt-text-white);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s;
      font: inherit;
    }

    .play-btn:hover { background: var(--pt-border); }

    .play-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .play-btn.running {
      background: var(--pt-danger);
      border-color: var(--pt-danger);
      color: var(--pt-text-white);
    }

    .play-btn svg {
      width: 20px;
      height: 20px;
    }

    .half-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: bold;
      color: var(--pt-bg-primary);
      cursor: pointer;
    }

    .half-slide {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 66px;
      height: 36px;
      flex-shrink: 0;
    }

    .half-slide.disabled {
      opacity: 0.35;
      pointer-events: none;
    }

    .half-slide input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }

    .half-slide .slide-track {
      position: absolute;
      inset: 0;
      background: var(--pt-bg-primary);
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 18px;
    }

    .half-slide .slide-thumb {
      position: absolute;
      width: 30px;
      height: 30px;
      left: 3px;
      top: 3px;
      background: var(--pt-text-white);
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      transition: transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: bold;
      color: var(--pt-bg-primary);
      user-select: none;
    }

    .half-slide.on .slide-thumb {
      transform: translateX(30px);
    }

    .half-slide input:focus-visible ~ .slide-track {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .reset-btn,
    .times-btn {
      width: 44px;
      height: 44px;
      min-height: 44px;
      border: 1px solid var(--pt-danger);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-danger);
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }

    .reset-btn svg,
    .times-btn svg {
      width: 24px;
      height: 24px;
    }

    .times-btn {
      border-color: var(--pt-bg-primary);
      color: var(--pt-bg-primary);
    }

    .times-btn:hover {
      background: rgba(0,0,0,0.05);
    }

    .times-btn.hint {
      outline: 2px solid var(--pt-hint);
      outline-offset: 2px;
      animation: hintPulse 1.5s ease-in-out infinite;
    }

    @keyframes hintPulse {
      0%, 100% { outline-color: var(--pt-hint); }
      50% { outline-color: rgba(127, 255, 0, 0.4); }
    }

    .reset-btn:hover {
      background: rgba(233, 69, 96, 0.1);
    }

    .reset-btn:focus-visible,
    .times-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    dialog:not([open]) {
      display: none;
    }

    dialog {
      background: var(--pt-bg-surface);
      border: 1px solid var(--pt-border);
      border-radius: 10px;
      padding: 0;
      max-width: 480px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      color: var(--pt-text);
      display: flex;
      flex-direction: column;
    }

    dialog::backdrop {
      background: rgba(0, 0, 0, 0.6);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
      font: inherit;
    }

    .dialog-close:hover { color: var(--pt-text-white); }

    .dialog-close svg {
      width: 14px;
      height: 14px;
    }

    .dialog-body {
      padding: 20px 16px;
    }

    .dialog-body p {
      margin: 0 0 0;
      font-size: 0.85rem;
      color: var(--pt-text);
      line-height: 1.4;
    }

    .confirm-list {
      margin: 0;
      padding: 0 0 0 20px;
      text-align: left;
      font-size: 0.85rem;
      color: var(--pt-text-muted);
      line-height: 1.6;
    }

    .confirm-list strong {
      color: var(--pt-text);
    }

    .confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: space-between;
      margin-top: 32px;
    }

    .confirm-actions button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 20px;
      min-height: 44px;
      font-size: 0.85rem;
      border: 1px solid transparent;
      border-radius: 6px;
      background: var(--pt-bg-surface);
      color: var(--pt-text);
      cursor: pointer;
      font: inherit;
    }

    .confirm-actions-right {
      display: flex;
      gap: 8px;
    }

    .confirm-actions button:hover { background: var(--pt-border); }

    .confirm-actions .confirm-yes {
      background: var(--pt-danger);
      border-color: var(--pt-danger);
      color: var(--pt-text-white);
    }

    .confirm-actions .cancel-btn {
      border: 1px solid var(--pt-accent);
      color: var(--pt-text-white);
      background: transparent;
    }

    .confirm-actions .cancel-btn:hover {
      background: rgba(78, 168, 222, 0.15);
    }

    .confirm-actions .confirm-yes:hover {
      background: var(--pt-danger-hover);
    }

    .confirm-actions .confirm-warn {
      background: var(--pt-warning);
      border-color: var(--pt-warning);
      color: var(--pt-bg-dark);
    }

    .confirm-actions .confirm-warn:hover {
      background: var(--pt-warning-hover);
    }

    #times-dialog {
      height: calc(100dvh - 32px);
    }

    .times-dialog-body {
      padding: 16px;
      flex: 1;
      overflow-y: auto;
    }

    .times-dialog-footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .times-dialog-footer button {
      padding: 8px 24px;
      min-height: 44px;
      font-size: 0.85rem;
      border: 1px solid var(--pt-accent);
      border-radius: 6px;
      background: var(--pt-accent);
      color: var(--pt-text-white);
      cursor: pointer;
      font: inherit;
    }

    .times-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .times-table th {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.15);
      color: var(--pt-text-muted);
      font-weight: bold;
      white-space: nowrap;
    }

    .times-table th.time-col {
      text-align: right;
      min-width: 50px;
    }

    .times-table td {
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      color: var(--pt-text);
    }

    .times-table td.jersey-col {
      color: var(--pt-text-muted);
      width: 32px;
    }

    .times-table td.time-col {
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--pt-text-muted);
    }

    .times-table td.time-col.total {
      color: var(--pt-text);
      font-weight: bold;
    }

    .times-table th.total-col {
      color: var(--pt-text);
    }

    .section-heading {
      font-size: 0.85rem;
      font-weight: bold;
      color: var(--pt-text);
      margin: 0 0 10px 0;
    }

    .section-heading + .times-table {
      margin-bottom: 24px;
    }

    .no-events {
      font-size: 0.85rem;
      color: var(--pt-text-muted);
      margin: 0;
    }

    .events-table td {
      vertical-align: top;
    }

    .event-sub {
      color: var(--pt-success-light);
      font-size: 0.7rem;
    }

    .event-sub-out {
      color: var(--pt-danger-light);
      font-size: 0.7rem;
    }
  `;

  @property({ type: Number }) halfLength = 45;
  @property({ type: String }) teamName = '';
  @property({ type: Array }) roster: RosterEntry[] = [];
  @property({ type: Array }) gameEvents: GameEvent[] = [];
  @state() private _showTimesHint = false;

  @state() private _elapsed = 0;
  @state() private _running = false;
  @state() private _half: 1 | 2 = 1;
  @state() private _confirmType: 'reset-choice' | 'switch-half' | 'reset-game' = 'reset-choice';

  private _timerInterval: ReturnType<typeof setInterval> | null = null;

  @query('#confirm-dialog') private _confirmDialog!: HTMLDialogElement;
  @query('#times-dialog') private _timesDialog!: HTMLDialogElement;

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopTimer();
  }

  private _toggleTimer() {
    if (this._running) {
      this._stopTimer();
    } else {
      this._startTimer();
    }
  }

  private _startTimer() {
    if (this._timerInterval) return;
    this._running = true;
    this._timerInterval = setInterval(() => {
      this._elapsed++;
      this.dispatchEvent(new TimerTickEvent(this._half));
    }, 1000);
  }

  private _stopTimer() {
    this._running = false;
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    if (this._half === 2 && this._elapsed >= this.halfLength * 60) {
      this._showTimesHint = true;
    }
  }

  stopTimer() { this._stopTimer(); }
  get elapsed() { return this._elapsed; }
  get half(): 1 | 2 { return this._half; }

  private get _timeDisplay(): string {
    return formatTime(this._elapsed);
  }

  private get _inStoppage(): boolean {
    return this._elapsed >= this.halfLength * 60;
  }

  private _showConfirm(type: 'switch-half' | 'reset-game' | 'reset-choice') {
    this._stopTimer();
    this._confirmType = type;
    requestAnimationFrame(() => this._confirmDialog?.showModal());
  }

  private _requestSwitchTo2H() { this._showConfirm('switch-half'); }
  private _requestSwitchTo1H() { this._showConfirm('reset-game'); }
  private _requestReset() { this._showConfirm('reset-choice'); }

  private _confirmSwitchHalf() {
    this._half = 2;
    this._elapsed = 0;
    this._confirmDialog?.close();
  }

  private _confirmResetGame() {
    this._half = 1;
    this._elapsed = 0;
    this.dispatchEvent(new ResetGameEvent());
    this._confirmDialog?.close();
  }

  private _confirmResetHalf() {
    this._elapsed = 0;
    this.dispatchEvent(new ResetHalfEvent(this._half));
    this._confirmDialog?.close();
  }

  private _cancelConfirm() {
    this._confirmDialog?.close();
  }

  private _openTimes() {
    this._showTimesHint = false;
    this._timesDialog?.showModal();
  }
  private _closeTimes() { this._timesDialog?.close(); }

  render() {
    return html`
      <div class="timer-bar">
        <div class="timer-left">
          <label class="half-toggle">
            Half
            <span class="half-slide ${this._half === 2 ? 'on' : ''} ${this._running ? 'disabled' : ''}">
              <input type="checkbox"
                     .checked="${this._half === 2}"
                     ?disabled="${this._running}"
                     @change="${(e: Event) => { e.preventDefault(); (e.target as HTMLInputElement).checked = this._half === 2; this._half === 1 ? this._requestSwitchTo2H() : this._requestSwitchTo1H(); }}" />
              <span class="slide-track"></span>
              <span class="slide-thumb">${this._half === 1 ? '1st' : '2nd'}</span>
            </span>
          </label>
        </div>
        <div class="timer-center">
          <button class="play-btn ${this._running ? 'running' : ''}"
                  @click="${this._toggleTimer}"
                  aria-label="${this._running ? 'Stop' : 'Play'}"
                  title="${this._running ? 'Stop' : 'Play'}">
            ${this._running ? svg`
              <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="10" height="10" rx="1" fill="currentColor"/>
              </svg>
            ` : svg`
              <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 1.5v11l9-5.5z" fill="currentColor"/>
              </svg>
            `}
          </button>
          <span class="timer-display ${this._inStoppage ? 'stoppage' : ''}">${this._timeDisplay}</span>
        </div>
        <div class="timer-right">
          <button class="times-btn ${this._showTimesHint ? 'hint' : ''}"
                  aria-label="Times/Stats"
                  title="Times/Stats"
                  @click="${this._openTimes}">
            <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
              <path d="m660 243.6v-63.602h60v-120h-240v120h60v63.602c-219.6 30-390 218.4-390 446.4 0 248.4 201.6 450 450 450s450-201.6 450-450c0-228-170.4-416.4-390-446.4zm-60 776.4c-182.4 0-330-147.6-330-330s147.6-330 330-330 330 147.6 330 330-147.6 330-330 330z" fill="currentColor"/>
              <path d="m151.2 247.2 85.199 84c48-49.199 104.4-86.398 168-112.8l-45.598-110.4c-78 32.398-148.8 79.199-207.6 139.2z" fill="currentColor"/>
              <path d="m1042.8 241.2c-58.801-57.598-126-102-201.6-133.2l-45.602 110.4c61.199 25.199 116.4 61.199 163.2 108z" fill="currentColor"/>
              <path d="m642.48 732.32-84.863-84.852 179.89-179.91 84.863 84.852z" fill="currentColor"/>
            </svg>
          </button>
          <button class="reset-btn"
                  aria-label="Reset"
                  title="Reset"
                  @click="${this._requestReset}">
            <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M515.399 422.213C594.372 362.859 692.519 327.687 798.799 327.687C1059.49 327.687 1271.12 539.313 1271.12 800.007C1271.12 1060.7 1059.49 1272.33 798.799 1272.33C550.319 1272.33 346.439 1080.03 327.866 836.273C325.22 801.607 351.199 771.347 385.866 768.7C420.532 766.053 450.792 792.033 453.439 826.7C467.075 1005.43 616.612 1146.37 798.799 1146.37C989.959 1146.37 1145.16 991.167 1145.16 799.993C1145.16 608.833 989.959 453.633 798.799 453.633C724.736 453.633 656.066 476.931 599.732 516.607H641.358C676.118 516.607 704.331 544.82 704.331 579.58C704.331 614.345 676.118 642.559 641.358 642.559H452.424C417.627 642.559 389.446 614.376 389.446 579.58V390.647C389.446 355.887 417.659 327.673 452.424 327.673C487.184 327.673 515.398 355.887 515.398 390.647L515.399 422.213Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </div>

      <dialog id="confirm-dialog">
        <div class="dialog-header">
          <h2>${this._confirmType === 'switch-half' ? 'Start 2nd half' : this._confirmType === 'reset-game' ? 'Reset game' : 'Reset'}</h2>
          <button class="dialog-close" @click="${this._cancelConfirm}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          ${this._confirmType === 'switch-half' ? html`
            <p>The clock will reset to 00:00.</p>
            <div class="confirm-actions">
              <button class="cancel-btn" @click="${this._cancelConfirm}">Cancel</button>
              <div class="confirm-actions-right">
                <button class="confirm-yes" @click="${this._confirmSwitchHalf}">Start 2nd Half</button>
              </div>
            </div>
          ` : this._confirmType === 'reset-game' ? html`
            <p>The clock and all player times for both halves will be cleared.</p>
            <div class="confirm-actions">
              <button class="cancel-btn" @click="${this._cancelConfirm}">Cancel</button>
              <div class="confirm-actions-right">
                <button class="confirm-yes" @click="${this._confirmResetGame}">Reset Game</button>
              </div>
            </div>
          ` : html`
            <ul class="confirm-list">
              <li><strong>Reset half</strong> will reset the current half's clock</li>
              <li><strong>Reset game</strong> will reset the entire game and player times</li>
            </ul>
            <div class="confirm-actions">
              <button class="cancel-btn" @click="${this._cancelConfirm}">Cancel</button>
              <div class="confirm-actions-right">
                <button class="confirm-warn" @click="${this._confirmResetHalf}">Reset Half</button>
                <button class="confirm-yes" @click="${this._confirmResetGame}">Reset Game</button>
              </div>
            </div>
          `}
        </div>
      </dialog>

      <dialog id="times-dialog" @close="${this._closeTimes}">
        <div class="dialog-header">
          <h2>${this.teamName ? `${this.teamName} Times & Stats` : 'Times & Stats'}</h2>
          <button class="dialog-close" @click="${this._closeTimes}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="times-dialog-body">
          <h3 class="section-heading">Playing Time</h3>
          <table class="times-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player name</th>
                <th class="time-col">1st</th>
                <th class="time-col">2nd</th>
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

          <h3 class="section-heading">Substitutions & Swaps</h3>
          ${this.gameEvents.length === 0 ? html`
            <p class="no-events">No substitutions or swaps yet</p>
          ` : html`
            <table class="times-table events-table">
              <thead>
                <tr>
                  <th>Half</th>
                  <th class="time-col">Time</th>
                  <th>Event</th>
                </tr>
              </thead>
              <tbody>
                ${this.gameEvents.map(ev => html`
                  <tr>
                    <td class="jersey-col">${ev.half === 1 ? '1H' : '2H'}</td>
                    <td class="time-col">${formatTime(ev.elapsed)}</td>
                    <td>${ev.type === 'sub'
                      ? html`<span class="event-sub">&#x25B2;</span> ${ev.playerA} <span class="event-sub-out">&#x25BC;</span> ${ev.playerB}`
                      : html`${ev.playerA} &#x21C4; ${ev.playerB}`}</td>
                  </tr>
                `)}
              </tbody>
            </table>
          `}
        </div>
        <div class="times-dialog-footer">
          <button @click="${this._closeTimes}">Done</button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-timer-bar': PtTimerBar;
  }
}
