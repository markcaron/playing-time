import { expect } from '@open-wc/testing';

/*
 * Specification: pt-timer-bar reads from parent, doesn't own clock
 * See: https://github.com/markcaron/playing-time/issues/56
 *
 * Bug: pt-timer-bar has timerElapsed as a @property (set by parent)
 * but still runs its own setInterval + _elapsed++. Two clocks run
 * independently. The display comes from _elapsed, not timerElapsed.
 *
 * Fix: remove _elapsed, _running, setInterval, _startTimer,
 * _stopTimer from pt-timer-bar. Render from timerElapsed property.
 * Parent owns the clock and drives updates.
 */

let timerBarSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/pt-timer-bar.ts');
  expect(resp.ok, 'pt-timer-bar.ts should be fetchable').to.be.true;
  timerBarSource = await resp.text();
});

describe('pt-timer-bar.ts — does NOT own a clock', function () {
  it('does NOT have _elapsed state', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.match(/_elapsed\s*[=;]/);
  });

  it('does NOT have _timerInterval', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.include('_timerInterval');
  });

  it('does NOT call setInterval', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.match(/setInterval\s*\(/);
  });

  it('does NOT call clearInterval', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.match(/clearInterval\s*\(/);
  });

  it('does NOT have _startTimer method', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.include('_startTimer');
  });

  it('does NOT have _stopTimer method', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.include('_stopTimer');
  });

  it('does NOT have _running state', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.match(/_running\s*[=;]/);
  });

  it('does NOT have restoreTimer method', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.not.include('restoreTimer');
  });
});

describe('pt-timer-bar.ts — renders from parent-owned properties', function () {
  it('has timerElapsed as a @property', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.include('timerElapsed');
    expect(timerBarSource).to.match(/@property.*timerElapsed|timerElapsed.*@property/s);
  });

  it('has timerRunning as a @property', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.include('timerRunning');
    expect(timerBarSource).to.match(/@property.*timerRunning|timerRunning.*@property/s);
  });

  it('uses timerElapsed in the time display', function () {
    if (!timerBarSource) this.skip();
    expect(timerBarSource).to.match(/timerElapsed|this\.timerElapsed/);
  });
});
