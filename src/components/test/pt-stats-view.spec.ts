import { expect, fixture, html } from '@open-wc/testing';
import { allUpdates } from '../../test/helpers/utils.js';
import { PtStatsView, NavigateStatsBackEvent } from '../pt-stats-view.js';
import type { RosterEntry, GameEvent } from '../../lib/types.js';

/*
 * Specification: Times/Stats full-screen view
 * See: .cursor/plans/player_position_tracking_0e77d415.plan.md
 *
 * Replaces the #times-dialog in pt-timer-bar.ts with a full-screen
 * view component. Adds a Position column showing per-position time
 * stacked as "07:32 (RB)\n03:15 (CM)" per player row.
 *
 * Navigation: accessible from game (clipboard button) and team hub.
 * Fires NavigateStatsBackEvent to return to the previous view.
 */

/* ─── Helpers ─────────────────────────────────────────────── */

function player(id: string, name: string, number: string, overrides: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id, name, number,
    half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0,
    ...overrides,
  };
}

const ROSTER: RosterEntry[] = [
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
    half1Time: 0, half2Time: 0, benchTime: 2550, onFieldTime: 0,
  }),
];

const EVENTS: GameEvent[] = [
  { type: 'sub', half: 2, elapsed: 600, playerA: 'Midfielder Mo', playerB: 'Sub Sam' },
];

/* ─── Component basics ────────────────────────────────────── */

describe('<pt-stats-view>', function () {
  let element: PtStatsView;

  beforeEach(async function () {
    element = await fixture<PtStatsView>(html`
      <pt-stats-view
        .teamName=${'Test FC'}
        .roster=${ROSTER}
        .gameEvents=${EVENTS}
        .timeDisplayFormat=${'mm:ss'}
      ></pt-stats-view>
    `);
    await allUpdates(element);
  });

  it('is a custom element', function () {
    expect(element).to.be.an.instanceOf(PtStatsView);
  });

  it('NavigateStatsBackEvent has the correct event name', function () {
    expect(NavigateStatsBackEvent.eventName).to.equal('navigate-stats-back');
  });

  it('is accessible', async function () {
    await expect(element).to.be.accessible();
  });

  it('shows the team name in the heading', function () {
    const heading = element.shadowRoot!.querySelector('h1, h2');
    expect(heading).to.exist;
    expect(heading!.textContent).to.include('Test FC');
  });

  it('has a back/close button', function () {
    const btn = element.shadowRoot!.querySelector('.back-btn, .close-btn');
    expect(btn).to.exist;
  });

  it('fires navigate-stats-back when back is clicked', function () {
    const btn = element.shadowRoot!.querySelector('.back-btn, .close-btn') as HTMLElement;
    let fired = false;
    element.addEventListener(NavigateStatsBackEvent.eventName, () => { fired = true; });
    btn.click();
    expect(fired).to.be.true;
  });

  /* ─── Playing Time table ──────────────────────────────── */

  it('renders a Playing Time table', function () {
    const table = element.shadowRoot!.querySelector('.times-table');
    expect(table).to.exist;
  });

  it('has columns: #, Player, 1H, 2H, Total, Position', function () {
    const headers = Array.from(element.shadowRoot!.querySelectorAll('.times-table th'))
      .map(th => th.textContent!.trim());
    expect(headers).to.include('#');
    expect(headers).to.include.members(['1st', '2nd', 'Total']);
    expect(headers.some(h => /position/i.test(h))).to.be.true;
  });

  it('renders a row for each player', function () {
    const rows = element.shadowRoot!.querySelectorAll('.times-table tbody tr');
    expect(rows.length).to.equal(ROSTER.length);
  });

  /* ─── Position column ───────────────────────────────────── */

  it('shows position times in the Position column', function () {
    const positionCells = element.shadowRoot!.querySelectorAll('.position-col');
    expect(positionCells.length).to.be.greaterThan(0);
  });

  it('displays position time with format "MM:SS (POS)"', function () {
    const positionCells = element.shadowRoot!.querySelectorAll('.position-col');
    const cbRow = Array.from(positionCells).find(cell =>
      cell.textContent!.includes('CB') || cell.textContent!.includes('RB')
    );
    expect(cbRow, 'should find a cell with CB or RB position time').to.exist;
    expect(cbRow!.textContent).to.match(/\d{2}:\d{2}\s*\((?:CB|RB)\)/);
  });

  it('stacks multiple positions in a single cell', function () {
    const positionCells = Array.from(element.shadowRoot!.querySelectorAll('.position-col'));
    const multiPosCell = positionCells.find(cell => {
      const text = cell.textContent!;
      return text.includes('CB') && text.includes('RB');
    });
    expect(multiPosCell, 'Defender Dee should have both CB and RB times').to.exist;
  });

  it('omits positions with 0 time for bench-only players', function () {
    const rows = element.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const subRow = Array.from(rows).find(row =>
      row.textContent!.includes('Sub Sam')
    );
    expect(subRow, 'Sub Sam row should exist').to.exist;
    const posCell = subRow!.querySelector('.position-col');
    expect(posCell!.textContent!.trim()).to.equal('');
  });

  /* ─── Total column ──────────────────────────────────────── */

  it('renders correct total (1H + 2H) for a player', function () {
    const rows = element.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const keeperRow = Array.from(rows).find(row =>
      row.textContent!.includes('Keeper Kim')
    );
    expect(keeperRow, 'Keeper Kim row should exist').to.exist;
    const totalCell = keeperRow!.querySelector('.total');
    // 1350 + 1200 = 2550s = 42:30
    expect(totalCell!.textContent!.trim()).to.equal('42:30');
  });

  /* ─── Bench time ────────────────────────────────────────── */

  it('shows bench time for players who were subbed', function () {
    const rows = element.shadowRoot!.querySelectorAll('.times-table tbody tr');
    const moRow = Array.from(rows).find(row =>
      row.textContent!.includes('Midfielder Mo')
    );
    expect(moRow, 'Midfielder Mo row should exist').to.exist;
    expect(moRow!.textContent).to.include('10:00');
  });

  /* ─── Substitutions & Swaps section ─────────────────────── */

  it('renders the Substitutions & Swaps section', function () {
    const heading = Array.from(element.shadowRoot!.querySelectorAll('h3'))
      .find(h => h.textContent!.includes('Substitution'));
    expect(heading).to.exist;
  });

  it('shows game events', function () {
    const eventRows = element.shadowRoot!.querySelectorAll('.events-table tbody tr');
    expect(eventRows.length).to.equal(1);
  });
});
