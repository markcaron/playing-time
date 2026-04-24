import { expect } from '@open-wc/testing';
import { loadAppState, saveAppState } from '../storage.js';
import type { StoredAppState, FormationKey } from '../types.js';

/*
 * Specification for localStorage migration.
 * See: .cursor/plans/position-based_lineup_engine_6e998405.plan.md § Migration
 *
 * Tests the migration path inside loadAppState():
 *   - Old formation keys (e.g. '4-3-3') → new GK-inclusive keys ('1-4-3-3')
 *   - Players without IDs get IDs assigned
 *   - fieldPositions (x/y-based) → lineup (LineupSlot[])
 *   - Half-plan fieldPositions → half-plan lineup
 *   - Modern data passes through unchanged
 */

const APP_KEY = 'playing-time-app';
const OLD_KEY = 'playing-time-roster';

function clearStorage() {
  localStorage.removeItem(APP_KEY);
  localStorage.removeItem(OLD_KEY);
}

/* ─── Formation key migration ─────────────────────────────── */

describe('loadAppState() — formation key migration', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('migrates old formation key "4-3-3" to "1-4-3-3"', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '4-3-3' as FormationKey,
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].formation).to.equal('1-4-3-3');
  });

  it('migrates old formation key "3-5-2" to "1-3-5-2"', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '3-5-2' as FormationKey,
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].formation).to.equal('1-3-5-2');
  });

  it('leaves already-migrated formation keys unchanged', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].formation).to.equal('1-4-3-3');
  });

  it('migrates game plan formation keys', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
        gamePlans: [{
          id: 'plan1',
          name: 'Game 1',
          formation: '4-4-2' as FormationKey,
          phase: 'plan',
        }],
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].gamePlans![0].formation).to.equal('1-4-4-2');
  });
});

/* ─── Player ID assignment ────────────────────────────────── */

describe('loadAppState() — player ID assignment', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('assigns IDs to players that lack them', function () {
    const state = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [
          { number: '1', name: 'Alice' },
          { number: '2', name: 'Bob' },
        ],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].players[0]).to.have.property('id').that.is.a('string').and.not.empty;
    expect(loaded.teams[0].players[1]).to.have.property('id').that.is.a('string').and.not.empty;
  });

  it('assigns unique IDs to each player', function () {
    const state = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [
          { number: '1', name: 'Alice' },
          { number: '2', name: 'Bob' },
          { number: '3', name: 'Carol' },
        ],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    const ids = loaded.teams[0].players.map(p => p.id);
    expect(new Set(ids).size).to.equal(3);
  });

  it('preserves existing player IDs', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [
          { id: 'keep-me', number: '1', name: 'Alice' },
        ],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].players[0].id).to.equal('keep-me');
  });
});

/* ─── fieldPositions → lineup migration ───────────────────── */

describe('loadAppState() — fieldPositions to lineup migration', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('converts team fieldPositions to lineup array', function () {
    const state = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [
          { id: 'p1', number: '1', name: 'Alice' },
          { id: 'p2', number: '2', name: 'Bob' },
        ],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
        fieldPositions: [
          { rosterIndex: 0, playerId: 'p1', x: 34, y: 62 },
          { rosterIndex: 1, playerId: 'p2', x: 20, y: 50 },
        ],
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].lineup).to.be.an('array');
    expect(loaded.teams[0].lineup![0]).to.deep.equal({ playerId: 'p1' });
    expect(loaded.teams[0].lineup![1]).to.deep.equal({ playerId: 'p2' });
  });

  it('uses rosterIndex fallback when playerId is missing', function () {
    const state = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [
          { id: 'p1', number: '1', name: 'Alice' },
          { id: 'p2', number: '2', name: 'Bob' },
        ],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
        fieldPositions: [
          { rosterIndex: 0, x: 34, y: 62 },
          { rosterIndex: 1, x: 20, y: 50 },
        ],
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].lineup![0]).to.deep.equal({ playerId: 'p1' });
    expect(loaded.teams[0].lineup![1]).to.deep.equal({ playerId: 'p2' });
  });

  it('converts game plan half-plan fieldPositions to lineup', function () {
    const state = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [
          { id: 'p1', number: '1', name: 'Alice' },
          { id: 'p2', number: '2', name: 'Bob' },
        ],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
        gamePlans: [{
          id: 'plan1',
          name: 'Game 1',
          formation: '1-4-3-3',
          phase: 'plan',
          halfPlan1H: {
            formation: '1-4-3-3',
            fieldPositions: [
              { rosterIndex: 0, playerId: 'p1', x: 34, y: 62 },
              { rosterIndex: 1, playerId: 'p2', x: 20, y: 50 },
            ],
          },
        }],
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    const hp1 = loaded.teams[0].gamePlans![0].halfPlan1H;
    expect(hp1).to.exist;
    expect(hp1!.lineup).to.be.an('array');
    expect(hp1!.lineup[0]).to.deep.equal({ playerId: 'p1' });
  });

  it('preserves existing lineup arrays (no double migration)', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
        lineup: [{ playerId: 'p1' }],
      }],
    };
    localStorage.setItem(APP_KEY, JSON.stringify(state));
    const loaded = loadAppState();
    expect(loaded.teams[0].lineup).to.deep.equal([{ playerId: 'p1' }]);
  });
});

/* ─── Legacy v1 (old key) migration ───────────────────────── */

describe('loadAppState() — legacy v1 roster migration', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('migrates data from the old "playing-time-roster" key', function () {
    const old = {
      teamName: 'My Old Team',
      players: [
        { number: '1', name: 'Alice' },
        { number: '2', name: 'Bob' },
      ],
      halfLength: 30,
      gameFormat: '9v9',
      formation: '3-3-2',
    };
    localStorage.setItem(OLD_KEY, JSON.stringify(old));
    const loaded = loadAppState();
    expect(loaded.teams).to.have.length(1);
    expect(loaded.teams[0].teamName).to.equal('My Old Team');
    expect(loaded.teams[0].formation).to.equal('1-3-3-2');
    expect(loaded.teams[0].players).to.have.length(2);
    expect(loaded.teams[0].players[0]).to.have.property('id').that.is.a('string');
  });

  it('removes the old key after migration', function () {
    const old = {
      teamName: 'Old Team',
      players: [{ number: '1', name: 'Alice' }],
    };
    localStorage.setItem(OLD_KEY, JSON.stringify(old));
    loadAppState();
    expect(localStorage.getItem(OLD_KEY)).to.be.null;
  });

  it('returns empty state when no data exists', function () {
    const loaded = loadAppState();
    expect(loaded.activeTeamId).to.be.null;
    expect(loaded.teams).to.deep.equal([]);
  });
});

/* ─── Corrupt / partial data ──────────────────────────────── */

describe('loadAppState() — corrupt data fallback', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('returns empty state for malformed JSON', function () {
    localStorage.setItem(APP_KEY, '{not valid json!!!');
    const loaded = loadAppState();
    expect(loaded.activeTeamId).to.be.null;
    expect(loaded.teams).to.deep.equal([]);
  });

  it('returns empty state when teams is not an array', function () {
    localStorage.setItem(APP_KEY, JSON.stringify({ activeTeamId: 't1', teams: 'oops' }));
    const loaded = loadAppState();
    expect(loaded.activeTeamId).to.be.null;
    expect(loaded.teams).to.deep.equal([]);
  });

  it('falls back to legacy key when app key has corrupt data', function () {
    localStorage.setItem(APP_KEY, 'corrupt');
    localStorage.setItem(OLD_KEY, JSON.stringify({
      teamName: 'Fallback Team',
      players: [{ number: '1', name: 'Alice' }],
    }));
    const loaded = loadAppState();
    expect(loaded.teams).to.have.length(1);
    expect(loaded.teams[0].teamName).to.equal('Fallback Team');
  });
});
