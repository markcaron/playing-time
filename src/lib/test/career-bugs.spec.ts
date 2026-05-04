import { expect } from '@open-wc/testing';

/*
 * Specification: Career times — double-counting and missing paths
 * See: https://github.com/markcaron/playing-time/issues/72
 *
 * Bug 1: Re-entering a game plan and leaving again double-counts
 *         career times. Need a careerTimesApplied guard.
 *
 * Bug 2: Career times only accumulated in #leaveGameSave. Missed
 *         on team switch and browser close.
 *
 * Source-contract tests verify the fix architecture.
 */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok).to.be.true;
  playingTimeSource = await resp.text();
});

/* ═══════════════════════════════════════════════════════════════
 * Bug 1: Double-counting guard
 * ═══════════════════════════════════════════════════════════════ */

describe('playing-time.ts — career double-counting guard', function () {
  it('game plan has a careerTimesApplied flag', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('careerTimesApplied');
  });

  it('checks careerTimesApplied before accumulating', function () {
    if (!playingTimeSource) this.skip();
    const updateSection = playingTimeSource.match(/updateCareerTimes[\s\S]{0,500}/);
    expect(updateSection, 'updateCareerTimes method should exist').to.not.be.null;
    expect(updateSection![0]).to.include('careerTimesApplied');
  });

  it('sets careerTimesApplied after accumulation', function () {
    if (!playingTimeSource) this.skip();
    const hasSet = playingTimeSource.match(
      /careerTimesApplied\s*=\s*true/
    );
    expect(hasSet, 'must set careerTimesApplied = true after accumulating').to.not.be.null;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Bug 2: Missing accumulation paths
 * ═══════════════════════════════════════════════════════════════ */

describe('playing-time.ts — career accumulation on all exit paths', function () {
  it('accumulates career times in leaveGameSave', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('leaveGameSave');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.match(/updateCareerTimes|careerTimes/);
  });

  it('accumulates career times in onTeamSwitched', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('onTeamSwitched');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.match(/updateCareerTimes|careerTimes/);
  });

  it('has a beforeunload handler as a safety net', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('beforeunload');
  });

  it('beforeunload handler saves career times', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('beforeunload');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.match(/updateCareerTimes|careerTimes|saveState/);
  });
});
