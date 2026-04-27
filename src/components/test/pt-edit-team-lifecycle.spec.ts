import { expect, fixture, html } from '@open-wc/testing';
import { allUpdates } from '../../test/helpers/utils.js';
import { PtEditTeamView } from '../pt-edit-team-view.js';

const _PtEditTeamView = PtEditTeamView;

/*
 * Specification: pt-edit-team-view lifecycle cleanup
 * See: https://github.com/markcaron/playing-time/issues/36
 *
 * pt-edit-team-view has two unguarded async operations:
 *   1. _onTryExample: fetch('/examples/uswnt.yaml') without abort signal
 *   2. _importRoster: setTimeout for _dropError auto-clear without cleanup
 *
 * Both can fire after the element is disconnected, causing orphaned
 * state updates and potential test runner hangs (same class of bug
 * as issue #23, fixed for pt-home-view in PR #34).
 *
 * Fix: AbortController for fetch, clearTimeout for setTimeout,
 * both cancelled in disconnectedCallback.
 */

describe('<pt-edit-team-view> lifecycle cleanup', function () {
  it('has a disconnectedCallback that cancels async work', function () {
    const el = document.createElement('pt-edit-team-view') as PtEditTeamView;
    expect(el).to.have.property('disconnectedCallback').that.is.a('function');

    // The base LitElement provides disconnectedCallback, but the component
    // must override it to abort in-flight fetch and clear setTimeout.
    // Verify it has its own implementation (not just inherited).
    const proto = Object.getPrototypeOf(el);
    const hasOwn = proto.constructor.prototype.hasOwnProperty('disconnectedCallback');
    expect(hasOwn, 'component should have its own disconnectedCallback, not just inherited').to.be.true;
  });

  it('does not update _dropError state after disconnect', async function () {
    const el = await fixture<PtEditTeamView>(html`
      <pt-edit-team-view .teams=${[]}></pt-edit-team-view>
    `);
    await allUpdates(el);

    // Trigger _importRoster with empty data (0 players) to start the
    // setTimeout that clears _dropError after 4000ms
    const importMethod = (el as any)._importRoster?.bind(el);
    if (importMethod) {
      importMethod('');
    }

    // Verify _dropError was set
    const errorBefore = (el as any)._dropError;
    expect(errorBefore, '_dropError should be set after invalid import').to.not.be.empty;

    // Disconnect the element
    el.remove();

    // Wait past the 4000ms setTimeout
    await new Promise(r => setTimeout(r, 4500));

    // After disconnect, the setTimeout should have been cancelled.
    // If not cancelled, _dropError would be '' (cleared by the timer).
    // If cancelled, _dropError stays as-is (the element is removed anyway,
    // but the state shouldn't change on a disconnected element).
    const errorAfter = (el as any)._dropError;
    expect(errorAfter, '_dropError should not be cleared by timer after disconnect').to.equal(errorBefore);
  });

  it('does not dispatch events from fetch after disconnect', async function () {
    const el = await fixture<PtEditTeamView>(html`
      <pt-edit-team-view .teams=${[]}></pt-edit-team-view>
    `);
    await allUpdates(el);

    let stateChanged = false;
    const originalRoster = (el as any)._draftRoster?.length ?? 0;

    // Disconnect before triggering fetch
    el.remove();

    // Try to trigger the example fetch on the disconnected element
    const link = el.shadowRoot?.querySelector('.example-link') as HTMLElement | null;
    if (link) {
      link.click();
      await new Promise(r => setTimeout(r, 500));

      // The roster should not have been updated on the disconnected element
      const newRoster = (el as any)._draftRoster?.length ?? 0;
      stateChanged = newRoster !== originalRoster;
      expect(stateChanged, 'fetch should not update state after disconnect').to.be.false;
    }
  });

  it('survives rapid create-destroy cycles without hanging', async function () {
    this.timeout(5000);
    for (let i = 0; i < 3; i++) {
      const el = await fixture<PtEditTeamView>(html`
        <pt-edit-team-view .teams=${[]}></pt-edit-team-view>
      `);
      await allUpdates(el);
      expect(el.shadowRoot).to.not.be.null;
    }
  });
});
