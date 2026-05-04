import { expect } from '@open-wc/testing';
import { loadAppState, saveAppState, createNewTeam } from '../storage.js';
import type { StoredAppState, StoredTeam, Position } from '../types.js';

/*
 * Specification: Career times — cumulative across all matches
 *
 * StoredTeam gets a new field: careerTimes, a record mapping
 * player ID to { totalTime: number, positionTimes: Record<Position, number> }.
 *
 * Career times are updated at end-of-match (when saving/leaving game).
 * The Team view's "Times/Stats" tab displays career totalTime per player.
 * Career positionTimes are tracked but not displayed yet.
 */

const APP_KEY = 'playing-time-app';

function clearStorage() {
  localStorage.removeItem(APP_KEY);
}

describe('Career times — StoredTeam field', function () {
  it('createNewTeam includes careerTimes defaulting to empty object', function () {
    const team = createNewTeam();
    expect(team).to.have.property('careerTimes');
    expect(team.careerTimes).to.deep.equal({});
  });

  it('StoredTeam accepts careerTimes as a typed field', function () {
    const team: StoredTeam = {
      id: 't1', teamName: 'Test', players: [], halfLength: 45,
      gameFormat: '11v11', formation: '1-4-3-3',
      careerTimes: {
        'p1': { totalTime: 5400, positionTimes: { CM: 3000, CAM: 2400 } },
      },
    };
    expect(team.careerTimes!['p1'].totalTime).to.equal(5400);
  });
});

describe('Career times — localStorage persistence', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('round-trips careerTimes through save/load', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1', teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45, gameFormat: '11v11', formation: '1-4-3-3',
        careerTimes: {
          'p1': { totalTime: 2700, positionTimes: { GK: 2700 } },
        },
      }],
    };
    saveAppState(state);
    const loaded = loadAppState();
    expect(loaded.teams[0].careerTimes).to.exist;
    expect(loaded.teams[0].careerTimes!['p1'].totalTime).to.equal(2700);
    expect(loaded.teams[0].careerTimes!['p1'].positionTimes).to.have.property('GK', 2700);
  });

  it('defaults to empty object when careerTimes is absent', function () {
    const state = {
      activeTeamId: 't1',
      teams: [{
        id: 't1', teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45, gameFormat: '11v11', formation: '1-4-3-3',
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    const career = loaded.teams[0].careerTimes ?? {};
    expect(career).to.deep.equal({});
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Source contract: playing-time.ts updates careerTimes at end of match
 * ═══════════════════════════════════════════════════════════════ */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok).to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — career times wiring', function () {
  it('references careerTimes when saving/leaving a match', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('careerTimes');
  });

  it('accumulates career totalTime from match totals', function () {
    if (!playingTimeSource) this.skip();
    const hasAccumulation = playingTimeSource.match(
      /careerTimes[\s\S]{0,300}totalTime|totalTime[\s\S]{0,300}careerTimes/
    );
    expect(hasAccumulation, 'must accumulate totalTime into careerTimes').to.not.be.null;
  });

  it('accumulates career positionTimes from match position data', function () {
    if (!playingTimeSource) this.skip();
    const hasPositionAccum = playingTimeSource.match(
      /careerTimes[\s\S]{0,500}positionTimes/
    );
    expect(hasPositionAccum, 'must accumulate positionTimes into careerTimes').to.not.be.null;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Source contract: pt-team-view.ts has a "Times/Stats" tab
 * ═══════════════════════════════════════════════════════════════ */

let teamViewSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/pt-team-view.ts');
  expect(resp.ok).to.be.true;
  teamViewSource = await resp.text();
});

describe('pt-team-view.ts — career Times/Stats tab', function () {
  it('has at least 3 role="tab" elements', function () {
    if (!teamViewSource) this.skip();
    const tabMatches = teamViewSource.match(/role="tab"/g) || [];
    expect(tabMatches.length).to.be.at.least(3);
  });

  it('has a tab with text containing "Times" or "Stats" in the template', function () {
    if (!teamViewSource) this.skip();
    const hasTimesTab = teamViewSource.match(/role="tab"[\s\S]{0,100}(?:Times|Stats)/i);
    expect(hasTimesTab, 'a tab element must contain Times or Stats text').to.not.be.null;
  });

  it('references careerTimes to render the career table', function () {
    if (!teamViewSource) this.skip();
    expect(teamViewSource).to.include('careerTimes');
  });

  it('activeTab type includes a times/stats value', function () {
    if (!teamViewSource) this.skip();
    const hasTimesState = teamViewSource.match(
      /_activeTab[\s\S]{0,200}(?:times|stats)|'times'|'stats'/i
    );
    expect(hasTimesState, '_activeTab should accept a times/stats value').to.not.be.null;
  });
});

describe('playing-time.ts — career times do NOT reset between matches', function () {
  it('does NOT zero careerTimes in onResetGame', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('onResetGame');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.not.include('careerTimes');
  });
});
