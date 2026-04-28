import { expect } from '@open-wc/testing';

/*
 * Specification: Player time tracking uses clock delta, not +1
 * See: https://github.com/markcaron/playing-time/issues/61
 *
 * Bug: #onTimerTick increments player times by +1 per tick. If the
 * interval is throttled (device sleep), player times fall behind
 * even though GameClock.elapsed is correct.
 *
 * Fix: compute delta from GameClock.elapsed, use applyTimeDelta
 * with the actual delta instead of hardcoded +1.
 *
 * These source-contract tests verify playing-time.ts uses the
 * delta pattern and imports applyTimeDelta.
 */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok, 'playing-time.ts should be fetchable via /__raw/').to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — delta-based player time updates', function () {
  it('imports applyTimeDelta from player-times module', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('player-times');
    expect(playingTimeSource).to.match(/import.*applyTimeDelta/);
  });

  it('does NOT increment player times by +1 per tick', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.not.match(/\+ 1\b.*half1Time|half1Time.*\+ 1\b/);
    expect(playingTimeSource).to.not.match(/\+ 1\b.*half2Time|half2Time.*\+ 1\b/);
    expect(playingTimeSource).to.not.match(/\+ 1\b.*benchTime|benchTime.*\+ 1\b/);
    expect(playingTimeSource).to.not.match(/\+ 1\b.*onFieldTime|onFieldTime.*\+ 1\b/);
  });

  it('tracks lastTickElapsed for computing deltas', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.match(/lastTickElapsed|lastProcessedElapsed|_lastElapsed/);
  });

  it('computes delta from GameClock elapsed', function () {
    if (!playingTimeSource) this.skip();
    const hasDelta = playingTimeSource.match(/elapsed\s*-\s*(?:this\.#?(?:lastTickElapsed|lastProcessedElapsed|_lastElapsed))/);
    expect(hasDelta, 'should compute delta = elapsed - lastTickElapsed').to.not.be.null;
  });

  it('calls applyTimeDelta with the computed delta', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.match(/applyTimeDelta\s*\(/);
  });

  it('resets lastTickElapsed on game or half reset', function () {
    if (!playingTimeSource) this.skip();
    const resetSection = playingTimeSource.match(
      /onResetGame|onResetHalf|resetGame|resetHalf/
    );
    expect(resetSection, 'should have reset handler(s)').to.not.be.null;
    const hasResetLastTick = playingTimeSource.match(
      /lastTickElapsed\s*=\s*0|lastProcessedElapsed\s*=\s*0|_lastElapsed\s*=\s*0/
    );
    expect(hasResetLastTick, 'must reset lastTickElapsed to 0 on game/half reset').to.not.be.null;
  });
});
