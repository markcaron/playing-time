import { expect } from '@open-wc/testing';
import { PositionTracker } from '../position-tracker.js';
import type { Position, FormationKey } from '../types.js';

/*
 * Specification: Position time tracking with formation-change grace period
 * See: .cursor/plans/player_position_tracking_0e77d415.plan.md
 *
 * PositionTracker is a pure class that manages per-position time
 * accumulation for all players. It handles:
 *   - Accumulating time at each player's current slot position
 *   - 10-second grace period after formation changes
 *   - Transferring "wrong position" time on swap/sub during grace
 *   - Pausing position tracking (but not half/bench times) during grace
 *
 * Accepts an injectable `now` function for deterministic testing.
 */

/* ─── Helpers ─────────────────────────────────────────────── */

function fakeClock(startMs = 0) {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms: number) => { now += ms; },
  };
}

interface SlotAssignment {
  playerId: string;
  slotIndex: number;
}

/* ─── Construction ────────────────────────────────────────── */

describe('PositionTracker', function () {
  it('is a class exported from position-tracker module', function () {
    expect(PositionTracker).to.be.a('function');
    const tracker = new PositionTracker();
    expect(tracker).to.be.an.instanceOf(PositionTracker);
  });

  it('accepts an optional now function', function () {
    const fake = fakeClock();
    const tracker = new PositionTracker(fake.now);
    expect(tracker).to.be.an.instanceOf(PositionTracker);
  });

  it('starts with tracking active (not paused)', function () {
    const tracker = new PositionTracker();
    expect(tracker.paused).to.be.false;
  });
});

/* ─── Basic position time accumulation ────────────────────── */

describe('PositionTracker — accumulate', function () {
  it('accumulates time at the correct position for each player', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    const formation: FormationKey = '1-2-3-1';
    const slots: SlotAssignment[] = [
      { playerId: 'gk1', slotIndex: 0 },
      { playerId: 'cb1', slotIndex: 1 },
      { playerId: 'cm1', slotIndex: 3 },
    ];

    tracker.accumulate(slots, formation, 10);

    const gkTimes = tracker.getPositionTimes('gk1');
    expect(gkTimes).to.have.property('GK', 10);

    const cbTimes = tracker.getPositionTimes('cb1');
    expect(cbTimes).to.have.property('CB', 10);

    const cmTimes = tracker.getPositionTimes('cm1');
    expect(cmTimes).to.have.property('CM', 10);
  });

  it('accumulates across multiple calls', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    const formation: FormationKey = '1-2-3-1';
    const slots: SlotAssignment[] = [
      { playerId: 'cm1', slotIndex: 3 },
    ];

    tracker.accumulate(slots, formation, 5);
    tracker.accumulate(slots, formation, 7);

    const times = tracker.getPositionTimes('cm1');
    expect(times).to.have.property('CM', 12);
  });

  it('tracks multiple positions for a player after a swap', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    const formation: FormationKey = '1-2-3-1';

    // Player starts at slot 3 (CM)
    tracker.accumulate([{ playerId: 'p1', slotIndex: 3 }], formation, 10);

    // Player swaps to slot 6 (ST)
    tracker.accumulate([{ playerId: 'p1', slotIndex: 6 }], formation, 5);

    const times = tracker.getPositionTimes('p1');
    expect(times).to.have.property('CM', 10);
    expect(times).to.have.property('ST', 5);
  });

  it('returns empty object for unknown player', function () {
    const tracker = new PositionTracker();
    const times = tracker.getPositionTimes('unknown');
    expect(times).to.deep.equal({});
  });

  it('does not accumulate when delta is 0', function () {
    const tracker = new PositionTracker();
    const formation: FormationKey = '1-2-3-1';
    tracker.accumulate([{ playerId: 'p1', slotIndex: 0 }], formation, 0);
    const times = tracker.getPositionTimes('p1');
    expect(times).to.deep.equal({});
  });
});

/* ─── Formation change grace period ───────────────────────── */

/*
 * Caller contract: tick() must be called on every timer cycle
 * (from #onTimerTick) so the grace period timeout is evaluated.
 * If tick() is never called, the tracker stays paused indefinitely.
 *
 * During grace, accumulate() auto-buffers time instead of committing
 * it. The caller does NOT need to call a separate buffer method.
 * After a swap/sub, the caller calls transferGraceTime(playerId,
 * newPosition) to move buffered time to the player's final position.
 */

describe('PositionTracker — grace period', function () {
  it('pauses position tracking on formation change', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    tracker.onFormationChange();
    expect(tracker.paused).to.be.true;
  });

  it('resumes tracking after 10 seconds', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    tracker.onFormationChange();
    expect(tracker.paused).to.be.true;

    fake.advance(10000);
    tracker.tick();
    expect(tracker.paused).to.be.false;
  });

  it('does not resume before 10 seconds', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    tracker.onFormationChange();

    fake.advance(9999);
    tracker.tick();
    expect(tracker.paused).to.be.true;
  });

  it('does not accumulate position time while paused', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    const formation: FormationKey = '1-2-3-1';
    const slots: SlotAssignment[] = [{ playerId: 'p1', slotIndex: 3 }];

    // Accumulate 5 seconds normally
    tracker.accumulate(slots, formation, 5);

    // Formation change — pause
    tracker.onFormationChange();

    // Try to accumulate 10 more seconds while paused
    tracker.accumulate(slots, formation, 10);

    // Should still be 5 (paused time not counted)
    const times = tracker.getPositionTimes('p1');
    expect(times).to.have.property('CM', 5);
  });

  it('resets the grace timer on swap during grace period', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    tracker.onFormationChange();

    fake.advance(8000);
    tracker.onSwapOrSub();

    // 8s passed + swap resets timer, need 10 more seconds
    fake.advance(9999);
    tracker.tick();
    expect(tracker.paused).to.be.true;

    fake.advance(1);
    tracker.tick();
    expect(tracker.paused).to.be.false;
  });

  it('resets the grace timer on sub during grace period', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    tracker.onFormationChange();

    fake.advance(5000);
    tracker.onSwapOrSub();

    fake.advance(5000);
    tracker.onSwapOrSub();

    // Two resets — need 10s from the last one
    fake.advance(9999);
    tracker.tick();
    expect(tracker.paused).to.be.true;

    fake.advance(1);
    tracker.tick();
    expect(tracker.paused).to.be.false;
  });

  it('auto-buffers time during grace period instead of accumulating', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    const formation: FormationKey = '1-2-3-1';

    // Player at slot 3 (CM), accumulate 10s normally
    tracker.accumulate([{ playerId: 'p1', slotIndex: 3 }], formation, 10);

    // Formation changes — player moves to slot 1 (CB) which may be wrong
    tracker.onFormationChange();

    // accumulate during grace: time is buffered, not committed to CB
    tracker.accumulate([{ playerId: 'p1', slotIndex: 1 }], formation, 3);

    // CB should NOT have any time yet (buffered, not accumulated)
    const midTimes = tracker.getPositionTimes('p1');
    expect(midTimes).to.not.have.property('CB');
    expect(midTimes).to.have.property('CM', 10);
  });

  it('transfers buffered grace time to new position after swap', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    const formation: FormationKey = '1-2-3-1';

    tracker.accumulate([{ playerId: 'p1', slotIndex: 3 }], formation, 10);
    tracker.onFormationChange();

    // 3 seconds at "wrong" slot 1 (CB) — auto-buffered by accumulate
    tracker.accumulate([{ playerId: 'p1', slotIndex: 1 }], formation, 3);

    // Coach swaps player to slot 6 (ST) — their intended position
    // transferGraceTime moves the buffered 3s to ST
    tracker.onSwapOrSub();
    tracker.transferGraceTime('p1', 'ST' as Position);

    const times = tracker.getPositionTimes('p1');
    expect(times).to.have.property('CM', 10);
    expect(times).to.have.property('ST', 3);
    expect(times).to.not.have.property('CB');
  });

  it('resumes accumulation after grace period ends', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    const formation: FormationKey = '1-2-3-1';
    const slots: SlotAssignment[] = [{ playerId: 'p1', slotIndex: 3 }];

    tracker.onFormationChange();
    fake.advance(10000);
    tracker.tick();
    expect(tracker.paused).to.be.false;

    tracker.accumulate(slots, formation, 5);
    const times = tracker.getPositionTimes('p1');
    expect(times).to.have.property('CM', 5);
  });

  it('does not pause on swap/sub outside grace period', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    tracker.onSwapOrSub();
    expect(tracker.paused).to.be.false;
  });
});

/* ─── Reset ───────────────────────────────────────────────── */

describe('PositionTracker — reset', function () {
  it('zeros all position times on reset', function () {
    const tracker = new PositionTracker();
    const formation: FormationKey = '1-2-3-1';
    tracker.accumulate([{ playerId: 'p1', slotIndex: 3 }], formation, 30);

    tracker.reset();

    const times = tracker.getPositionTimes('p1');
    expect(times).to.deep.equal({});
  });

  it('clears paused state on reset', function () {
    const fake = fakeClock(0);
    const tracker = new PositionTracker(fake.now);
    tracker.onFormationChange();
    expect(tracker.paused).to.be.true;

    tracker.reset();
    expect(tracker.paused).to.be.false;
  });

  it('can accumulate fresh after reset', function () {
    const tracker = new PositionTracker();
    const formation: FormationKey = '1-2-3-1';
    tracker.accumulate([{ playerId: 'p1', slotIndex: 3 }], formation, 10);
    tracker.reset();
    tracker.accumulate([{ playerId: 'p1', slotIndex: 6 }], formation, 5);

    const times = tracker.getPositionTimes('p1');
    expect(times).to.deep.equal({ ST: 5 });
  });
});

/* ─── getAllPositionTimes (for persistence) ────────────────── */

describe('PositionTracker — getAllPositionTimes', function () {
  it('returns position times for all tracked players', function () {
    const tracker = new PositionTracker();
    const formation: FormationKey = '1-2-3-1';
    tracker.accumulate([
      { playerId: 'p1', slotIndex: 0 },
      { playerId: 'p2', slotIndex: 3 },
    ], formation, 10);

    const all = tracker.getAllPositionTimes();
    expect(all).to.have.property('p1');
    expect(all).to.have.property('p2');
    expect(all['p1']).to.have.property('GK', 10);
    expect(all['p2']).to.have.property('CM', 10);
  });

  it('can restore from saved position times', function () {
    const saved: Record<string, Partial<Record<Position, number>>> = {
      'p1': { CM: 15, ST: 10 },
      'p2': { GK: 25 },
    };
    const tracker = PositionTracker.restore(saved);

    expect(tracker.getPositionTimes('p1')).to.deep.include({ CM: 15, ST: 10 });
    expect(tracker.getPositionTimes('p2')).to.deep.include({ GK: 25 });
  });

  it('round-trips through getAllPositionTimes and restore', function () {
    const tracker = new PositionTracker();
    const formation: FormationKey = '1-2-3-1';
    tracker.accumulate([
      { playerId: 'p1', slotIndex: 0 },
      { playerId: 'p2', slotIndex: 3 },
    ], formation, 10);
    tracker.accumulate([
      { playerId: 'p1', slotIndex: 6 },
      { playerId: 'p2', slotIndex: 3 },
    ], formation, 5);

    const saved = tracker.getAllPositionTimes();
    const restored = PositionTracker.restore(saved);

    expect(restored.getPositionTimes('p1')).to.deep.equal(tracker.getPositionTimes('p1'));
    expect(restored.getPositionTimes('p2')).to.deep.equal(tracker.getPositionTimes('p2'));
  });
});
