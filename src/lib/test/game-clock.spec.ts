import { expect } from '@open-wc/testing';
import { GameClock } from '../game-clock.js';

/*
 * Specification: Wall-clock-anchored game timer
 *
 * The current timer uses setInterval to increment a counter once per
 * second. When the device screen locks or the browser tab is throttled,
 * ticks are lost and the elapsed time falls behind real time.
 *
 * Fix: GameClock anchors to the system clock. Elapsed time is computed
 * as accumulated + (now - startedAt), so it's always accurate even
 * after a sleep/wake cycle.
 *
 * The class accepts an injectable `now` function (defaults to Date.now)
 * so tests can control time precisely without real delays.
 *
 * This replaces the _elapsed / setInterval / pendingTimerRestore
 * pattern in pt-timer-bar.ts and playing-time.ts.
 */

/* ─── Helpers ─────────────────────────────────────────────── */

function fakeClock(startMs = 0) {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms: number) => { now += ms; },
    set: (ms: number) => { now = ms; },
  };
}

/* ─── Construction ────────────────────────────────────────── */

describe('GameClock', function () {
  it('is a class exported from game-clock module', function () {
    expect(GameClock).to.be.a('function');
    const clock = new GameClock();
    expect(clock).to.be.an.instanceOf(GameClock);
  });

  it('accepts an optional now function', function () {
    const fake = fakeClock();
    const clock = new GameClock(fake.now);
    expect(clock.elapsed).to.equal(0);
  });

  it('starts with elapsed = 0', function () {
    const clock = new GameClock();
    expect(clock.elapsed).to.equal(0);
  });

  it('starts in stopped state', function () {
    const clock = new GameClock();
    expect(clock.running).to.be.false;
  });
});

/* ─── Start / stop basics ─────────────────────────────────── */

describe('GameClock — start/stop', function () {
  it('running is true after start()', function () {
    const fake = fakeClock();
    const clock = new GameClock(fake.now);
    clock.start();
    expect(clock.running).to.be.true;
  });

  it('running is false after stop()', function () {
    const fake = fakeClock();
    const clock = new GameClock(fake.now);
    clock.start();
    clock.stop();
    expect(clock.running).to.be.false;
  });

  it('elapsed reflects wall-clock time while running', function () {
    const fake = fakeClock(1000);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(5000);
    expect(clock.elapsed).to.equal(5);
  });

  it('elapsed freezes when stopped', function () {
    const fake = fakeClock(1000);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(10000);
    clock.stop();
    fake.advance(60000);
    expect(clock.elapsed).to.equal(10);
  });

  it('start() is idempotent (double-start does not reset)', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(5000);
    clock.start();
    fake.advance(3000);
    expect(clock.elapsed).to.equal(8);
  });

  it('stop() is idempotent', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(5000);
    clock.stop();
    clock.stop();
    expect(clock.elapsed).to.equal(5);
  });
});

/* ─── Accumulation across start/stop cycles ───────────────── */

describe('GameClock — accumulation', function () {
  it('accumulates time across multiple start/stop cycles', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);

    clock.start();
    fake.advance(10000);
    clock.stop();

    fake.advance(5000); // paused

    clock.start();
    fake.advance(20000);
    clock.stop();

    expect(clock.elapsed).to.equal(30);
  });

  it('elapsed updates continuously while running (not just on stop)', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();

    fake.advance(1000);
    expect(clock.elapsed).to.equal(1);

    fake.advance(2000);
    expect(clock.elapsed).to.equal(3);

    fake.advance(7000);
    expect(clock.elapsed).to.equal(10);
  });
});

/* ─── Device sleep / wake simulation ──────────────────────── */

describe('GameClock — sleep/wake resilience', function () {
  it('catches up after a 5-minute gap (simulating device sleep)', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(60000);
    expect(clock.elapsed).to.equal(60);

    // Simulate 5-minute device sleep
    fake.advance(300000);
    expect(clock.elapsed).to.equal(360);
  });

  it('catches up after a 30-minute gap', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(1800000);
    expect(clock.elapsed).to.equal(1800);
  });

  it('paused time during sleep is not counted', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(60000);
    clock.stop();

    // Device sleeps for 10 minutes while paused
    fake.advance(600000);

    expect(clock.elapsed).to.equal(60);
  });
});

/* ─── Reset ───────────────────────────────────────────────── */

describe('GameClock — reset', function () {
  it('resets elapsed to 0', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(45000);
    clock.stop();
    clock.reset();
    expect(clock.elapsed).to.equal(0);
  });

  it('resets to stopped state', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    clock.reset();
    expect(clock.running).to.be.false;
  });

  it('can start fresh after reset', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(100000);
    clock.reset();

    fake.advance(5000);
    clock.start();
    fake.advance(10000);
    expect(clock.elapsed).to.equal(10);
  });
});

/* ─── Snapshot / restore (for localStorage persistence) ───── */

describe('GameClock — snapshot/restore', function () {
  it('snapshot() returns clock state', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(15000);
    clock.stop();

    const snap = clock.snapshot();
    expect(snap).to.have.property('accumulatedMs').that.is.a('number');
    expect(snap).to.have.property('startedAt');
  });

  it('restoring a stopped clock preserves elapsed time', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(30000);
    clock.stop();

    const snap = clock.snapshot();
    const restored = GameClock.restore(snap, fake.now);
    expect(restored.elapsed).to.equal(30);
    expect(restored.running).to.be.false;
  });

  it('restoring a running clock continues from where it left off', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(10000);

    const snap = clock.snapshot();

    // Simulate app restart: new clock from snapshot, time has passed
    fake.advance(5000);
    const restored = GameClock.restore(snap, fake.now);
    expect(restored.running).to.be.true;
    expect(restored.elapsed).to.equal(15);
  });

  it('round-trips through snapshot/restore while stopped', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(25000);
    clock.stop();

    const restored = GameClock.restore(clock.snapshot(), fake.now);
    expect(restored.elapsed).to.equal(clock.elapsed);
    expect(restored.running).to.equal(clock.running);
  });

  it('round-trips through snapshot/restore while running', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(25000);

    const restored = GameClock.restore(clock.snapshot(), fake.now);
    expect(restored.elapsed).to.equal(clock.elapsed);
    expect(restored.running).to.equal(clock.running);

    fake.advance(10000);
    expect(restored.elapsed).to.equal(35);
  });

  it('snapshot from a fresh clock restores to zero', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    const restored = GameClock.restore(clock.snapshot(), fake.now);
    expect(restored.elapsed).to.equal(0);
    expect(restored.running).to.be.false;
  });
});

/* ─── Edge cases ──────────────────────────────────────────── */

describe('GameClock — edge cases', function () {
  it('elapsed is always non-negative', function () {
    const fake = fakeClock(1000);
    const clock = new GameClock(fake.now);
    expect(clock.elapsed).to.be.at.least(0);

    clock.start();
    expect(clock.elapsed).to.be.at.least(0);
  });

  it('elapsed returns whole seconds (floored)', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(1500);
    expect(clock.elapsed).to.equal(1);

    fake.advance(499);
    expect(clock.elapsed).to.equal(1);

    fake.advance(1);
    expect(clock.elapsed).to.equal(2);
  });

  it('handles sub-second start/stop cycles', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);

    clock.start();
    fake.advance(500);
    clock.stop();

    clock.start();
    fake.advance(600);
    clock.stop();

    expect(clock.elapsed).to.equal(1);
  });
});
