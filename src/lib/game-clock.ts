export interface ClockSnapshot {
  accumulatedMs: number;
  startedAt: number | null;
}

export class GameClock {
  private _accumulatedMs = 0;
  private _startedAt: number | null = null;
  private _now: () => number;

  constructor(nowFn?: () => number) {
    this._now = nowFn ?? Date.now;
  }

  start(): void {
    if (this._startedAt !== null) return;
    this._startedAt = this._now();
  }

  stop(): void {
    if (this._startedAt === null) return;
    this._accumulatedMs += Math.max(0, this._now() - this._startedAt);
    this._startedAt = null;
  }

  /** Discards all time (including any in-flight running period) and stops. */
  reset(): void {
    this._accumulatedMs = 0;
    this._startedAt = null;
  }

  get elapsed(): number {
    const delta = this._startedAt !== null
      ? Math.max(0, this._now() - this._startedAt)
      : 0;
    return Math.floor((this._accumulatedMs + delta) / 1000);
  }

  get running(): boolean {
    return this._startedAt !== null;
  }

  snapshot(): ClockSnapshot {
    return {
      accumulatedMs: this._accumulatedMs,
      startedAt: this._startedAt,
    };
  }

  static restore(snap: ClockSnapshot, nowFn?: () => number): GameClock {
    const clock = new GameClock(nowFn);
    clock._accumulatedMs = Math.max(0, snap.accumulatedMs ?? 0);
    clock._startedAt = typeof snap.startedAt === 'number' ? snap.startedAt : null;
    return clock;
  }
}
