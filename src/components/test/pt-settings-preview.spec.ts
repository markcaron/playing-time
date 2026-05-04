import { expect, fixture, html } from '@open-wc/testing';
import { allUpdates } from '../../test/helpers/utils.js';
import { PtSettingsView } from '../pt-settings-view.js';

const _PtSettingsView = PtSettingsView;
if (!customElements.get('pt-settings-view')) {
  throw new Error('pt-settings-view not registered');
}

/*
 * Holistic specification: Settings view — player display group
 *
 * This spec covers the FULL behavior of the 5 player display settings
 * and their preview widget, not just individual elements in isolation.
 *
 * What we verify end-to-end:
 *   1. Layout: 5 settings grouped with preview, in correct order
 *   2. Preview: reflects ALL setting changes visually
 *   3. Events: every setting change fires the correct event with value
 *   4. Persistence: playerDisplayMode passed in is reflected in the UI
 *   5. Visibility: preview text is actually visible (not transparent)
 */

describe('<pt-settings-view> — holistic player display spec', function () {
  let element: PtSettingsView;

  beforeEach(async function () {
    element = await fixture<PtSettingsView>(html`
      <pt-settings-view
        .showOnFieldTime=${true}
        .showBenchTime=${true}
        .largeTimeDisplay=${false}
        .timeDisplayFormat=${'mm:ss'}
        .rosterSort=${'alpha'}
        .playerDisplayMode=${'number'}
      ></pt-settings-view>
    `);
    await allUpdates(element);
  });

  /* ═══════════════════════════════════════════════════════════
   * 1. LAYOUT — settings grouped correctly with preview
   * ═══════════════════════════════════════════════════════════ */

  it('wraps the 5 player settings and preview in a .player-display-group', function () {
    const group = element.shadowRoot!.querySelector('.player-display-group');
    expect(group, 'group container must exist').to.exist;
    expect(group!.querySelector('.settings-preview'), 'preview inside group').to.exist;
    expect(group!.querySelector('.settings-options'), 'options inside group').to.exist;
  });

  it('group uses flex layout (preview left, options right)', function () {
    const group = element.shadowRoot!.querySelector('.player-display-group') as HTMLElement;
    expect(group).to.exist;
    expect(getComputedStyle(group).display).to.equal('flex');
  });

  it('5 player settings appear in order BEFORE Roster sort', function () {
    const text = element.shadowRoot!.textContent!;
    const expected = [
      'Show on-field time',
      'Show bench time',
      'Larger time display',
      'Player timer format',
      'Player label',
    ];
    const sortIdx = text.indexOf('Roster sort');
    expect(sortIdx).to.be.greaterThan(-1);

    let prevIdx = -1;
    for (const label of expected) {
      const idx = text.indexOf(label);
      expect(idx, `"${label}" must exist`).to.be.greaterThan(-1);
      expect(idx, `"${label}" must be after "${expected[expected.indexOf(label) - 1] ?? 'start'}"`).to.be.greaterThan(prevIdx);
      expect(idx, `"${label}" must be before "Roster sort"`).to.be.lessThan(sortIdx);
      prevIdx = idx;
    }
  });

  /* ═══════════════════════════════════════════════════════════
   * 2. PREVIEW — reflects ALL settings, not just existence
   * ═══════════════════════════════════════════════════════════ */

  // --- 2a. Player label (setting 5) ---

  it('preview shows "10" when playerDisplayMode is "number"', function () {
    const label = element.shadowRoot!.querySelector('.settings-preview .player-label');
    expect(label).to.exist;
    expect(label!.textContent!.trim()).to.equal('10');
  });

  it('preview shows "CAM" when playerDisplayMode is changed to "position"', function () {
    element.playerDisplayMode = 'position';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const label = element.shadowRoot!.querySelector('.settings-preview .player-label');
      expect(label).to.exist;
      expect(label!.textContent!.trim()).to.equal('CAM');
    });
  });

  // --- 2b. Show on-field time (setting 1) ---

  it('preview shows on-field time above the circle when ON', function () {
    const time = element.shadowRoot!.querySelector('.settings-preview .player-time');
    expect(time, 'on-field time must be rendered').to.exist;
    expect(time!.textContent!.trim()).to.not.be.empty;
  });

  it('preview hides on-field time when OFF', function () {
    element.showOnFieldTime = false;
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const time = element.shadowRoot!.querySelector('.settings-preview .player-time');
      expect(time, 'on-field time must be hidden').to.not.exist;
    });
  });

  // --- 2c. Show bench time (setting 2) ---

  it('preview shows bench time below the circle when ON', function () {
    const bench = element.shadowRoot!.querySelector('.settings-preview .bench-time');
    expect(bench, 'bench time must be rendered').to.exist;
    expect(bench!.textContent!.trim()).to.not.be.empty;
  });

  it('preview hides bench time when OFF', function () {
    element.showBenchTime = false;
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const bench = element.shadowRoot!.querySelector('.settings-preview .bench-time');
      expect(bench, 'bench time must be hidden').to.not.exist;
    });
  });

  // --- 2d. Larger time display (setting 3) ---

  it('preview time text gets larger when largeTimeDisplay is ON', function () {
    const normalTime = element.shadowRoot!.querySelector('.settings-preview .player-time') as SVGTextElement;
    const normalSize = parseFloat(normalTime?.getAttribute('font-size') ?? '0');

    element.largeTimeDisplay = true;
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const largeTime = element.shadowRoot!.querySelector('.settings-preview .player-time') as SVGTextElement;
      expect(largeTime).to.exist;
      const largeSize = parseFloat(largeTime!.getAttribute('font-size') ?? '0');
      expect(largeSize, 'large font-size must be bigger than normal').to.be.greaterThan(normalSize);
    });
  });

  // --- 2e. Player timer format (setting 4) ---

  it('preview on-field time uses formatTime with mm:ss by default', function () {
    const time = element.shadowRoot!.querySelector('.settings-preview .player-time');
    expect(time).to.exist;
    expect(time!.textContent!.trim()).to.match(/^\d{2}:\d{2}$/);
  });

  it('preview on-field time updates to mm format', function () {
    element.timeDisplayFormat = 'mm';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const time = element.shadowRoot!.querySelector('.settings-preview .player-time');
      expect(time).to.exist;
      const text = time!.textContent!.trim();
      expect(text).to.match(/^\d{2}$/);
    });
  });

  it('preview on-field time updates to m format', function () {
    element.timeDisplayFormat = 'm';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const time = element.shadowRoot!.querySelector('.settings-preview .player-time');
      expect(time).to.exist;
      const text = time!.textContent!.trim();
      expect(text).to.match(/^\d+$/);
      expect(text.length).to.be.lessThanOrEqual(2);
    });
  });

  it('preview bench time reflects mm format', function () {
    element.timeDisplayFormat = 'mm';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const bench = element.shadowRoot!.querySelector('.settings-preview .bench-time');
      expect(bench).to.exist;
      expect(bench!.textContent!.trim()).to.match(/^\d{2}$/);
    });
  });

  it('preview bench time reflects m format', function () {
    element.timeDisplayFormat = 'm';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const bench = element.shadowRoot!.querySelector('.settings-preview .bench-time');
      expect(bench).to.exist;
      const text = bench!.textContent!.trim();
      expect(text).to.match(/^\d+$/);
      expect(text.length).to.be.lessThanOrEqual(2);
    });
  });

  /* ═══════════════════════════════════════════════════════════
   * 3. EVENTS — setting changes fire events with correct values
   * ═══════════════════════════════════════════════════════════ */

  it('display-mode-changed event includes the selected mode', function () {
    const select = element.shadowRoot!.querySelector('#player-label-select') as HTMLSelectElement;
    expect(select).to.exist;
    let mode = '';
    element.addEventListener('display-mode-changed', ((e: CustomEvent) => {
      mode = e.detail?.mode ?? '';
    }) as EventListener);
    select.value = 'position';
    select.dispatchEvent(new Event('change'));
    expect(mode).to.equal('position');
  });

  /* ═══════════════════════════════════════════════════════════
   * 4. PERSISTENCE — passed-in playerDisplayMode is reflected
   * ═══════════════════════════════════════════════════════════ */

  it('select shows "position" when playerDisplayMode property is "position"', function () {
    element.playerDisplayMode = 'position';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const select = element.shadowRoot!.querySelector('#player-label-select') as HTMLSelectElement;
      expect(select).to.exist;
      expect(select.value).to.equal('position');
    });
  });

  /* ═══════════════════════════════════════════════════════════
   * 5. VISIBILITY — preview text is actually visible to the user
   * ═══════════════════════════════════════════════════════════ */

  it('on-field time text has a visible (non-transparent) fill', function () {
    const time = element.shadowRoot!.querySelector('.settings-preview .player-time') as SVGTextElement;
    expect(time).to.exist;
    const fill = getComputedStyle(time).fill;
    expect(fill).to.not.equal('none');
    expect(fill).to.not.equal('transparent');
    expect(fill).to.not.equal('rgba(0, 0, 0, 0)');
    expect(fill).to.not.be.empty;
  });

  it('bench time text has a visible (non-transparent) fill', function () {
    const bench = element.shadowRoot!.querySelector('.settings-preview .bench-time') as SVGTextElement;
    expect(bench).to.exist;
    const fill = getComputedStyle(bench).fill;
    expect(fill).to.not.equal('none');
    expect(fill).to.not.equal('transparent');
    expect(fill).to.not.equal('rgba(0, 0, 0, 0)');
    expect(fill).to.not.be.empty;
  });

  it('player label text has a visible fill', function () {
    const label = element.shadowRoot!.querySelector('.settings-preview .player-label') as SVGTextElement;
    expect(label).to.exist;
    const fill = getComputedStyle(label).fill;
    expect(fill).to.not.equal('none');
    expect(fill).to.not.equal('transparent');
    expect(fill).to.not.equal('rgba(0, 0, 0, 0)');
    expect(fill).to.not.be.empty;
  });

  it('player circle has a visible fill', function () {
    const circle = element.shadowRoot!.querySelector('.settings-preview circle') as SVGCircleElement;
    expect(circle).to.exist;
    const fill = getComputedStyle(circle).fill;
    expect(fill).to.not.equal('none');
    expect(fill).to.not.equal('transparent');
    expect(fill).to.not.equal('rgba(0, 0, 0, 0)');
  });

  /* ─── All 5 settings reflected on preview ───────────────── */

  // 1. Show on-field time OFF → preview hides time
  it('preview hides on-field time when toggle is off', function () {
    element.showOnFieldTime = false;
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time');
      expect(timeEl, 'on-field time should be hidden when toggle is off').to.not.exist;
    });
  });

  // 2. Show bench time OFF → preview hides bench time
  it('preview hides bench time when toggle is off', function () {
    element.showBenchTime = false;
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const benchEl = element.shadowRoot!.querySelector('.settings-preview .bench-time');
      expect(benchEl, 'bench time should be hidden when toggle is off').to.not.exist;
    });
  });

  // 3. Larger time display → preview text size changes
  it('preview uses larger text when larger time display is on', function () {
    element.largeTimeDisplay = true;
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time') as SVGTextElement | null;
      expect(timeEl, 'on-field time should exist').to.exist;
      const fontSize = parseFloat(timeEl!.getAttribute('font-size') || getComputedStyle(timeEl!).fontSize);
      const normalEl = element.shadowRoot!.querySelector('.settings-preview .player-label') as SVGTextElement;
      const labelSize = parseFloat(normalEl?.getAttribute('font-size') || '12');
      expect(fontSize, 'time font size should be larger than label').to.be.greaterThan(labelSize);
    });
  });

  it('preview uses normal text when larger time display is off', function () {
    element.largeTimeDisplay = false;
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time') as SVGTextElement | null;
      expect(timeEl, 'on-field time should exist').to.exist;
      const fontSize = parseFloat(timeEl!.getAttribute('font-size') || getComputedStyle(timeEl!).fontSize);
      expect(fontSize, 'time font size should be standard').to.be.lessThanOrEqual(12);
    });
  });

  // 4. Player timer format → preview times change format (#35)
  it('preview shows mm:ss format by default', function () {
    const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time');
    expect(timeEl).to.exist;
    expect(timeEl!.textContent!.trim()).to.match(/^\d{2}:\d{2}$/);
  });

  it('preview shows mm format when timer format is "mm"', function () {
    element.timeDisplayFormat = 'mm';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time');
      expect(timeEl).to.exist;
      expect(timeEl!.textContent!.trim()).to.match(/^\d{2}$/);
    });
  });

  it('preview shows m format when timer format is "m"', function () {
    element.timeDisplayFormat = 'm';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time');
      expect(timeEl).to.exist;
      expect(timeEl!.textContent!.trim()).to.match(/^\d+$/);
    });
  });

  it('preview bench time also reflects timer format', function () {
    element.timeDisplayFormat = 'mm';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const benchEl = element.shadowRoot!.querySelector('.settings-preview .bench-time');
      expect(benchEl, 'bench time should exist').to.exist;
      expect(benchEl!.textContent!.trim()).to.match(/^\d{2}$/);
    });
  });

  // 5. Player label — already tested above (lines 174-188)

  /* ─── Preview text visibility ───────────────────────────── */

  it('preview on-field time text has a visible fill', function () {
    const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time') as SVGTextElement;
    expect(timeEl, 'on-field time element should exist').to.exist;
    const fill = getComputedStyle(timeEl!).fill;
    expect(fill, 'fill should not be none').to.not.equal('none');
    expect(fill, 'fill should not be transparent').to.not.equal('transparent');
    expect(fill, 'fill should not be rgba transparent').to.not.equal('rgba(0, 0, 0, 0)');
  });

  it('preview bench time text has a visible fill', function () {
    const benchEl = element.shadowRoot!.querySelector('.settings-preview .bench-time') as SVGTextElement;
    expect(benchEl, 'bench time element should exist').to.exist;
    const fill = getComputedStyle(benchEl!).fill;
    expect(fill, 'fill should not be none').to.not.equal('none');
    expect(fill, 'fill should not be transparent').to.not.equal('transparent');
    expect(fill, 'fill should not be rgba transparent').to.not.equal('rgba(0, 0, 0, 0)');
  });

  /* ═══════════════════════════════════════════════════════════
   * Responsive layout — settings rows must not overflow
   * ═══════════════════════════════════════════════════════════ */

  it('settings rows use flex-wrap to prevent overflow', function () {
    const rows = Array.from(element.shadowRoot!.querySelectorAll('.settings-row'));
    expect(rows.length, 'should have settings-row elements').to.be.greaterThan(0);
    for (const row of rows) {
      const style = getComputedStyle(row as HTMLElement);
      if (style.display === 'flex' || style.display === 'inline-flex') {
        expect(style.flexWrap, `settings-row "${(row as HTMLElement).textContent!.trim().slice(0, 30)}..." must have flex-wrap: wrap`).to.equal('wrap');
      }
    }
  });

  it('no settings row content overflows the fieldset', function () {
    const fieldset = element.shadowRoot!.querySelector('.player-display-group, fieldset') as HTMLElement;
    if (!fieldset) return;
    const fieldsetRect = fieldset.getBoundingClientRect();

    const rows = Array.from(fieldset.querySelectorAll('.settings-row'));
    for (const row of rows) {
      const rowRect = (row as HTMLElement).getBoundingClientRect();
      expect(rowRect.right, `row "${(row as HTMLElement).textContent!.trim().slice(0, 30)}..." right edge must not exceed fieldset`).to.be.at.most(fieldsetRect.right + 1);
    }
  });

  it('select elements do not overflow their parent row', function () {
    const selects = Array.from(element.shadowRoot!.querySelectorAll('.settings-row select, .settings-row .select-wrap'));
    for (const select of selects) {
      const selectEl = select as HTMLElement;
      const parent = selectEl.closest('.settings-row') as HTMLElement;
      if (!parent) continue;
      const parentRect = parent.getBoundingClientRect();
      const selectRect = selectEl.getBoundingClientRect();
      expect(selectRect.right, 'select must not overflow its row').to.be.at.most(parentRect.right + 1);
    }
  });
});
