import type { StoredAppState, StoredRoster, StoredTeam } from './types.js';

const APP_KEY = 'playing-time-app';
const OLD_KEY = 'playing-time-roster';

let _idCounter = 0;
function storageId(): string {
  return `team-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

function migrateOldData(): StoredAppState | null {
  try {
    const raw = localStorage.getItem(OLD_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw) as StoredRoster;
    if (!old.players || !Array.isArray(old.players)) return null;

    const team: StoredTeam = {
      id: storageId(),
      teamName: old.teamName || 'My Team',
      players: old.players,
      halfLength: old.halfLength ?? 45,
      gameFormat: old.gameFormat ?? '11v11',
      formation: old.formation ?? '4-3-3',
    };

    localStorage.removeItem(OLD_KEY);

    return { activeTeamId: team.id, teams: [team] };
  } catch {
    return null;
  }
}

export function loadAppState(): StoredAppState {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StoredAppState;
      if (data.teams && Array.isArray(data.teams)) return data;
    }
  } catch { /* ignore corrupt data */ }

  const migrated = migrateOldData();
  if (migrated) {
    saveAppState(migrated);
    return migrated;
  }

  return { activeTeamId: null, teams: [] };
}

export function saveAppState(state: StoredAppState): void {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

export function createNewTeam(): StoredTeam {
  return {
    id: storageId(),
    teamName: 'New Team',
    players: [],
    halfLength: 45,
    gameFormat: '11v11',
    formation: '4-3-3',
  };
}
