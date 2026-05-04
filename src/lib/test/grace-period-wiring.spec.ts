import { expect } from '@open-wc/testing';

/*
 * Specification: PositionTracker grace period wired in playing-time.ts
 * See: https://github.com/markcaron/playing-time/issues/67
 *
 * The PositionTracker has grace period methods (onFormationChange,
 * onSwapOrSub, transferGraceTime, tick) but they aren't called from
 * playing-time.ts. Position times are correct for steady play but
 * inaccurate around formation changes and substitutions.
 *
 * These tests verify the 4 grace period methods are called at the
 * correct points in the source code.
 */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok).to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — grace period: formation change', function () {
  it('calls positionTracker.onFormationChange() in the formation change handler', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('onFormationChanged');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.match(/positionTracker.*onFormationChange|#positionTracker.*onFormationChange/);
  });
});

describe('playing-time.ts — grace period: swap/sub notification', function () {
  it('calls positionTracker.onSwapOrSub() in the substitution handler', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('doSubstitution');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 800);
    expect(section).to.match(/positionTracker.*onSwapOrSub|#positionTracker.*onSwapOrSub/);
  });

  it('calls positionTracker.onSwapOrSub() in the swap handler', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('swapFieldPositions');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 800);
    expect(section).to.match(/positionTracker.*onSwapOrSub|#positionTracker.*onSwapOrSub/);
  });
});

describe('playing-time.ts — grace period: transfer buffered time', function () {
  it('calls positionTracker.transferGraceTime() after substitution', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('doSubstitution');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 800);
    expect(section).to.match(/positionTracker.*transferGraceTime|#positionTracker.*transferGraceTime/);
  });
});

describe('playing-time.ts — grace period: tick evaluation', function () {
  it('calls positionTracker.tick() in the polling loop', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('startPolling') !== -1
      ? playingTimeSource.indexOf('startPolling')
      : playingTimeSource.indexOf('setInterval');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.match(/positionTracker.*\.tick|#positionTracker.*\.tick/);
  });
});
