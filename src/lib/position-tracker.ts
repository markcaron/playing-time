import { getSlotPositions } from './formations.js';
import type { Position, FormationKey } from './types.js';

interface SlotAssignment {
  playerId: string;
  slotIndex: number;
}

const GRACE_PERIOD_MS = 10_000;

export class PositionTracker {
  private _times: Map<string, Map<Position, number>> = new Map();
  private _buffer: Map<string, number> = new Map();
  private _now: () => number;
  private _pausedAt: number | null = null;

  constructor(nowFn?: () => number) {
    this._now = nowFn ?? Date.now;
  }

  get paused(): boolean {
    return this._pausedAt !== null;
  }

  accumulate(slots: SlotAssignment[], formation: FormationKey, delta: number): void {
    if (delta <= 0) return;
    const positions = getSlotPositions(formation);

    for (const { playerId, slotIndex } of slots) {
      if (this._pausedAt !== null) {
        this._buffer.set(playerId, (this._buffer.get(playerId) ?? 0) + delta);
      } else {
        const pos = positions[slotIndex];
        if (!pos) continue;
        if (!this._times.has(playerId)) this._times.set(playerId, new Map());
        const playerMap = this._times.get(playerId)!;
        playerMap.set(pos, (playerMap.get(pos) ?? 0) + delta);
      }
    }
  }

  tick(): void {
    if (this._pausedAt !== null && this._now() - this._pausedAt >= GRACE_PERIOD_MS) {
      this._pausedAt = null;
      this._buffer.clear();
    }
  }

  onFormationChange(): void {
    this._pausedAt = this._now();
    this._buffer.clear();
  }

  onSwapOrSub(): void {
    if (this._pausedAt !== null) {
      this._pausedAt = this._now();
    }
  }

  transferGraceTime(playerId: string, position: Position): void {
    const buffered = this._buffer.get(playerId);
    if (buffered == null || buffered <= 0) return;

    if (!this._times.has(playerId)) this._times.set(playerId, new Map());
    const playerMap = this._times.get(playerId)!;
    playerMap.set(position, (playerMap.get(position) ?? 0) + buffered);
    this._buffer.delete(playerId);
  }

  reset(): void {
    this._times.clear();
    this._buffer.clear();
    this._pausedAt = null;
  }

  getPositionTimes(playerId: string): Partial<Record<Position, number>> {
    const playerMap = this._times.get(playerId);
    if (!playerMap) return {};
    const result: Partial<Record<Position, number>> = {};
    for (const [pos, time] of playerMap) {
      result[pos] = time;
    }
    return result;
  }

  getAllPositionTimes(): Record<string, Partial<Record<Position, number>>> {
    const result: Record<string, Partial<Record<Position, number>>> = {};
    for (const [playerId] of this._times) {
      result[playerId] = this.getPositionTimes(playerId);
    }
    return result;
  }

  static restore(
    saved: Record<string, Partial<Record<Position, number>>>,
    nowFn?: () => number,
  ): PositionTracker {
    const tracker = new PositionTracker(nowFn);
    for (const [playerId, times] of Object.entries(saved)) {
      const playerMap = new Map<Position, number>();
      for (const [pos, time] of Object.entries(times)) {
        if (time != null && time > 0) {
          playerMap.set(pos as Position, time);
        }
      }
      if (playerMap.size > 0) tracker._times.set(playerId, playerMap);
    }
    return tracker;
  }
}
