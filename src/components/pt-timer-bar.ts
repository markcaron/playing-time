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

export class SavePlanEvent extends Event {
  static readonly eventName = 'save-plan' as const;
  constructor() {
    super(SavePlanEvent.eventName, { bubbles: true, composed: true });
  }
}

export class PlanHalfSwitchEvent extends Event {
  static readonly eventName = 'plan-half-switch' as const;
  constructor(public half: 1 | 2) {
    super(PlanHalfSwitchEvent.eventName, { bubbles: true, composed: true });
  }
}

export class EditLineupEvent extends Event {
  static readonly eventName = 'edit-lineup' as const;
  constructor() {
    super(EditLineupEvent.eventName, { bubbles: true, composed: true });
  }
}

export class GameHalfSwitchedEvent extends Event {
  static readonly eventName = 'game-half-switched' as const;
  constructor(public half: 1 | 2) {
    super(GameHalfSwitchedEvent.eventName, { bubbles: true, composed: true });
  }
}

export class CancelPlanEvent extends Event {
  static readonly eventName = 'cancel-plan' as const;
  constructor() {
    super(CancelPlanEvent.eventName, { bubbles: true, composed: true });
  }
}

export class DeletePlanEvent extends Event {
  static readonly eventName = 'delete-plan' as const;
  constructor() {
    super(DeletePlanEvent.eventName, { bubbles: true, composed: true });
  }
}

export class NavigateStatsEvent extends Event {
  static readonly eventName = 'navigate-stats' as const;
  constructor() {
    super(NavigateStatsEvent.eventName, { bubbles: true, composed: true });
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
      padding: 10px calc(12px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(12px + env(safe-area-inset-left));
      background: var(--pt-white);
      color-scheme: light;
      user-select: none;
      box-shadow: 0 -2px 6px var(--pt-shadow);
      position: relative;
      z-index: 1;
    }

    .timer-left { justify-self: start; display: flex; align-items: center; gap: 8px; }
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

    .timer-display-btn {
      background: none;
      border: 1px solid transparent;
      border-radius: 6px;
      padding: 4px 10px;
      cursor: pointer;
      min-height: 44px;
      font: inherit;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: border-color 0.15s;
    }

    .timer-display-btn:hover {
      border-color: var(--pt-border);
    }

    .timer-display-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .clock-options-icon {
      width: 18px;
      height: 18px;
      opacity: 0.35;
      flex-shrink: 0;
      transition: opacity 0.15s;
    }

    .timer-display-btn:hover .clock-options-icon {
      opacity: 0.7;
    }

    .timer-display {
      font-size: 1.1rem;
      font-weight: bold;
      font-variant-numeric: tabular-nums;
      color: var(--pt-text);
      min-width: 48px;
      text-align: center;
      letter-spacing: 0.5px;
    }

    .timer-display.stoppage { color: var(--pt-danger-on-light); }

    .play-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.15);
      background: var(--pt-navy-800);
      color: var(--pt-white);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: background 0.15s;
      font: inherit;
    }

    .play-btn:hover { background: var(--pt-navy-600); }

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
      color: var(--pt-text);
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
      background: var(--pt-navy-800);
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
      color: var(--pt-text-on-light);
      user-select: none;
    }

    .half-slide.on .slide-thumb {
      transform: translateX(30px);
    }

    .half-slide input:focus-visible ~ .slide-track {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .times-btn {
      width: 44px;
      height: 44px;
      min-height: 44px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px;
    }

    .times-btn svg {
      width: 24px;
      height: 24px;
    }

    .times-btn:hover {
      background: var(--pt-btn-hover);
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

    .times-btn:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    dialog:not([open]) {
      display: none;
    }

    dialog {
      color-scheme: inherit;
      background: var(--pt-bg-surface);
      border: 1px solid var(--pt-border);
      border-radius: 10px;
      padding: 0;
      max-width: 480px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px var(--pt-shadow-lg);
      color: var(--pt-text);
      display: flex;
      flex-direction: column;
    }

    dialog::backdrop {
      background: var(--pt-backdrop);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid var(--pt-border-subtle);
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

    .dialog-close:hover { color: var(--pt-text); }

    .dialog-close:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

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

    .confirm-actions button:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .confirm-actions .confirm-yes {
      background: var(--pt-danger);
      border-color: var(--pt-danger);
      color: var(--pt-text-white);
    }

    .confirm-actions .cancel-btn {
      border: 1px solid var(--pt-text-muted);
      color: var(--pt-text);
      background: transparent;
    }

    .confirm-actions .cancel-btn:hover {
      background: var(--pt-hover-overlay);
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

    .clock-dialog {
      max-width: 320px;
      height: fit-content;
    }

    .clock-dialog-body {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .clock-option {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--pt-border-subtle);
      border-radius: 8px;
      background: transparent;
      color: var(--pt-text);
      font: inherit;
      font-size: 0.85rem;
      cursor: pointer;
      min-height: 44px;
      transition: background 0.15s;
    }

    .clock-option:hover {
      background: var(--pt-hover-overlay);
    }

    .clock-option:focus-visible {
      outline: 2px solid var(--pt-accent);
      outline-offset: 2px;
    }

    .clock-option-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .clock-option-danger {
      color: var(--pt-danger);
      border-color: var(--pt-danger);
    }

    .clock-option-danger:hover {
      background: var(--pt-danger);
      color: var(--pt-text-white);
    }

    .times-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }

    .times-table th {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid var(--pt-border-subtle);
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
      border-bottom: 1px solid var(--pt-border-subtle);
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

    .save-plan-btn {
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

    .save-plan-btn:hover { background: var(--pt-accent-solid-hover); }

    .cancel-plan-btn {
      padding: 6px 14px;
      border: 1px solid var(--pt-text-muted);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-text);
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      min-height: 44px;
      transition: background 0.15s;
    }

    .cancel-plan-btn:hover { background: var(--pt-btn-hover); }

    .delete-plan-btn {
      padding: 10px;
      border: 1px solid var(--pt-danger-light);
      border-radius: 6px;
      background: transparent;
      color: var(--pt-danger-light);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      min-width: 44px;
      transition: background 0.15s;
    }

    .delete-plan-btn svg {
      width: 24px;
      height: 24px;
    }

    .delete-plan-btn:hover { background: var(--pt-hover-overlay); }

    .plan-half-toggle {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: bold;
      color: var(--pt-text);
      cursor: pointer;
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
  @property({ type: String }) matchPhase: 'plan' | 'game' = 'plan';
  @property({ type: Number }) planHalf: 1 | 2 = 1;
  @property({ type: Boolean }) half1Started = false;
  @property({ type: Boolean }) half2Started = false;
  @property({ type: String }) timeDisplayFormat: 'mm:ss' | 'mm' = 'mm:ss';
  @property({ type: Array }) gameEvents: GameEvent[] = [];
  @property({ type: Number }) timerElapsed = 0;
  @state() private _showTimesHint = false;

  @state() private _elapsed = 0;
  @state() private _running = false;
  @state() private _half: 1 | 2 = 1;
  @state() private _confirmType: 'reset-choice' | 'switch-half' | 'reset-game' = 'reset-choice';

  private _timerInterval: ReturnType<typeof setInterval> | null = null;

  @query('#confirm-dialog') private _confirmDialog!: HTMLDialogElement;
  @query('#clock-dialog') private _clockDialog!: HTMLDialogElement;
  @query('#delete-match-dialog') private _deleteMatchDialog!: HTMLDialogElement;
  @query('#cancel-plan-dialog') private _cancelPlanDialog!: HTMLDialogElement;

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

  restoreTimer(elapsed: number, half: 1 | 2, running: boolean) {
    this._elapsed = elapsed;
    this._half = half;
    if (running) this._startTimer();
  }

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
    this.dispatchEvent(new GameHalfSwitchedEvent(2));
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

  private _onNavigateStats() {
    this._showTimesHint = false;
    this.dispatchEvent(new NavigateStatsEvent());
  }

  private _openClock() { this._clockDialog?.showModal(); }
  private _closeClock() { this._clockDialog?.close(); }

  private _openDeleteMatch() { this._deleteMatchDialog?.showModal(); }
  private _closeDeleteMatch() { this._deleteMatchDialog?.close(); }
  private _confirmDeleteMatch() {
    this._deleteMatchDialog?.close();
    this.dispatchEvent(new DeletePlanEvent());
  }

  private _openCancelPlan() { this._cancelPlanDialog?.showModal(); }
  private _closeCancelPlan() { this._cancelPlanDialog?.close(); }
  private _confirmCancelPlan() {
    this._cancelPlanDialog?.close();
    this.dispatchEvent(new CancelPlanEvent());
  }
  private _saveThenCancel() {
    this._cancelPlanDialog?.close();
    this.dispatchEvent(new SavePlanEvent());
    this.dispatchEvent(new CancelPlanEvent());
  }

  private _clockReset() {
    this._closeClock();
    this._requestReset();
  }

  render() {
    return html`
      <div class="timer-bar">
        <div class="timer-left">
          ${this.matchPhase === 'plan' ? html`
            <button class="cancel-plan-btn" @click="${this._openCancelPlan}">Cancel</button>
            <button class="delete-plan-btn" @click="${this._openDeleteMatch}" aria-label="Delete Match" title="Delete Match">
              <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="m300 393.61 55.172 618.74h489.74l55.078-618.74zm123.14 117.33h75.094v374.76h-75.094zm139.22 0h75.094v374.76h-75.094zm139.55 0h75.094v374.76h-75.094z" fill="currentColor"/><path d="m410.44 149.95v112.41h-147.89v75h674.9v-75h-147.89v-112.41zm75 75h229.18v37.406h-229.18z" fill="currentColor"/></svg>
            </button>
          ` : html`
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
          `}
        </div>
        ${this.matchPhase === 'game' ? html`
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
            <button class="timer-display-btn" @click="${this._openClock}" aria-label="Clock options" title="Clock options">
              <span class="timer-display ${this._inStoppage ? 'stoppage' : ''}">${this._timeDisplay}</span>
              <svg class="clock-options-icon" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
                <path d="m1170 680.4v-160.8l-135.6-15.602c-10.801-50.398-31.199-98.398-58.801-141.6l85.199-108-114-114-108 85.199c-43.199-27.602-91.199-46.801-141.6-58.801l-16.797-136.8h-160.8l-15.602 135.6c-50.398 10.801-98.398 31.199-141.6 58.801l-108-85.199-114 114 85.199 108c-27.602 43.199-46.801 91.199-58.801 141.6l-136.8 16.797v160.8l135.6 15.602c10.801 50.398 31.199 98.398 58.801 141.6l-85.199 108 114 114 108-85.199c43.199 27.602 91.199 46.801 141.6 58.801l15.602 135.6h160.8l15.602-135.6c50.398-10.801 98.398-31.199 141.6-58.801l108 85.199 114-114-85.199-108c27.602-43.199 46.801-91.199 58.801-141.6zm-570 163.2c-134.4 0-243.6-109.2-243.6-243.6 0-134.4 109.2-243.6 243.6-243.6s243.6 109.2 243.6 243.6-109.2 243.6-243.6 243.6z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        ` : html`
          <div class="timer-center">
            <label class="half-toggle">
              Half
              <span class="half-slide ${this.planHalf === 2 ? 'on' : ''} ${(this.planHalf === 1 && this.half2Started) || (this.planHalf === 2 && this.half1Started) || (this.half1Started && this.half2Started) ? 'disabled' : ''}">
                <input type="checkbox"
                       .checked="${this.planHalf === 2}"
                       ?disabled="${(this.planHalf === 1 && this.half2Started) || (this.planHalf === 2 && this.half1Started) || (this.half1Started && this.half2Started)}"
                       @change="${(e: Event) => { e.preventDefault(); (e.target as HTMLInputElement).checked = this.planHalf === 2; const target = this.planHalf === 1 ? 2 : 1; this.dispatchEvent(new PlanHalfSwitchEvent(target)); }}" />
                <span class="slide-track"></span>
                <span class="slide-thumb">${this.planHalf === 1 ? '1st' : '2nd'}</span>
              </span>
            </label>
          </div>
        `}
        <div class="timer-right">
          ${this.matchPhase === 'game' ? html`
            <button class="times-btn ${this._showTimesHint ? 'hint' : ''}"
                    aria-label="Times/Stats"
                    title="Times/Stats"
                    @click="${this._onNavigateStats}">
              <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
                <path d="m827.9 140.05-5.9492-17.699c-11.898-35.75-45.352-59.852-83-59.852h-277.9c-37.648 0-71.102 24.102-83 59.852l-5.9492 17.699c-6.3516 19.102-9.6016 39.148-9.6016 59.301v0.64844c0 23.199 9.1992 45.449 25.648 61.852 16.398 16.449 38.648 25.648 61.852 25.648h300c23.199 0 45.449-9.1992 61.852-25.648 16.449-16.398 25.648-38.648 25.648-61.852v-0.64844c0-20.148-3.25-40.199-9.6016-59.301zm-77.102 6 5.9492 17.699c3.8008 11.5 5.75 23.5 5.75 35.602v0.64844c0 3.3008-1.3008 6.5-3.6484 8.8516-2.3516 2.3516-5.5508 3.6484-8.8516 3.6484h-300c-3.3008 0-6.5-1.3008-8.8516-3.6484-2.3516-2.3516-3.6484-5.5508-3.6484-8.8516v-0.64844c0-12.102 1.9492-24.102 5.75-35.602l5.9492-17.699c1.6992-5.1016 6.4492-8.5508 11.852-8.5508h277.9c5.3984 0 10.148 3.4492 11.852 8.5508z" fill-rule="evenodd" fill="currentColor"/>
                <path d="m400 137.5h-100c-75.949 0-137.5 61.551-137.5 137.5v725c0 75.949 61.551 137.5 137.5 137.5h600c75.949 0 137.5-61.551 137.5-137.5v-725c0-75.949-61.551-137.5-137.5-137.5h-100c-20.699 0-37.5 16.801-37.5 37.5s16.801 37.5 37.5 37.5h100c34.5 0 62.5 28 62.5 62.5v725c0 34.5-28 62.5-62.5 62.5h-600c-34.5 0-62.5-28-62.5-62.5v-725c0-34.5 28-62.5 62.5-62.5h100c20.699 0 37.5-16.801 37.5-37.5s-16.801-37.5-37.5-37.5z" fill-rule="evenodd" fill="currentColor"/>
                <path d="m450 525h300c20.699 0 37.5-16.801 37.5-37.5s-16.801-37.5-37.5-37.5h-300c-20.699 0-37.5 16.801-37.5 37.5s16.801 37.5 37.5 37.5z" fill-rule="evenodd" fill="currentColor"/>
                <path d="m375 712.5h450c20.699 0 37.5-16.801 37.5-37.5s-16.801-37.5-37.5-37.5h-450c-20.699 0-37.5 16.801-37.5 37.5s16.801 37.5 37.5 37.5z" fill-rule="evenodd" fill="currentColor"/>
                <path d="m375 900h450c20.699 0 37.5-16.801 37.5-37.5s-16.801-37.5-37.5-37.5h-450c-20.699 0-37.5 16.801-37.5 37.5s16.801 37.5 37.5 37.5z" fill-rule="evenodd" fill="currentColor"/>
              </svg>
            </button>
          ` : html`
            <button class="save-plan-btn" @click="${() => this.dispatchEvent(new SavePlanEvent())}">${this.half1Started ? 'Go to Game' : 'Start Match'}</button>
          `}
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

      <dialog id="clock-dialog" class="clock-dialog" @close="${this._closeClock}">
        <div class="dialog-header">
          <h2>Clock Options</h2>
          <button class="dialog-close" @click="${this._closeClock}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="clock-dialog-body">
          <button class="clock-option clock-option-danger" @click="${this._clockReset}">
            <svg viewBox="0 0 1600 1600" xmlns="http://www.w3.org/2000/svg" class="clock-option-icon">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M515.399 422.213C594.372 362.859 692.519 327.687 798.799 327.687C1059.49 327.687 1271.12 539.313 1271.12 800.007C1271.12 1060.7 1059.49 1272.33 798.799 1272.33C550.319 1272.33 346.439 1080.03 327.866 836.273C325.22 801.607 351.199 771.347 385.866 768.7C420.532 766.053 450.792 792.033 453.439 826.7C467.075 1005.43 616.612 1146.37 798.799 1146.37C989.959 1146.37 1145.16 991.167 1145.16 799.993C1145.16 608.833 989.959 453.633 798.799 453.633C724.736 453.633 656.066 476.931 599.732 516.607H641.358C676.118 516.607 704.331 544.82 704.331 579.58C704.331 614.345 676.118 642.559 641.358 642.559H452.424C417.627 642.559 389.446 614.376 389.446 579.58V390.647C389.446 355.887 417.659 327.673 452.424 327.673C487.184 327.673 515.398 355.887 515.398 390.647L515.399 422.213Z" fill="currentColor"/>
            </svg>
            Reset Clock
          </button>
        </div>
      </dialog>

      <dialog id="delete-match-dialog">
        <div class="dialog-header">
          <h2>Delete Match</h2>
          <button class="dialog-close" @click="${this._closeDeleteMatch}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          <p>This will permanently delete this match and all its data. This action cannot be undone.</p>
          <div class="confirm-actions">
            <button class="cancel-btn" @click="${this._closeDeleteMatch}">Cancel</button>
            <div class="confirm-actions-right">
              <button class="confirm-yes" @click="${this._confirmDeleteMatch}">Delete Match</button>
            </div>
          </div>
        </div>
      </dialog>

      <dialog id="cancel-plan-dialog">
        <div class="dialog-header">
          <h2>Unsaved Changes</h2>
          <button class="dialog-close" @click="${this._closeCancelPlan}" aria-label="Close" title="Close">
            <svg viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="dialog-body">
          <p>You have unsaved changes. Would you like to save before leaving?</p>
          <div class="confirm-actions">
            <button class="cancel-btn" @click="${this._confirmCancelPlan}">Discard</button>
            <div class="confirm-actions-right">
              <button class="confirm-yes" @click="${this._saveThenCancel}">Save</button>
            </div>
          </div>
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
