import { expect } from '@open-wc/testing';
import { loadAppState, saveAppState, createNewTeam } from '../storage.js';
import type { StoredAppState, StoredTeam } from '../types.js';

/*
 * Specification: playerDisplayMode persistence
 * See: https://github.com/markcaron/playing-time/issues/32
 *
 * playerDisplayMode must be:
 *   1. A field on StoredTeam (in types.ts)
 *   2. Included in createNewTeam() with default 'number'
 *   3. Persisted through saveAppState / loadAppState
 *   4. Loaded from existing data without playerDisplayMode (defaults to 'number')
 *
 * Bug: playing-time.ts has no handler for 'display-mode-changed' and
 * never writes playerDisplayMode to StoredTeam. The type doesn't
 * include the field, and createNewTeam doesn't set it.
 */

const APP_KEY = 'playing-time-app';

function clearStorage() {
  localStorage.removeItem(APP_KEY);
}

describe('playerDisplayMode — type and defaults', function () {
  it('createNewTeam includes playerDisplayMode defaulting to "number"', function () {
    const team = createNewTeam();
    expect(team).to.have.property('playerDisplayMode', 'number');
  });

  it('StoredTeam accepts playerDisplayMode as a typed field', function () {
    const team: StoredTeam = {
      id: 't1',
      teamName: 'Test',
      players: [],
      halfLength: 45,
      gameFormat: '11v11',
      formation: '1-4-3-3',
      playerDisplayMode: 'position',
    };
    expect(team.playerDisplayMode).to.equal('position');
  });
});

describe('playerDisplayMode — localStorage persistence', function () {
  beforeEach(clearStorage);
  afterEach(clearStorage);

  it('round-trips "position" through save/load', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [{
        id: 't1',
        teamName: 'Test',
        players: [{ id: 'p1', number: '1', name: 'Alice' }],
        halfLength: 45,
        gameFormat: '11v11',
        formation: '1-4-3-3',
        playerDisplayMode: 'position',
      }],
    };
    saveAppState(state);
    const loaded = loadAppState();
    expect(loaded.teams[0]).to.have.property('playerDisplayMode', 'position');
  });

  it('loads "number" as default when field is absent in stored data', function () {
    const state = {
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
    const mode = loaded.teams[0].playerDisplayMode;
    expect(mode, 'should default to "number" when absent').to.equal('number');
  });

  it('preserves different modes across multiple teams', function () {
    const state: StoredAppState = {
      activeTeamId: 't1',
      teams: [
        {
          id: 't1', teamName: 'Team A',
          players: [{ id: 'p1', number: '1', name: 'Alice' }],
          halfLength: 45, gameFormat: '11v11', formation: '1-4-3-3',
          playerDisplayMode: 'position',
        },
        {
          id: 't2', teamName: 'Team B',
          players: [{ id: 'p2', number: '2', name: 'Bob' }],
          halfLength: 25, gameFormat: '7v7', formation: '1-2-3-1',
          playerDisplayMode: 'number',
        },
      ],
    };
    saveAppState(state);
    const loaded = loadAppState();
    expect(loaded.teams[0]).to.have.property('playerDisplayMode', 'position');
    expect(loaded.teams[1]).to.have.property('playerDisplayMode', 'number');
  });
});
