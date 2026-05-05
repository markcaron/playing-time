import { expect } from '@open-wc/testing';

/*
 * Specification: Game clock resets when starting a new match
 * See: https://github.com/markcaron/playing-time/issues/84
 *
 * Bug: #gameClock persists across game plans. New matches start
 * with stale elapsed time from previous matches.
 *
 * Fix: reset the clock when loading/creating a new game plan.
 */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok).to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — clock reset on new match', function () {
  it('resets gameClock when loading a game plan', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('loadGamePlan');
    expect(idx, 'loadGamePlan should exist').to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 800);
    expect(section).to.match(/gameClock.*reset|#gameClock.*reset/);
  });

  it('resets gameClock when creating a new game plan', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('onCreateGamePlan');
    expect(idx, 'onCreateGamePlan should exist').to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 800);
    const hasReset = section.match(/gameClock.*reset|#gameClock.*reset|loadGamePlan/);
    expect(hasReset, 'must reset clock or delegate to loadGamePlan which resets').to.not.be.null;
  });

  it('resets lastTickElapsed when loading a game plan', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('loadGamePlan');
    const section = playingTimeSource.slice(idx, idx + 800);
    expect(section).to.match(/lastTickElapsed\s*=\s*0/);
  });

  it('stops polling when leaving a game before loading new plan', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('loadGamePlan');
    const section = playingTimeSource.slice(idx, idx + 800);
    expect(section).to.match(/stopPolling|#stopPolling/);
  });
});
