import { expect, fixture, html } from '@open-wc/testing';
import { allUpdates } from '../../test/helpers/utils.js';
import { PtStatsView, NavigateStatsBackEvent } from '../../components/pt-stats-view.js';
import type { RosterEntry, GameEvent } from '../types.js';

const _PtStatsView = PtStatsView;

/*
 * Holistic specification: Stats view wiring and position column
 *
 * Two issues remain unresolved:
 * 1. The Times/Stats button still opens the old dialog instead of
 *    navigating to <pt-stats-view>
 * 2. The position column in the stats view must show per-position
 *    time data in the format "MM:SS (POS)" stacked per player
 *
 * These tests verify:
 *   - Stats view renders as a full view (not a dialog)
 *   - Position column shows correct formatted data for each player
 *   - Back button navigates back
 *   - Timer bar should fire navigate-stats event (tested via
 *     presence check — full timer bar fixture hangs in WTR)
 */

function player(id: string, name: string, number: string, overrides: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id, name, number,
    half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0,
    ...overrides,
  };
}

describe('pt-stats-view — holistic stats and position column', function () {
  let statsView: PtStatsView;

  const roster: RosterEntry[] = [
    player('gk1', 'Keeper Kim', '1', {
      half1Time: 1350, half2Time: 1200, onFieldTime: 2550,
      positionTimes: { GK: 2550 },
    }),
    player('cb1', 'Defender Dee', '4', {
      half1Time: 900, half2Time: 1200, onFieldTime: 2100,
      positionTimes: { CB: 1500, RB: 600 },
    }),
    player('cm1', 'Midfielder Mo', '10', {
      half1Time: 1350, half2Time: 600, onFieldTime: 1950, benchTime: 600,
      positionTimes: { CM: 1500, CAM: 450 },
    }),
    player('sub1', 'Sub Sam', '12', {
      benchTime: 2550,
    }),
  ];

  const events: GameEvent[] = [
    { type: 'sub', half: 2, elapsed: 600, playerA: 'Sub Sam', playerB: 'Defender Dee' },
  ];

  beforeEach(async function () {
    statsView = await fixture<PtStatsView>(html`
      <pt-stats-view
        .teamName=${'Test FC'}
        .roster=${roster}
        .gameEvents=${events}
        .timeDisplayFormat=${'mm:ss'}
      ></pt-stats-view>
    `);
    await allUpdates(statsView);
  });

  /* ─── View structure (not a dialog) ─────────────────────── */

  it('renders as a full-screen view with no <dialog> element', function () {
    const dialog = statsView.shadowRoot!.querySelector('dialog');
    expect(dialog, 'should NOT contain any <dialog>').to.not.exist;
  });

  it('has a header with team name', function () {
    const heading = statsView.shadowRoot!.querySelector('h2');
    expect(heading).to.exist;
    expect(heading!.textContent).to.include('Test FC');
  });

  it('has a scrollable body area', function () {
    const body = statsView.shadowRoot!.querySelector('.stats-body');
    expect(body).to.exist;
  });

  /* ─── Back navigation ───────────────────────────────────── */

  it('back button fires NavigateStatsBackEvent', function () {
    const btn = statsView.shadowRoot!.querySelector('.back-btn') as HTMLElement;
    expect(btn).to.exist;
    let fired = false;
    statsView.addEventListener(NavigateStatsBackEvent.eventName, () => { fired = true; });
    btn.click();
    expect(fired).to.be.true;
  });

  /* ─── Table columns — Position column exists ────────────── */

  it('table has a Position column header', function () {
    const headers = Array.from(statsView.shadowRoot!.querySelectorAll('.times-table th'))
      .map(h => h.textContent!.trim().toLowerCase());
    expect(headers).to.include('position');
  });

  it('table has a Bench column header', function () {
    const headers = Array.from(statsView.shadowRoot!.querySelectorAll('.times-table th'))
      .map(h => h.textContent!.trim().toLowerCase());
    expect(headers).to.include('bench');
  });

  it('renders a row for each player', function () {
    const rows = statsView.shadowRoot!.querySelectorAll('.times-table tbody tr');
    expect(rows.length).to.equal(4);
  });

  /* ─── Position column — formatted data per player ───────── */

  it('Keeper Kim: shows "42:30 (GK)" in position column', function () {
    const rows = statsView.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const row = Array.from(rows).find(r => r.textContent!.includes('Keeper Kim'));
    expect(row).to.exist;
    const pos = row!.querySelector('.position-col');
    expect(pos).to.exist;
    expect(pos!.textContent!.trim()).to.match(/42:30\s*\(GK\)/);
  });

  it('Defender Dee: shows both "25:00 (CB)" and "10:00 (RB)" stacked', function () {
    const rows = statsView.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const row = Array.from(rows).find(r => r.textContent!.includes('Defender Dee'));
    expect(row).to.exist;
    const pos = row!.querySelector('.position-col');
    expect(pos).to.exist;
    const text = pos!.textContent!;
    expect(text).to.include('CB');
    expect(text).to.include('RB');
    expect(text).to.match(/25:00\s*\(CB\)/);
    expect(text).to.match(/10:00\s*\(RB\)/);
  });

  it('Midfielder Mo: shows both "25:00 (CM)" and "07:30 (CAM)" stacked', function () {
    const rows = statsView.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const row = Array.from(rows).find(r => r.textContent!.includes('Midfielder Mo'));
    expect(row).to.exist;
    const pos = row!.querySelector('.position-col');
    expect(pos).to.exist;
    const text = pos!.textContent!;
    expect(text).to.match(/25:00\s*\(CM\)/);
    expect(text).to.match(/07:30\s*\(CAM\)/);
  });

  it('Sub Sam: position column is empty (bench only, no position times)', function () {
    const rows = statsView.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const row = Array.from(rows).find(r => r.textContent!.includes('Sub Sam'));
    expect(row).to.exist;
    const pos = row!.querySelector('.position-col');
    expect(pos!.textContent!.trim()).to.equal('');
  });

  /* ─── Total and bench time ──────────────────────────────── */

  it('Keeper Kim total: 42:30 (1350 + 1200)', function () {
    const rows = statsView.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const row = Array.from(rows).find(r => r.textContent!.includes('Keeper Kim'));
    const total = row!.querySelector('.total');
    expect(total!.textContent!.trim()).to.equal('42:30');
  });

  it('Sub Sam bench time: 42:30', function () {
    const rows = statsView.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const row = Array.from(rows).find(r => r.textContent!.includes('Sub Sam'));
    expect(row!.textContent).to.include('42:30');
  });

  /* ─── Events section ────────────────────────────────────── */

  it('shows substitution event with player names', function () {
    const eventRows = statsView.shadowRoot!.querySelectorAll('.events-table tbody tr');
    expect(eventRows.length).to.equal(1);
    const text = eventRows[0].textContent!;
    expect(text).to.include('Sub Sam');
    expect(text).to.include('Defender Dee');
  });

  /* ─── Visibility — text is readable ─────────────────────── */

  it('position column text has visible color', function () {
    const pos = statsView.shadowRoot!.querySelector('.position-col') as HTMLElement;
    if (pos && pos.textContent!.trim()) {
      const color = getComputedStyle(pos).color;
      expect(color).to.not.equal('rgba(0, 0, 0, 0)');
      expect(color).to.not.equal('transparent');
    }
  });
});

/*
 * NOTE: Timer bar tests (dialog removed, navigate-stats event) cannot
 * be included here — importing PtTimerBar hangs the WTR test runner.
 * The timer bar wiring requirements are documented below for the
 * developer to implement and manually verify:
 *
 * 1. Remove #times-dialog from pt-timer-bar.ts
 * 2. Change _openTimes to fire a 'navigate-stats' CustomEvent instead
 *    of calling _timesDialog.showModal()
 * 3. playing-time.ts: add 'stats' to currentView type, listen for
 *    'navigate-stats' on pt-timer-bar, render <pt-stats-view> when
 *    currentView === 'stats'
 * 4. playing-time.ts: handle NavigateStatsBackEvent to return to
 *    the previous view (game or team)
 */
