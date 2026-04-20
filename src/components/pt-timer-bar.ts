import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
      background: #ffffff;
      user-select: none;
    }

    .timer-left { justify-self: start; }
    .timer-center {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-self: center;
    }
    .timer-right { justify-self: end; }

    .timer-display {
      font-size: 1.1rem;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
      color: #16213e;
      min-width: 48px;
      text-align: center;
      letter-spacing: 0.5px;
    }

    .timer-display.stoppage { color: #e94560; }

    .play-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.15);
      background: #16213e;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s;
      font: inherit;
    }

    .play-btn:hover { background: #1a4a7a; }

    .play-btn:focus-visible {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
    }

    .play-btn.running {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .play-btn svg {
      width: 14px;
      height: 14px;
    }

    .half-toggle {
      display: flex;
      border: 1px solid rgba(0, 0, 0, 0.2);
      border-radius: 6px;
    }

    .half-toggle button {
      padding: 6px 12px;
      font-size: 0.75rem;
      font-weight: bold;
      border: none;
      border-radius: 0;
      background: transparent;
      color: #666;
      transition: background 0.15s, color 0.15s;
      min-width: 0;
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      font: inherit;
    }

    .half-toggle button:first-child { border-radius: 5px 0 0 5px; }
    .half-toggle button:last-child { border-radius: 0 5px 5px 0; }

    .half-toggle button.active {
      background: #16213e;
      color: #fff;
    }

    .half-toggle button.active:disabled { opacity: 1; }
    .half-toggle button:disabled:not(.active) { opacity: 0.35; }

    .half-toggle button:disabled {
      cursor: default;
      pointer-events: none;
    }

    .half-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4ade80;
      flex-shrink: 0;
    }

    .reset-btn {
      padding: 6px 14px;
      min-height: 44px;
      font-size: 0.85rem;
      border: 1px solid #e94560;
      border-radius: 6px;
      background: transparent;
      color: #e94560;
      cursor: pointer;
      transition: background 0.15s;
      font: inherit;
    }

    .reset-btn:hover {
      background: rgba(233, 69, 96, 0.1);
    }

    .reset-btn:focus-visible {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
    }

    .confirm-overlay {
      position: fixed;
      inset: 0;
      z-index: 500;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .confirm-dialog {
      background: #16213e;
      border: 1px solid #1a4a7a;
      border-radius: 10px;
      padding: 24px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .confirm-dialog h3 {
      margin: 0 0 20px;
      font-size: 1rem;
      font-weight: bold;
      color: #e0e0e0;
    }

    .confirm-dialog p {
      margin: 0 0 20px;
      font-size: 0.9rem;
      color: #aaa;
      line-height: 1.4;
    }

    .confirm-list {
      margin: 0 0 20px;
      padding: 0 0 0 20px;
      text-align: left;
      font-size: 0.85rem;
      color: #aaa;
      line-height: 1.6;
    }

    .confirm-list strong {
      color: #e0e0e0;
    }

    .confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: space-between;
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
      background: #0f3460;
      color: #e0e0e0;
      cursor: pointer;
      font: inherit;
    }

    .confirm-actions-right {
      display: flex;
      gap: 8px;
    }

    .confirm-actions button:hover { background: #1a4a7a; }

    .confirm-actions .confirm-yes {
      background: #e94560;
      border-color: #e94560;
      color: #fff;
    }

    .confirm-actions .confirm-yes:hover {
      background: #d13350;
    }

    .confirm-actions .confirm-warn {
      background: #f0c040;
      border-color: #f0c040;
      color: #151515;
    }

    .confirm-actions .confirm-warn:hover {
      background: #d4a830;
    }
  `;

  @property({ type: Number }) halfLength = 45;

  @state() private _elapsed = 0;
  @state() private _running = false;
  @state() private _half: 1 | 2 = 1;
  @state() private _confirmAction: 'reset-choice' | 'switch-half' | 'reset-game' | null = null;

  private _timerInterval: ReturnType<typeof setInterval> | null = null;

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
  }

  stopTimer() { this._stopTimer(); }

  private get _timeDisplay(): string {
    return formatTime(this._elapsed);
  }

  private get _inStoppage(): boolean {
    return this._elapsed >= this.halfLength * 60;
  }

  private _requestSwitchTo2H() {
    this._stopTimer();
    this._confirmAction = 'switch-half';
  }

  private _requestSwitchTo1H() {
    this._stopTimer();
    this._confirmAction = 'reset-game';
  }

  private _confirmSwitchHalf() {
    this._half = 2;
    this._elapsed = 0;
    this._confirmAction = null;
  }

  private _confirmResetGame() {
    this._half = 1;
    this._elapsed = 0;
    this.dispatchEvent(new ResetGameEvent());
    this._confirmAction = null;
  }

  private _requestReset() {
    this._stopTimer();
    this._confirmAction = 'reset-choice';
  }

  private _confirmResetHalf() {
    this._elapsed = 0;
    this.dispatchEvent(new ResetHalfEvent(this._half));
    this._confirmAction = null;
  }

  private _cancelConfirm() {
    this._confirmAction = null;
  }

  render() {
    return html`
      <div class="timer-bar">
        <div class="timer-left">
          <div class="half-toggle">
            <button class="${this._half === 1 ? 'active' : ''}"
                    ?disabled="${this._half === 1 || this._running}"
                    @click="${this._requestSwitchTo1H}">${this._half === 1 ? html`<span class="half-dot"></span>` : nothing}1H</button>
            <button class="${this._half === 2 ? 'active' : ''}"
                    ?disabled="${this._half === 2 || this._running}"
                    @click="${this._requestSwitchTo2H}">2H${this._half === 2 ? html`<span class="half-dot"></span>` : nothing}</button>
          </div>
        </div>
        <div class="timer-center">
          <button class="play-btn ${this._running ? 'running' : ''}"
                  @click="${this._toggleTimer}"
                  aria-label="${this._running ? 'Stop' : 'Play'}">
            ${this._running ? svg`
              <svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="1" width="10" height="12" rx="1" fill="currentColor"/>
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
          <button class="reset-btn"
                  @click="${this._requestReset}">Reset</button>
        </div>
      </div>

      ${this._confirmAction ? html`
        <div class="confirm-overlay" @click="${this._cancelConfirm}">
          <div class="confirm-dialog" @click="${(e: Event) => e.stopPropagation()}">
            ${this._confirmAction === 'switch-half' ? html`
              <h3>Start 2nd half?</h3>
              <p>The clock will reset to 00:00.</p>
              <div class="confirm-actions">
                <button @click="${this._cancelConfirm}">Cancel</button>
                <div class="confirm-actions-right">
                  <button class="confirm-yes" @click="${this._confirmSwitchHalf}">Start 2H</button>
                </div>
              </div>
            ` : this._confirmAction === 'reset-game' ? html`
              <h3>Reset entire game?</h3>
              <p>The clock and all player times for both halves will be cleared.</p>
              <div class="confirm-actions">
                <button @click="${this._cancelConfirm}">Cancel</button>
                <div class="confirm-actions-right">
                  <button class="confirm-yes" @click="${this._confirmResetGame}">Reset Game</button>
                </div>
              </div>
            ` : html`
              <h3>Reset half or game?</h3>
              <ul class="confirm-list">
                <li><strong>Reset half</strong> will reset the current half's clock</li>
                <li><strong>Reset game</strong> will reset the entire game and player times</li>
              </ul>
              <div class="confirm-actions">
                <button @click="${this._cancelConfirm}">Cancel</button>
                <div class="confirm-actions-right">
                  <button class="confirm-warn" @click="${this._confirmResetHalf}">Reset Half</button>
                  <button class="confirm-yes" @click="${this._confirmResetGame}">Reset Game</button>
                </div>
              </div>
            `}
          </div>
        </div>
      ` : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-timer-bar': PtTimerBar;
  }
}
