import { expect, fixture, html } from '@open-wc/testing';
import { allUpdates } from '../../test/helpers/utils.js';
import { PtStatsView } from '../../components/pt-stats-view.js';
import type { RosterEntry, GameEvent } from '../types.js';

const _PtStatsView = PtStatsView;

/*
 * Specification: Times/Stats view — tabbed layout
 *
 * The Stats view has 4 tabs: Totals, Halves, Positions, Subs.
 * Tabs use the same ARIA tablist/tab/tabpanel pattern as pt-team-view.
 * Default active tab is Totals.
 *
 * Totals:    #, Player, Total, Bench
 * Halves:    #, Player, 1st, 2nd
 * Positions: #, Player, Position tags (horizontal, wrapped, styled)
 * Subs:      Substitutions & Swaps event list
 */

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
  player('sub1', 'Sub Sam', '12', { benchTime: 2550 }),
];

const EVENTS: GameEvent[] = [
  { type: 'sub', half: 2, elapsed: 600, playerA: 'Sub Sam', playerB: 'Defender Dee' },
];

describe('<pt-stats-view> — tabbed layout', function () {
  let el: PtStatsView;

  beforeEach(async function () {
    el = await fixture<PtStatsView>(html`
      <pt-stats-view
        .teamName=${'Test FC'}
        .roster=${ROSTER}
        .gameEvents=${EVENTS}
        .timeDisplayFormat=${'mm:ss'}
      ></pt-stats-view>
    `);
    await allUpdates(el);
  });

  /* ═══════════════════════════════════════════════════════════
   * Tab structure — matches pt-team-view ARIA pattern
   * ═══════════════════════════════════════════════════════════ */

  it('has a tablist with role="tablist"', function () {
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]');
    expect(tablist, 'tablist must exist').to.exist;
  });

  it('has 4 tabs: Totals, Halves, Positions, Subs', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    expect(tabs).to.have.length(4);
    const labels = tabs.map(t => t.textContent!.trim().toLowerCase());
    expect(labels).to.include('totals');
    expect(labels).to.include('halves');
    expect(labels).to.include('positions');
    expect(labels.some(l => l.includes('sub'))).to.be.true;
  });

  it('Totals tab is active by default', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const active = tabs.find(t => t.getAttribute('aria-selected') === 'true');
    expect(active).to.exist;
    expect(active!.textContent!.trim().toLowerCase()).to.equal('totals');
  });

  it('has 4 tabpanels with role="tabpanel"', function () {
    const panels = el.shadowRoot!.querySelectorAll('[role="tabpanel"]');
    expect(panels.length).to.be.at.least(4);
  });

  it('only the Totals panel is visible by default', function () {
    const panels = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]'));
    const visible = panels.filter(p => !p.hasAttribute('hidden'));
    expect(visible).to.have.length(1);
  });

  /* ═══════════════════════════════════════════════════════════
   * Totals tab — #, Player, Total, Bench
   * ═══════════════════════════════════════════════════════════ */

  it('Totals tab has columns: #, Player, Total, Bench', function () {
    const panel = el.shadowRoot!.querySelector('[role="tabpanel"]:not([hidden])');
    expect(panel).to.exist;
    const headers = Array.from(panel!.querySelectorAll('th')).map(h => h.textContent!.trim().toLowerCase());
    expect(headers.some(h => h.includes('#') || h.includes('number'))).to.be.true;
    expect(headers.some(h => h.includes('player') || h.includes('name'))).to.be.true;
    expect(headers.some(h => h.includes('total'))).to.be.true;
    expect(headers.some(h => h.includes('bench'))).to.be.true;
  });

  it('Totals tab shows correct total for Keeper Kim: 42:30', function () {
    const panel = el.shadowRoot!.querySelector('[role="tabpanel"]:not([hidden])');
    const rows = panel!.querySelectorAll('tbody tr');
    const kimRow = Array.from(rows).find(r => r.textContent!.includes('Keeper Kim'));
    expect(kimRow).to.exist;
    expect(kimRow!.textContent).to.include('42:30');
  });

  it('Totals tab shows bench time for Sub Sam: 42:30', function () {
    const panel = el.shadowRoot!.querySelector('[role="tabpanel"]:not([hidden])');
    const rows = panel!.querySelectorAll('tbody tr');
    const subRow = Array.from(rows).find(r => r.textContent!.includes('Sub Sam'));
    expect(subRow).to.exist;
    expect(subRow!.textContent).to.include('42:30');
  });

  it('Totals tab does NOT have 1st/2nd half columns', function () {
    const panel = el.shadowRoot!.querySelector('[role="tabpanel"]:not([hidden])');
    const headers = Array.from(panel!.querySelectorAll('th')).map(h => h.textContent!.trim().toLowerCase());
    expect(headers.some(h => h.includes('1st'))).to.be.false;
    expect(headers.some(h => h.includes('2nd'))).to.be.false;
  });

  it('Totals tab does NOT have Position column', function () {
    const panel = el.shadowRoot!.querySelector('[role="tabpanel"]:not([hidden])');
    const headers = Array.from(panel!.querySelectorAll('th')).map(h => h.textContent!.trim().toLowerCase());
    expect(headers.some(h => h.includes('position'))).to.be.false;
  });

  /* ═══════════════════════════════════════════════════════════
   * Positions tab — tags with horizontal wrap
   * ═══════════════════════════════════════════════════════════ */

  it('Positions tab shows position tags as styled spans', function () {
    // Activate Positions tab
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const posTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'positions') as HTMLElement;
    expect(posTab).to.exist;
    posTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      expect(panel).to.exist;
      const tags = panel!.querySelectorAll('.position-tag');
      expect(tags.length, 'should have position tags').to.be.greaterThan(0);
    });
  });

  it('Position tags contain time and position name like "25:00 (CB)"', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const posTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'positions') as HTMLElement;
    posTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      const tags = Array.from(panel!.querySelectorAll('.position-tag'));
      const cbTag = tags.find(t => t.textContent!.includes('CB'));
      expect(cbTag, 'should have a CB tag').to.exist;
      expect(cbTag!.textContent).to.match(/\d{2}:\d{2}\s*\(?CB\)?/);
    });
  });

  it('Position tags are displayed horizontally (not stacked vertically)', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const posTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'positions') as HTMLElement;
    posTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      const deeRow = Array.from(panel!.querySelectorAll('tbody tr')).find(r => r.textContent!.includes('Defender Dee'));
      expect(deeRow).to.exist;
      const cell = deeRow!.querySelector('.position-col, td:last-child') as HTMLElement;
      expect(cell).to.exist;
      const style = getComputedStyle(cell);
      const isHorizontal = style.display === 'flex' || style.display === 'inline-flex' ||
        style.display === 'inline' || cell.querySelector('.position-tag + .position-tag') !== null;
      expect(isHorizontal, 'tags should be horizontal, not stacked').to.be.true;
    });
  });

  it('Position tags have tag-like styling (background, border-radius, padding)', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const posTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'positions') as HTMLElement;
    posTab.click();

    return el.updateComplete.then(() => {
      const tag = el.shadowRoot!.querySelector('.position-tag') as HTMLElement;
      expect(tag).to.exist;
      const style = getComputedStyle(tag);
      expect(parseFloat(style.borderRadius)).to.be.greaterThan(0);
      expect(parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)).to.be.greaterThan(0);
    });
  });

  it('Position tags font size matches other table columns', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const posTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'positions') as HTMLElement;
    posTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      const tag = panel!.querySelector('.position-tag') as HTMLElement;
      const nameCell = panel!.querySelector('tbody td:nth-child(2)') as HTMLElement;
      expect(tag).to.exist;
      expect(nameCell).to.exist;
      const tagSize = parseFloat(getComputedStyle(tag).fontSize);
      const nameSize = parseFloat(getComputedStyle(nameCell).fontSize);
      expect(tagSize).to.be.at.least(nameSize * 0.9);
    });
  });

  /* ═══════════════════════════════════════════════════════════
   * Subs tab
   * ═══════════════════════════════════════════════════════════ */

  it('Subs tab shows substitution events', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const subsTab = tabs.find(t => t.textContent!.trim().toLowerCase().includes('sub')) as HTMLElement;
    expect(subsTab).to.exist;
    subsTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      expect(panel).to.exist;
      expect(panel!.textContent).to.include('Sub Sam');
      expect(panel!.textContent).to.include('Defender Dee');
    });
  });
});
