import { expect } from '@open-wc/testing';

/*
 * Source-level contract tests: pt-timer-bar.ts
 *
 * These tests read the actual source file and assert structural
 * requirements. This approach bypasses the WTR hang that occurs
 * when importing PtTimerBar as a component.
 *
 * WHY: The user reports that the Times/Stats button STILL opens
 * a dialog instead of navigating to the full-screen stats view.
 * The <pt-stats-view> component works (15 tests pass), but the
 * timer bar hasn't been updated to use it. These tests make it
 * impossible to pass without making the actual code change.
 */

let timerBarSource: string;
let playingTimeSource: string;

before(async function () {
  const timerBarResp = await fetch('/src/components/pt-timer-bar.ts');
  expect(timerBarResp.ok, 'pt-timer-bar.ts should be fetchable from the dev server').to.be.true;
  timerBarSource = await timerBarResp.text();

  const playingTimeResp = await fetch('/src/components/playing-time.ts');
  expect(playingTimeResp.ok, 'playing-time.ts should be fetchable from the dev server').to.be.true;
  playingTimeSource = await playingTimeResp.text();
});

/* ═══════════════════════════════════════════════════════════════
 * pt-timer-bar.ts — dialog must be REMOVED
 * ═══════════════════════════════════════════════════════════════ */

describe('pt-timer-bar.ts — Times/Stats dialog removal', function () {
  it('does NOT contain #times-dialog', function () {
    expect(timerBarSource).to.not.include('#times-dialog');
  });

  it('does NOT contain _timesDialog', function () {
    expect(timerBarSource).to.not.include('_timesDialog');
  });

  it('does NOT contain _openTimes that calls showModal', function () {
    expect(timerBarSource).to.not.match(/showModal/);
  });

  it('does NOT contain _closeTimes', function () {
    expect(timerBarSource).to.not.include('_closeTimes');
  });

  it('does NOT contain times-dialog-body', function () {
    expect(timerBarSource).to.not.include('times-dialog-body');
  });

  it('does NOT contain times-dialog-footer', function () {
    expect(timerBarSource).to.not.include('times-dialog-footer');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * pt-timer-bar.ts — Times/Stats button must fire navigate event
 * ═══════════════════════════════════════════════════════════════ */

describe('pt-timer-bar.ts — Times/Stats button fires navigation event', function () {
  it('dispatches a navigate-stats event', function () {
    expect(timerBarSource).to.include('navigate-stats');
  });

  it('has a NavigateStatsEvent class or CustomEvent with navigate-stats', function () {
    const hasClass = timerBarSource.includes('NavigateStatsEvent');
    const hasCustomEvent = timerBarSource.includes("'navigate-stats'") || timerBarSource.includes('"navigate-stats"');
    expect(hasClass || hasCustomEvent, 'must define or dispatch navigate-stats event').to.be.true;
  });

  it('the .times-btn click handler dispatches the event (not showModal)', function () {
    const timesBtn = timerBarSource.match(/times-btn[\s\S]{0,500}@click/);
    expect(timesBtn, 'times-btn with @click should exist').to.not.be.null;

    const hasDialog = timerBarSource.includes('_openTimes');
    const hasNavigate = timerBarSource.includes('navigate-stats');
    expect(hasNavigate, 'must reference navigate-stats').to.be.true;
    expect(hasDialog, '_openTimes (dialog opener) should be removed').to.be.false;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * playing-time.ts — must render <pt-stats-view> as a view
 * ═══════════════════════════════════════════════════════════════ */

describe('playing-time.ts — stats view wiring', function () {
  it('imports pt-stats-view', function () {
    expect(playingTimeSource).to.include('pt-stats-view');
  });

  it('has "stats" as a currentView value', function () {
    expect(playingTimeSource).to.match(/currentView.*['"]stats['"]/);
  });

  it('renders <pt-stats-view> in the template', function () {
    expect(playingTimeSource).to.include('<pt-stats-view');
  });

  it('listens for navigate-stats event', function () {
    expect(playingTimeSource).to.include('navigate-stats');
  });

  it('listens for navigate-stats-back event', function () {
    expect(playingTimeSource).to.include('navigate-stats-back');
  });
});
