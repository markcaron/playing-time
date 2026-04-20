import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: bold;
      color: #16213e;
      cursor: pointer;
    }

    .half-slide {
      position: relative;
      display: inline-flex;
      align-items: center;
      width: 72px;
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
      background: #16213e;
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 18px;
    }

    .half-slide .slide-thumb {
      position: absolute;
      width: 30px;
      height: 30px;
      left: 3px;
      top: 3px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      transition: transform 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: bold;
      color: #16213e;
      user-select: none;
    }

    .half-slide.on .slide-thumb {
      transform: translateX(36px);
    }

    .half-slide input:focus-visible ~ .slide-track {
      outline: 2px solid #4ea8de;
      outline-offset: 2px;
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

    dialog:not([open]) {
      display: none;
    }

    dialog {
      background: #0f3460;
      border: 1px solid #1a4a7a;
      border-radius: 10px;
      padding: 0;
      max-width: 480px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      color: #e0e0e0;
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
      color: #e0e0e0;
    }

    .dialog-close {
      background: transparent;
      border: none;
      color: #aaa;
      cursor: pointer;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.15s;
      font: inherit;
    }

    .dialog-close:hover { color: #fff; }

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
      color: #e0e0e0;
      line-height: 1.4;
    }

    .confirm-list {
      margin: 0;
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

    .confirm-actions .cancel-btn {
      border: 1px solid #4ea8de;
      color: #fff;
      background: transparent;
    }

    .confirm-actions .cancel-btn:hover {
      background: rgba(78, 168, 222, 0.15);
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
  @state() private _confirmType: 'reset-choice' | 'switch-half' | 'reset-game' = 'reset-choice';

  private _timerInterval: ReturnType<typeof setInterval> | null = null;

  @query('#confirm-dialog') private _confirmDialog!: HTMLDialogElement;

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

      <dialog id="confirm-dialog">
        <div class="dialog-header">
          <h2>${this._confirmType === 'switch-half' ? 'Start 2nd half' : this._confirmType === 'reset-game' ? 'Reset game' : 'Reset'}</h2>
          <button class="dialog-close" @click="${this._cancelConfirm}" aria-label="Close">
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pt-timer-bar': PtTimerBar;
  }
}
