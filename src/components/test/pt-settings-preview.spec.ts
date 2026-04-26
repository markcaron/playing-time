import { expect, fixture, html } from '@open-wc/testing';
import { allUpdates } from '../../test/helpers/utils.js';
import { PtSettingsView } from '../pt-settings-view.js';

if (!customElements.get('pt-settings-view')) {
  throw new Error('pt-settings-view not registered — import may have been tree-shaken');
}

/*
 * Specification: Settings preview widget and player display mode
 * See: .cursor/plans/player_position_tracking_0e77d415.plan.md
 *
 * 1. A "Player label" toggle (Jersey number / Field position)
 * 2. A live SVG preview of a player circle showing the effect of
 *    all display toggles: number/position, on-field time, bench time,
 *    larger time display, and timer format
 *
 * To avoid the WTR multi-fixture hang (#23), all tests share a
 * single describe block with one beforeEach fixture.
 */

describe('<pt-settings-view> — player display settings', function () {
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

  it('is a PtSettingsView instance', function () {
    expect(element).to.be.an.instanceOf(PtSettingsView);
  });

  /* ─── Player label toggle ───────────────────────────────── */

  it('has a Player label setting', function () {
    const text = element.shadowRoot!.textContent;
    expect(text).to.include('Player label');
  });

  it('has options for Jersey number and Field position', function () {
    const select = element.shadowRoot!.querySelector('#player-label-select') as HTMLSelectElement;
    expect(select, 'player label select should exist').to.exist;
    const options = Array.from(select!.options).map(o => o.value);
    expect(options).to.include('number');
    expect(options).to.include('position');
  });

  it('defaults to Jersey number', function () {
    const select = element.shadowRoot!.querySelector('#player-label-select') as HTMLSelectElement;
    expect(select!.value).to.equal('number');
  });

  it('fires a display-mode-changed event when toggled', function () {
    const select = element.shadowRoot!.querySelector('#player-label-select') as HTMLSelectElement;
    let firedValue = '';
    element.addEventListener('display-mode-changed', ((e: CustomEvent) => {
      firedValue = e.detail?.mode ?? (e as any).mode;
    }) as EventListener);
    select!.value = 'position';
    select!.dispatchEvent(new Event('change'));
    expect(firedValue).to.not.be.empty;
  });

  /* ─── Preview widget ────────────────────────────────────── */

  it('renders a player preview SVG', function () {
    const preview = element.shadowRoot!.querySelector('.settings-preview svg');
    expect(preview, 'preview SVG should exist').to.exist;
  });

  it('preview shows a player circle', function () {
    const circle = element.shadowRoot!.querySelector('.settings-preview circle');
    expect(circle, 'player circle should exist in preview').to.exist;
  });

  it('preview shows jersey number by default', function () {
    const previewText = element.shadowRoot!.querySelector('.settings-preview .player-label');
    expect(previewText, 'player label element should exist').to.exist;
    expect(previewText!.textContent!.trim()).to.match(/^\d+$/);
  });

  it('preview shows on-field time when toggle is on', function () {
    const timeEl = element.shadowRoot!.querySelector('.settings-preview .player-time');
    expect(timeEl, 'player time should be visible when showOnFieldTime is on').to.exist;
  });

  /* ─── Bug #1: Player label persistence ──────────────────── */

  it('fires display-mode-changed with the selected mode value', function () {
    const select = element.shadowRoot!.querySelector('#player-label-select') as HTMLSelectElement;
    let mode = '';
    element.addEventListener('display-mode-changed', ((e: Event) => {
      mode = (e as any).playerDisplayMode ?? (e as any).detail?.mode ?? '';
    }) as EventListener);
    select!.value = 'position';
    select!.dispatchEvent(new Event('change'));
    expect(mode).to.equal('position');
  });

  /* ─── Bug #2: Settings order — player display group ─────── */

  it('renders Player label BEFORE Roster sort', function () {
    const text = element.shadowRoot!.textContent!;
    const labelIdx = text.indexOf('Player label');
    const sortIdx = text.indexOf('Roster sort');
    expect(labelIdx, 'Player label should exist').to.be.greaterThan(-1);
    expect(sortIdx, 'Roster sort should exist').to.be.greaterThan(-1);
    expect(labelIdx, 'Player label should come before Roster sort').to.be.lessThan(sortIdx);
  });

  it('renders all 5 player display settings before Roster sort', function () {
    const text = element.shadowRoot!.textContent!;
    const sortIdx = text.indexOf('Roster sort');
    const settings = [
      'Show on-field time',
      'Show bench time',
      'Larger time display',
      'Player timer format',
      'Player label',
    ];
    for (const setting of settings) {
      const idx = text.indexOf(setting);
      expect(idx, `"${setting}" should exist`).to.be.greaterThan(-1);
      expect(idx, `"${setting}" should come before "Roster sort"`).to.be.lessThan(sortIdx);
    }
  });

  it('renders the 5 player display settings in correct order', function () {
    const text = element.shadowRoot!.textContent!;
    const order = [
      'Show on-field time',
      'Show bench time',
      'Larger time display',
      'Player timer format',
      'Player label',
    ];
    let lastIdx = -1;
    for (const setting of order) {
      const idx = text.indexOf(setting);
      expect(idx, `"${setting}" should exist`).to.be.greaterThan(-1);
      expect(idx, `"${setting}" should come after previous setting`).to.be.greaterThan(lastIdx);
      lastIdx = idx;
    }
  });

  /* ─── Bug #2: Preview is grouped with settings via flexbox ─ */

  it('preview is inside the player display settings group', function () {
    const group = element.shadowRoot!.querySelector('.player-display-group');
    expect(group, '.player-display-group container should exist').to.exist;
    const preview = group!.querySelector('.settings-preview');
    expect(preview, 'preview should be inside the group').to.exist;
  });

  it('player display group uses flexbox layout', function () {
    const group = element.shadowRoot!.querySelector('.player-display-group') as HTMLElement;
    expect(group, '.player-display-group should exist').to.exist;
    const style = getComputedStyle(group!);
    expect(style.display).to.equal('flex');
  });

  /* ─── Bug #3: Preview uses #10 and CAM ──────────────────── */

  it('preview shows #10 as the example jersey number', function () {
    const label = element.shadowRoot!.querySelector('.settings-preview .player-label');
    expect(label).to.exist;
    expect(label!.textContent!.trim()).to.equal('10');
  });

  it('preview shows CAM when player label is set to position', function () {
    // Change the mode to position
    element.playerDisplayMode = 'position';
    element.requestUpdate();
    return element.updateComplete.then(() => {
      const label = element.shadowRoot!.querySelector('.settings-preview .player-label');
      expect(label).to.exist;
      expect(label!.textContent!.trim()).to.equal('CAM');
    });
  });

  /* ─── Bug #3: Preview shows bench time ──────────────────── */

  it('preview shows bench time when toggle is on', function () {
    const benchTimeEl = element.shadowRoot!.querySelector('.settings-preview .bench-time');
    expect(benchTimeEl, 'bench time should be visible when showBenchTime is on').to.exist;
    expect(benchTimeEl!.textContent!.trim()).to.match(/\d+:\d+/);
  });
});
