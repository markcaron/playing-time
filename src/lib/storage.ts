import type { StoredAppState, StoredRoster, StoredTeam, StoredGamePlan, StoredHalfPlan, StoredPosition, FormationKey, LineupSlot } from './types.js';
import { FORMATION_KEY_MIGRATION } from './types.js';

const APP_KEY = 'playing-time-app';
const OLD_KEY = 'playing-time-roster';

let _idCounter = 0;
function storageId(): string {
  return `team-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

function playerId(): string {
  return `pl-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
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
      players: old.players.map(p => ({ ...p, id: playerId() })),
      halfLength: old.halfLength ?? 45,
      gameFormat: old.gameFormat ?? '11v11',
      formation: migrateFormationKey(old.formation ?? '4-3-3') as FormationKey,
    };

    localStorage.removeItem(OLD_KEY);

    return { activeTeamId: team.id, teams: [team] };
  } catch {
    return null;
  }
}

function migrateFormationKey(key: string): FormationKey {
  return (FORMATION_KEY_MIGRATION[key] ?? key) as FormationKey;
}

function convertFieldPositionsToLineup(
  positions: StoredPosition[],
  players: { id?: string }[],
): LineupSlot[] {
  return positions.map(sp => {
    const pid = sp.playerId
      || (sp.rosterIndex >= 0 && sp.rosterIndex < players.length ? players[sp.rosterIndex]?.id : undefined)
      || '';
    return { playerId: pid };
  });
}

function migrateHalfPlan(plan: StoredHalfPlan | undefined, players: { id?: string }[]): StoredHalfPlan | undefined {
  if (!plan) return undefined;
  const formation = migrateFormationKey(plan.formation);
  if (plan.lineup?.length) {
    return { formation, lineup: plan.lineup };
  }
  if (plan.fieldPositions?.length) {
    return { formation, lineup: convertFieldPositionsToLineup(plan.fieldPositions, players) };
  }
  return { formation, lineup: [] };
}

function needsMigration(state: StoredAppState): boolean {
  for (const team of state.teams) {
    if (team.players.some(p => !p.id)) return true;
    if (FORMATION_KEY_MIGRATION[team.formation]) return true;
    if (team.fieldPositions?.length && !team.lineup?.length) return true;
    for (const plan of team.gamePlans ?? []) {
      if (FORMATION_KEY_MIGRATION[plan.formation]) return true;
      if (plan.halfPlan1H?.fieldPositions?.length && !plan.halfPlan1H?.lineup?.length) return true;
      if (plan.halfPlan2H?.fieldPositions?.length && !plan.halfPlan2H?.lineup?.length) return true;
    }
  }
  return false;
}

function migrateV2(state: StoredAppState): StoredAppState {
  if (!needsMigration(state)) return state;

  const teams = state.teams.map(team => {
    const players = team.players.map(p => ({
      ...p,
      id: p.id || playerId(),
    }));

    const formation = migrateFormationKey(team.formation);

    let lineup = team.lineup;
    if (!lineup?.length && team.fieldPositions?.length) {
      lineup = convertFieldPositionsToLineup(team.fieldPositions, players);
    }

    const gamePlans = (team.gamePlans ?? []).map((plan): StoredGamePlan => {
      const pFormation = migrateFormationKey(plan.formation);

      const hp1H = migrateHalfPlan(
        plan.halfPlan1H ?? (plan.fieldPositions1H?.length
          ? { formation: plan.formation, fieldPositions: plan.fieldPositions1H } as StoredHalfPlan
          : undefined),
        players,
      );

      const hp2H = migrateHalfPlan(
        plan.halfPlan2H ?? (plan.fieldPositions2H?.length
          ? { formation: plan.formation, fieldPositions: plan.fieldPositions2H } as StoredHalfPlan
          : undefined),
        players,
      );

      let planLineup = plan.lineup;
      if (!planLineup?.length && plan.fieldPositions?.length) {
        planLineup = convertFieldPositionsToLineup(plan.fieldPositions, players);
      }

      return {
        id: plan.id,
        name: plan.name,
        formation: pFormation,
        opponentName: plan.opponentName,
        matchType: plan.matchType,
        phase: plan.phase,
        lineup: planLineup,
        halfPlan1H: hp1H,
        halfPlan2H: hp2H,
        half1Started: plan.half1Started,
        half2Started: plan.half2Started,
        playerTimes: plan.playerTimes,
        gameEvents: plan.gameEvents,
        timerElapsed: plan.timerElapsed,
        timerHalf: plan.timerHalf,
      };
    });

    return {
      ...team,
      players,
      formation,
      lineup,
      gamePlans,
      fieldPositions: undefined,
    } as StoredTeam;
  });

  return { activeTeamId: state.activeTeamId, teams };
}

function applyDefaults(state: StoredAppState): StoredAppState {
  let changed = false;
  const teams = state.teams.map(team => {
    let t = team;
    if (t.playerDisplayMode == null) {
      changed = true;
      t = { ...t, playerDisplayMode: 'number' as const };
    }
    if (t.careerTimes == null) {
      changed = true;
      t = { ...t, careerTimes: {} };
    }
    return t;
  });
  return changed ? { ...state, teams } : state;
}

export function loadAppState(): StoredAppState {
  try {
    const raw = localStorage.getItem(APP_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StoredAppState;
      if (data.teams && Array.isArray(data.teams)) {
        const migrated = applyDefaults(migrateV2(data));
        if (migrated !== data) {
          saveAppState(migrated);
        }
        return migrated;
      }
    }
  } catch { /* ignore corrupt data */ }

  const migrated = migrateOldData();
  if (migrated) {
    const withDefaults = applyDefaults(migrated);
    saveAppState(withDefaults);
    return withDefaults;
  }

  return { activeTeamId: null, teams: [] };
}

export function saveAppState(state: StoredAppState): void {
  localStorage.setItem(APP_KEY, JSON.stringify(state));
}

export function createGamePlan(name: string, formation: FormationKey): StoredGamePlan {
  return {
    id: `plan-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`,
    name,
    formation,
    phase: 'plan',
  };
}

export function createNewTeam(): StoredTeam {
  return {
    id: storageId(),
    teamName: 'New Team',
    players: [],
    halfLength: 45,
    gameFormat: '11v11',
    formation: '1-4-3-3',
    playerDisplayMode: 'number',
    careerTimes: {},
  };
}

export { playerId };
