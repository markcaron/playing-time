import { expect } from '@open-wc/testing';
import { loadAppState, saveAppState, createNewTeam } from '../storage.js';
import type { StoredAppState, StoredTeam, RosterEntry } from '../types.js';

/*
 * Specification: Guest players
 *
 * Guest players are temporary players added via the Attendance dialog
 * for a single match. They participate fully (bench, field, subs,
 * time tracking) but are NOT saved to the roster or career totals.
 *
 * Data model: RosterEntry.isGuest flag
 * UI: "Add guest player" fieldset in Attendance dialog
 * Behavior: tracked per-match, excluded from career
 */

const APP_KEY = 'playing-time-app';
function clearStorage() { localStorage.removeItem(APP_KEY); }

/* ═══════════════════════════════════════════════════════════════
 * Data model — isGuest flag on RosterEntry
 * ═══════════════════════════════════════════════════════════════ */

describe('Guest player data model', function () {
  it('RosterEntry accepts isGuest as a boolean field', function () {
    const player: RosterEntry = {
      id: 'guest-1', number: '99', name: 'Guest Player',
      isGuest: true,
      half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0,
    };
    expect(player.isGuest).to.be.true;
  });

  it('regular players have isGuest as undefined or false', function () {
    const player: RosterEntry = {
      id: 'p1', number: '10', name: 'Regular',
      half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0,
    };
    expect(player.isGuest).to.not.be.true;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Persistence — guests saved with match, NOT with team
 * ═══════════════════════════════════════════════════════════════ */

describe('Guest player persistence', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('guest players in gamePlan playerTimes are preserved on save/load', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1', teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Regular' }],
        halfLength: 45, gameFormat: '11v11', formation: '1-4-3-3',
        gamePlans: [{
          id: 'plan1', name: 'Game 1', formation: '1-4-3-3', phase: 'game',
          playerTimes: {
            'p1': { half1Time: 1350, half2Time: 0, benchTime: 0, onFieldTime: 1350 },
            'guest-1': { half1Time: 600, half2Time: 0, benchTime: 750, onFieldTime: 600 },
          },
        }],
      }],
    };
    saveAppState(state);
    const loaded = loadAppState();
    const plan = loaded.teams[0].gamePlans![0];
    expect(plan.playerTimes!['guest-1']).to.exist;
    expect(plan.playerTimes!['guest-1'].half1Time).to.equal(600);
  });

  it('guest players are NOT saved to StoredTeam.players', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1', teamName: 'Test',
        players: [
          { id: 'p1', number: '1', name: 'Regular' },
          { id: 'guest-1', number: '99', name: 'Guest', isGuest: true },
        ],
        halfLength: 45, gameFormat: '11v11', formation: '1-4-3-3',
      }],
    };
    saveAppState(state);
    const loaded = loadAppState();
    const guestInRoster = loaded.teams[0].players.find(p => p.isGuest === true);
    expect(guestInRoster, 'guest players should not be in StoredTeam.players after save/load').to.not.exist;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Source contract — Attendance dialog has guest fieldset
 * ═══════════════════════════════════════════════════════════════ */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok).to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — guest player support', function () {
  it('has a guest player fieldset in the attendance dialog', function () {
    if (!playingTimeSource) this.skip();
    const attendanceSection = playingTimeSource.match(/attendance[\s\S]{0,3000}dialog/i);
    expect(attendanceSection).to.not.be.null;
    expect(playingTimeSource).to.include('guest');
  });

  it('marks guest players with isGuest flag', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.include('isGuest');
  });

  it('does NOT include guest players in careerTimes accumulation', function () {
    if (!playingTimeSource) this.skip();
    const careerSection = playingTimeSource.match(/careerTimes[\s\S]{0,500}/);
    if (!careerSection) this.skip();
    const section = careerSection[0];
    const hasGuestFilter = section.includes('isGuest') || section.includes('guest');
    expect(hasGuestFilter, 'careerTimes accumulation must filter out guest players').to.be.true;
  });

  it('adds guest players to bench initially', function () {
    if (!playingTimeSource) this.skip();
    const hasGuestBench = playingTimeSource.match(/guest[\s\S]{0,500}bench|bench[\s\S]{0,500}guest/i);
    expect(hasGuestBench, 'guest players should be added to bench').to.not.be.null;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Source contract — guest badge in UI
 * ═══════════════════════════════════════════════════════════════ */

describe('playing-time.ts — guest player badge', function () {
  it('renders a guest badge or indicator for guest players', function () {
    if (!playingTimeSource) this.skip();
    const hasBadge = playingTimeSource.match(/guest-badge|guest-tag|isGuest[\s\S]{0,200}(?:badge|tag|guest|Guest)/);
    expect(hasBadge, 'guest players should have a visible badge/tag').to.not.be.null;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Source contract — guest players shown in Stats view
 * ═══════════════════════════════════════════════════════════════ */

describe('pt-stats-view — guest players visible', function () {
  let statsSource: string;

  before(async function () {
    const resp = await fetch('/__raw/src/components/pt-stats-view.ts');
    expect(resp.ok).to.be.true;
    statsSource = await resp.text();
  });

  it('stats view does not filter out guest players', function () {
    if (!statsSource) this.skip();
    const hasGuestFilter = statsSource.match(/isGuest.*false|filter.*!.*isGuest/);
    expect(hasGuestFilter, 'stats view should NOT filter out guests — they are shown for the current match').to.be.null;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Accessibility — guest fieldset in Attendance
 * ═══════════════════════════════════════════════════════════════ */

describe('Attendance dialog — guest player a11y', function () {
  it('guest fieldset uses <fieldset> and <legend> for grouping', function () {
    if (!playingTimeSource) this.skip();
    const hasFieldset = playingTimeSource.match(/fieldset[\s\S]{0,300}guest|guest[\s\S]{0,300}fieldset/i);
    expect(hasFieldset, 'guest player form should use fieldset/legend for accessibility').to.not.be.null;
  });

  it('guest fieldset has a legend labeling it', function () {
    if (!playingTimeSource) this.skip();
    const hasLegend = playingTimeSource.match(/legend[\s\S]{0,100}[Gg]uest/);
    expect(hasLegend, 'guest fieldset must have a legend for screen readers').to.not.be.null;
  });
});
