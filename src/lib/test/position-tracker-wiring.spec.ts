import { expect } from '@open-wc/testing';

/*
 * Specification: PositionTracker wired into playing-time.ts
 * See: https://github.com/markcaron/playing-time/issues/64
 *
 * The PositionTracker class is specified (position-tracker.spec.ts,
 * 21 tests) but not implemented. Even once implemented, it must be
 * imported and used in playing-time.ts for position times to appear
 * in the stats view during gameplay.
 *
 * These source-contract tests force the developer to:
 * 1. Create src/lib/position-tracker.ts
 * 2. Import and instantiate it in playing-time.ts
 * 3. Call accumulate() in the tick loop
 * 4. Merge positionTimes into roster entries
 * 5. Reset the tracker on game/half reset
 */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok, 'playing-time.ts should be fetchable via /__raw/').to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — PositionTracker integration', function () {
  it('imports PositionTracker from position-tracker module', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('position-tracker');
    expect(playingTimeSource).to.match(/import.*PositionTracker/);
  });

  it('creates a PositionTracker instance', function () {
    if (!playingTimeSource) this.skip();
    const hasInstance = playingTimeSource.includes('new PositionTracker') ||
      playingTimeSource.includes('PositionTracker.restore');
    expect(hasInstance, 'must instantiate PositionTracker').to.be.true;
  });

  it('calls accumulate() in the tick/polling loop', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.match(/\.accumulate\s*\(/);
  });

  it('reads positionTimes via getAllPositionTimes()', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.match(/getAllPositionTimes\s*\(/);
  });

  it('writes positionTimes to roster entries', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('positionTimes');
  });

  it('resets the PositionTracker on game reset', function () {
    if (!playingTimeSource) this.skip();
    const resetSection = playingTimeSource.slice(
      playingTimeSource.indexOf('onResetGame'),
      playingTimeSource.indexOf('onResetGame') + 500
    );
    const hasTrackerReset = resetSection.match(
      /positionTracker.*\.reset|#positionTracker.*\.reset|tracker.*\.reset(?!.*gameClock)/i
    );
    expect(hasTrackerReset, 'must reset PositionTracker (not just GameClock) on game reset').to.not.be.null;
  });

  it('passes positionTimes to pt-stats-view', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.match(/pt-stats-view[\s\S]{0,500}positionTimes|positionTimes[\s\S]{0,500}pt-stats-view/);
  });
});
