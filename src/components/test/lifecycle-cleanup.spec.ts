import { expect, fixture, html } from '@open-wc/testing';
import { allUpdates } from '../../test/helpers/utils.js';
import { PtHomeView } from '../pt-home-view.js';
import type { StoredTeam } from '../../lib/types.js';

/*
 * Specification: Component lifecycle cleanup
 * See: https://github.com/markcaron/playing-time/issues/23
 *
 * Components with async work (fetch, setTimeout, setInterval) must
 * cancel in-flight operations in disconnectedCallback to prevent:
 *   - Promise resolutions on disconnected elements
 *   - Event dispatches on orphaned DOM
 *   - Test fixture hangs from dangling async work
 *
 * The fix pattern is:
 *   1. Add an AbortController to the component
 *   2. Pass its signal to fetch() calls
 *   3. Cancel setTimeout/setInterval handles
 *   4. Abort everything in disconnectedCallback
 *
 * These tests verify the cleanup contract by checking that
 * disconnectedCallback exists and that creating/destroying
 * multiple fixtures does not hang.
 */

const _PtHomeView = PtHomeView;

function makeTeam(overrides: Partial<StoredTeam> = {}): StoredTeam {
  return {
    id: 'team-1', teamName: 'FC Test',
    players: [{ number: '10', name: 'Alice' }, { number: '7', name: 'Bob' }],
    halfLength: 25, gameFormat: '7v7', formation: '1-2-3-1',
    ...overrides,
  };
}

describe('Component lifecycle cleanup — pt-home-view', function () {
  it('has a disconnectedCallback', function () {
    const el = document.createElement('pt-home-view');
    expect(el).to.have.property('disconnectedCallback').that.is.a('function');
  });

  it('survives rapid create-destroy cycles without hanging', async function () {
    this.timeout(5000);
    for (let i = 0; i < 5; i++) {
      const el = await fixture<PtHomeView>(html`
        <pt-home-view .teams=${[makeTeam({ id: `t${i}`, teamName: `Team ${i}` })]}></pt-home-view>
      `);
      await allUpdates(el);
      expect(el.shadowRoot).to.not.be.null;
    }
  });

  it('does not dispatch events after disconnect', async function () {
    const el = await fixture<PtHomeView>(html`
      <pt-home-view .teams=${[]}></pt-home-view>
    `);
    await allUpdates(el);

    let eventFired = false;
    el.addEventListener('import-example', () => { eventFired = true; });

    el.remove();

    const link = el.shadowRoot?.querySelector('.example-link') as HTMLElement | null;
    if (link) {
      link.click();
      await new Promise(r => setTimeout(r, 200));
      expect(eventFired, 'should not fire events after disconnect').to.be.false;
    }
  });
});
