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
});
