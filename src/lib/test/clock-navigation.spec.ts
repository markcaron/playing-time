import { expect } from '@open-wc/testing';
import { GameClock } from '../game-clock.js';

/*
 * Specification: Game clock survives view navigation
 * See: https://github.com/markcaron/playing-time/issues/49
 *
 * Bug: navigating to Settings/Stats/Plan stops the game clock and
 * player timers. When returning to Game view, elapsed time is wrong.
 *
 * Root cause: pt-timer-bar owns the clock and gets unmounted during
 * navigation. The pendingTimerRestore hack captures elapsed time as
 * a snapshot, losing any time spent in the other view.
 *
 * Fix architecture: GameClock must be owned by the PARENT component
 * (playing-time.ts), not the child (pt-timer-bar.ts). The parent
 * survives view transitions. The timer bar reads clock state from
 * the parent via properties; it does not own the clock.
 *
 * These tests verify that GameClock.snapshot/restore correctly
 * preserves running state across simulated navigation gaps, AND
 * that the source code reflects the correct ownership architecture.
 */

/* ═══════════════════════════════════════════════════════════════
 * GameClock — navigation round-trip simulation
 * ═══════════════════════════════════════════════════════════════ */

function fakeClock(startMs = 0) {
  let now = startMs;
  return {
    now: () => now,
    advance: (ms: number) => { now += ms; },
  };
}

describe('GameClock — navigation round-trip', function () {
  it('running clock preserves elapsed time across snapshot/restore gap', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();

    // 60 seconds of game play
    fake.advance(60000);
    expect(clock.elapsed).to.equal(60);

    // User navigates to Settings — snapshot the clock
    const snap = clock.snapshot();
    expect(snap.startedAt).to.be.a('number');

    // 30 seconds pass in Settings view
    fake.advance(30000);

    // User returns to Game view — restore the clock
    const restored = GameClock.restore(snap, fake.now);

    // Clock should show 90 seconds (60 + 30), NOT 60
    expect(restored.elapsed).to.equal(90);
    expect(restored.running).to.be.true;
  });

  it('stopped clock stays stopped across navigation', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(45000);
    clock.stop();

    const snap = clock.snapshot();
    fake.advance(30000);

    const restored = GameClock.restore(snap, fake.now);
    expect(restored.elapsed).to.equal(45);
    expect(restored.running).to.be.false;
  });

  it('elapsed-only snapshot (pendingTimerRestore pattern) LOSES time', function () {
    const fake = fakeClock(0);
    const clock = new GameClock(fake.now);
    clock.start();
    fake.advance(60000);

    // BAD pattern: capture just the elapsed number
    const capturedElapsed = clock.elapsed; // 60

    // 30 seconds pass
    fake.advance(30000);

    // BAD: restore from the captured number — time in Settings is lost
    expect(capturedElapsed).to.equal(60);
    // The correct elapsed should be 90, but the snapshot only captured 60
    expect(clock.elapsed).to.equal(90);
    expect(capturedElapsed).to.not.equal(clock.elapsed);
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Source contract: playing-time.ts owns the GameClock
 * ═══════════════════════════════════════════════════════════════ */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok, 'playing-time.ts should be fetchable').to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — clock ownership', function () {
  it('imports GameClock from game-clock module', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('game-clock');
    expect(playingTimeSource).to.match(/import.*GameClock/);
  });

  it('does NOT use pendingTimerRestore (old hack)', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.not.match(/pendingTimerRestore\s*[=:{;]|this\.#pendingTimerRestore/);
  });

  it('does NOT capture elapsed as a number for restore', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.not.match(/elapsed:\s*this\.timerBar\.elapsed/);
  });

  it('owns a GameClock instance (not delegated to timer bar)', function () {
    if (!playingTimeSource) this.skip();
    const hasClockField = playingTimeSource.includes('GameClock') &&
      (playingTimeSource.includes('new GameClock') || playingTimeSource.includes('GameClock.restore'));
    expect(hasClockField, 'playing-time.ts must own a GameClock instance').to.be.true;
  });

  it('passes clock state to pt-timer-bar as properties (not method calls)', function () {
    if (!playingTimeSource) this.skip();
    const passesElapsed = playingTimeSource.match(/\.elapsed\b.*=.*(?:gameClock|clock|_clock)/i) ||
      playingTimeSource.match(/\.timerElapsed\b/i) ||
      playingTimeSource.match(/elapsed="\$\{/);
    expect(passesElapsed, 'should pass elapsed time to timer bar as a property').to.not.be.null;
  });
});
