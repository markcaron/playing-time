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
   * Accessibility — ARIA tab pattern (WAI-ARIA APG)
   * ═══════════════════════════════════════════════════════════ */

  it('is accessible (axe audit)', async function () {
    await expect(el).to.be.accessible();
  });

  it('tablist has an aria-label', function () {
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]');
    const label = tablist!.getAttribute('aria-label') || tablist!.getAttribute('aria-labelledby');
    expect(label, 'tablist must have aria-label or aria-labelledby').to.not.be.null;
    expect(label).to.not.be.empty;
  });

  it('each tab has an id and aria-controls pointing to its panel', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    for (const tab of tabs) {
      expect(tab.id, `tab "${tab.textContent!.trim()}" must have an id`).to.not.be.empty;
      const controls = tab.getAttribute('aria-controls');
      expect(controls, `tab "${tab.textContent!.trim()}" must have aria-controls`).to.not.be.null;
      const panel = el.shadowRoot!.getElementById(controls!);
      expect(panel, `aria-controls="${controls}" must point to an existing panel`).to.exist;
      expect(panel!.getAttribute('role')).to.equal('tabpanel');
    }
  });

  it('each tabpanel has aria-labelledby pointing to its tab', function () {
    const panels = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]'));
    for (const panel of panels) {
      const labelledBy = panel.getAttribute('aria-labelledby');
      expect(labelledBy, `panel must have aria-labelledby`).to.not.be.null;
      const tab = el.shadowRoot!.getElementById(labelledBy!);
      expect(tab, `aria-labelledby="${labelledBy}" must point to an existing tab`).to.exist;
      expect(tab!.getAttribute('role')).to.equal('tab');
    }
  });

  it('inactive tabs have aria-selected="false"', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const inactive = tabs.filter(t => t.getAttribute('aria-selected') !== 'true');
    expect(inactive.length).to.equal(3);
    for (const tab of inactive) {
      expect(tab.getAttribute('aria-selected')).to.equal('false');
    }
  });

  it('inactive tabs have tabindex="-1" (only active tab is focusable)', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const active = tabs.find(t => t.getAttribute('aria-selected') === 'true')!;
    const inactive = tabs.filter(t => t.getAttribute('aria-selected') !== 'true');

    expect(active.getAttribute('tabindex')).to.not.equal('-1');
    for (const tab of inactive) {
      expect(tab.getAttribute('tabindex'), `inactive tab "${tab.textContent!.trim()}" must have tabindex="-1"`).to.equal('-1');
    }
  });

  it('ArrowRight moves focus to the next tab', function () {
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]') as HTMLElement;
    const activeTab = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
    activeTab.focus();

    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    return el.updateComplete.then(() => {
      const newActive = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
      expect(newActive).to.exist;
      expect(newActive.textContent!.trim().toLowerCase()).to.equal('halves');
    });
  });

  it('ArrowLeft moves focus to the previous tab (wraps to last)', function () {
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]') as HTMLElement;
    const activeTab = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
    activeTab.focus();

    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));

    return el.updateComplete.then(() => {
      const newActive = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
      expect(newActive).to.exist;
      const label = newActive.textContent!.trim().toLowerCase();
      expect(label.includes('sub'), 'ArrowLeft from first tab should wrap to last (Subs)').to.be.true;
    });
  });

  it('Home key moves focus to the first tab', function () {
    // First move to a non-first tab
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const secondTab = tabs[1] as HTMLElement;
    secondTab.click();

    return el.updateComplete.then(() => {
      const tablist = el.shadowRoot!.querySelector('[role="tablist"]') as HTMLElement;
      tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));

      return el.updateComplete.then(() => {
        const active = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
        expect(active.textContent!.trim().toLowerCase()).to.equal('totals');
      });
    });
  });

  it('End key moves focus to the last tab', function () {
    const tablist = el.shadowRoot!.querySelector('[role="tablist"]') as HTMLElement;
    tablist.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));

    return el.updateComplete.then(() => {
      const active = el.shadowRoot!.querySelector('[role="tab"][aria-selected="true"]') as HTMLElement;
      expect(active.textContent!.trim().toLowerCase()).to.include('sub');
    });
  });

  it('tabpanels have tabindex="0" for keyboard access', function () {
    const panels = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]'));
    for (const panel of panels) {
      expect(panel.getAttribute('tabindex'), `tabpanel must have tabindex="0"`).to.equal('0');
    }
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
   * Halves tab — #, Player, 1st, 2nd
   * ═══════════════════════════════════════════════════════════ */

  it('Halves tab has 1st and 2nd half columns', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const halvesTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'halves') as HTMLElement;
    expect(halvesTab).to.exist;
    halvesTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      expect(panel).to.exist;
      const headers = Array.from(panel!.querySelectorAll('th')).map(h => h.textContent!.trim().toLowerCase());
      expect(headers.some(h => h.includes('1st'))).to.be.true;
      expect(headers.some(h => h.includes('2nd'))).to.be.true;
    });
  });

  it('Halves tab shows correct times for Keeper Kim', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const halvesTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'halves') as HTMLElement;
    halvesTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      const rows = panel!.querySelectorAll('tbody tr');
      const kimRow = Array.from(rows).find(r => r.textContent!.includes('Keeper Kim'));
      expect(kimRow).to.exist;
      expect(kimRow!.textContent).to.include('22:30');
      expect(kimRow!.textContent).to.include('20:00');
    });
  });

  it('Halves tab does NOT have Total or Bench columns', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const halvesTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'halves') as HTMLElement;
    halvesTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      const headers = Array.from(panel!.querySelectorAll('th')).map(h => h.textContent!.trim().toLowerCase());
      expect(headers.some(h => h.includes('total'))).to.be.false;
      expect(headers.some(h => h.includes('bench'))).to.be.false;
    });
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

  it('Defender Dee has both CB and RB tags in the same row', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const posTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'positions') as HTMLElement;
    posTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      const rows = panel!.querySelectorAll('tbody tr');
      const deeRow = Array.from(rows).find(r => r.textContent!.includes('Defender Dee'));
      expect(deeRow).to.exist;
      const tags = Array.from(deeRow!.querySelectorAll('.position-tag'));
      const tagTexts = tags.map(t => t.textContent!);
      expect(tagTexts.some(t => t.includes('CB')), 'should have CB tag').to.be.true;
      expect(tagTexts.some(t => t.includes('RB')), 'should have RB tag').to.be.true;
    });
  });

  it('Sub Sam has no position tags (bench only)', function () {
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('[role="tab"]'));
    const posTab = tabs.find(t => t.textContent!.trim().toLowerCase() === 'positions') as HTMLElement;
    posTab.click();

    return el.updateComplete.then(() => {
      const panel = Array.from(el.shadowRoot!.querySelectorAll('[role="tabpanel"]')).find(p => !p.hasAttribute('hidden'));
      const rows = panel!.querySelectorAll('tbody tr');
      const subRow = Array.from(rows).find(r => r.textContent!.includes('Sub Sam'));
      expect(subRow).to.exist;
      const tags = subRow!.querySelectorAll('.position-tag');
      expect(tags.length).to.equal(0);
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

  /* ═══════════════════════════════════════════════════════════
   * Table accessibility
   * ═══════════════════════════════════════════════════════════ */

  it('tables use proper <thead> and <tbody> structure', function () {
    const tables = el.shadowRoot!.querySelectorAll('table');
    expect(tables.length).to.be.greaterThan(0);
    for (const table of Array.from(tables)) {
      if (table.closest('[hidden]')) continue;
      expect(table.querySelector('thead'), 'table must have thead').to.exist;
      expect(table.querySelector('tbody'), 'table must have tbody').to.exist;
    }
  });

  it('back button has accessible label', function () {
    const btn = el.shadowRoot!.querySelector('.back-btn') as HTMLElement;
    expect(btn).to.exist;
    const label = btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.textContent!.trim();
    expect(label).to.not.be.empty;
  });
});
