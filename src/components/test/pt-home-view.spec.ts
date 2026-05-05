import { expect, fixture, html, nextFrame } from '@open-wc/testing';
import { sendKeys } from '@web/test-runner-commands';
import { a11ySnapshot, querySnapshotAll } from '../../test/helpers/a11y-snapshot.js';
import { allUpdates, clickElementAtCenter } from '../../test/helpers/utils.js';
import { PtHomeView, TeamSelectedEvent, NavigateEditTeamEvent, NavigateSettingsFromHomeEvent } from '../pt-home-view.js';
import type { StoredTeam } from '../../lib/types.js';

function makeTeam(overrides: Partial<StoredTeam> = {}): StoredTeam {
  return {
    id: 'team-1',
    teamName: 'FC Test',
    players: [
      { number: '10', name: 'Alice' },
      { number: '7', name: 'Bob' },
    ],
    halfLength: 25,
    gameFormat: '7v7',
    formation: '1-2-3-1',
    ...overrides,
  };
}

describe('<pt-home-view>', function () {
  let element: PtHomeView;

  it('should upgrade', function () {
    element = document.createElement('pt-home-view') as PtHomeView;
    const klass = customElements.get('pt-home-view');
    expect(element)
      .to.be.an.instanceOf(klass!)
      .and
      .to.be.an.instanceOf(PtHomeView);
  });

  it('imperatively instantiates', function () {
    expect(document.createElement('pt-home-view')).to.be.an.instanceof(PtHomeView);
  });

  describe('with no teams', function () {
    beforeEach(async function () {
      element = await fixture<PtHomeView>(html`
        <pt-home-view .teams=${[]}></pt-home-view>
      `);
      await allUpdates(element);
    });

    it('is accessible', async function () {
      await expect(element).to.be.accessible();
    });

    it('shows the empty state', function () {
      const empty = element.shadowRoot!.querySelector('.empty-state');
      expect(empty).to.exist;
    });

    it('shows "No teams yet" text', function () {
      const text = element.shadowRoot!.textContent;
      expect(text).to.include('No teams yet');
    });

    it('has an Add Team button in the empty state', function () {
      const btn = element.shadowRoot!.querySelector('.empty-state .add-btn');
      expect(btn).to.exist;
    });

    it('fires navigate-edit-team when Add Team is clicked', async function () {
      const btn = element.shadowRoot!.querySelector('.empty-state .add-btn') as HTMLElement;
      let fired = false;
      element.addEventListener(NavigateEditTeamEvent.eventName, () => { fired = true; });
      btn.click();
      expect(fired).to.be.true;
    });

    it('shows the USWNT example link', function () {
      const link = element.shadowRoot!.querySelector('.example-link');
      expect(link, 'example link should be visible when there are no teams').to.exist;
    });
  });

  describe('with teams', function () {
    const teams = [
      makeTeam({ id: 'a', teamName: 'Alpha FC' }),
      makeTeam({ id: 'b', teamName: 'Bravo SC', gameFormat: '11v11', halfLength: 45 }),
    ];

    beforeEach(async function () {
      element = await fixture<PtHomeView>(html`
        <pt-home-view .teams=${teams}></pt-home-view>
      `);
      await allUpdates(element);
    });

    it('is accessible', async function () {
      await expect(element).to.be.accessible();
    });

    it('does not show the empty state', function () {
      const empty = element.shadowRoot!.querySelector('.empty-state');
      expect(empty).to.not.exist;
    });

    it('renders a tile for each team', function () {
      const tiles = element.shadowRoot!.querySelectorAll('.team-tile');
      expect(tiles.length).to.equal(2);
    });

    it('displays team names in tiles', function () {
      const names = Array.from(element.shadowRoot!.querySelectorAll('.tile-name'));
      expect(names[0].textContent).to.include('Alpha FC');
      expect(names[1].textContent).to.include('Bravo SC');
    });

    it('displays format and player count in tile metadata', function () {
      const meta = Array.from(element.shadowRoot!.querySelectorAll('.tile-meta'));
      expect(meta[0].textContent).to.include('7v7');
      expect(meta[1].textContent).to.include('11v11');
    });

    it('fires team-selected with correct id when a tile is clicked', async function () {
      let selectedId = '';
      element.addEventListener(TeamSelectedEvent.eventName, ((e: TeamSelectedEvent) => {
        selectedId = e.teamId;
      }) as EventListener);

      const tile = element.shadowRoot!.querySelector('.team-tile') as HTMLElement;
      await clickElementAtCenter(tile);
      expect(selectedId).to.equal('a');
    });

    describe('accessibility tree', function () {
      it('exposes team tiles as buttons', async function () {
        const snapshot = await a11ySnapshot();
        const buttons = querySnapshotAll(snapshot, { role: 'button' });
        expect(buttons.length).to.be.greaterThanOrEqual(2);
      });
    });
  });

  describe('keyboard navigation', function () {
    beforeEach(async function () {
      element = await fixture<PtHomeView>(html`
        <pt-home-view .teams=${[makeTeam({ id: 'k1', teamName: 'Keyboard FC' })]}></pt-home-view>
      `);
      await allUpdates(element);
    });

    it('can focus the Settings button', async function () {
      const settingsBtn = element.shadowRoot!.querySelector('.settings-btn') as HTMLElement;
      settingsBtn.focus();
      await nextFrame();

      expect(element.shadowRoot!.activeElement).to.equal(settingsBtn);
    });

    it('fires navigate-settings on Enter when Settings is focused', async function () {
      const settingsBtn = element.shadowRoot!.querySelector('.settings-btn') as HTMLElement;
      settingsBtn.focus();
      await nextFrame();

      let fired = false;
      element.addEventListener(NavigateSettingsFromHomeEvent.eventName, () => { fired = true; });

      await sendKeys({ press: 'Enter' });
      expect(fired).to.be.true;
    });

    it('fires team-selected on Enter when a tile is focused', async function () {
      const tile = element.shadowRoot!.querySelector('.team-tile') as HTMLElement;
      tile.focus();
      await nextFrame();

      let selectedId = '';
      element.addEventListener(TeamSelectedEvent.eventName, ((e: TeamSelectedEvent) => {
        selectedId = e.teamId;
      }) as EventListener);

      await sendKeys({ press: 'Enter' });
      expect(selectedId).to.equal('k1');
    });
  });

  describe('header', function () {
    beforeEach(async function () {
      element = await fixture<PtHomeView>(html`
        <pt-home-view .teams=${[]}></pt-home-view>
      `);
      await allUpdates(element);
    });

    it('shows the PlayingTime heading', function () {
      const h1 = element.shadowRoot!.querySelector('h1');
      expect(h1).to.exist;
      expect(h1!.textContent).to.include('PlayingTime');
    });

    it('has a Settings button', function () {
      const btn = element.shadowRoot!.querySelector('.settings-btn');
      expect(btn).to.exist;
      expect(btn!.getAttribute('aria-label')).to.equal('Settings');
    });

    it('does not show Add Team in the header', function () {
      const btn = element.shadowRoot!.querySelector('.header .add-btn');
      expect(btn).to.be.null;
    });
  });

});
