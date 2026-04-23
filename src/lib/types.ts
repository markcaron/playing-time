export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'LM' | 'RM' | 'CF' | 'ST';

export const POSITIONS: Position[] = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'];

export interface RosterEntry {
  id: string;
  number: string;
  name: string;
  nickname?: string;
  primaryPos?: Position;
  secondaryPos?: Position;
  half1Time: number;
  half2Time: number;
  benchTime: number;
  onFieldTime: number;
}

export interface FieldPlayer {
  id: string;
  rosterId: string;
  x: number;
  y: number;
  number: string;
  name: string;
}

export type GameFormat = '11v11' | '9v9' | '7v7' | '4v4';

export const GAME_FORMATS: { key: GameFormat; label: string; playerCount: number; halfLength: number }[] = [
  { key: '11v11', label: '11v11', playerCount: 11, halfLength: 45 },
  { key: '9v9',   label: '9v9',   playerCount: 9,  halfLength: 30 },
  { key: '7v7',   label: '7v7',   playerCount: 7,  halfLength: 25 },
  { key: '4v4',   label: '4v4',   playerCount: 4,  halfLength: 12 },
];

export function getPlayerCount(format: GameFormat): number {
  return GAME_FORMATS.find(f => f.key === format)?.playerCount ?? 11;
}

export function getStandardHalfLength(format: GameFormat): number {
  return GAME_FORMATS.find(f => f.key === format)?.halfLength ?? 45;
}

export type FormationKey =
  | '1-4-3-3' | '1-4-2-3-1' | '1-4-4-2' | '1-3-5-2' | '1-3-4-3'
  | '1-3-3-2' | '1-4-3-1' | '1-2-4-2' | '1-3-2-3' | '1-1-3-3-1'
  | '1-2-3-1' | '1-3-2-1' | '1-2-1-2-1' | '1-3-1-2' | '1-2-2-2'
  | '2-2' | '1-2-1';

export const FORMATIONS_BY_FORMAT: Record<GameFormat, { key: FormationKey; label: string }[]> = {
  '11v11': [
    { key: '1-4-3-3',   label: '4-3-3' },
    { key: '1-4-2-3-1', label: '4-2-3-1' },
    { key: '1-4-4-2',   label: '4-4-2' },
    { key: '1-3-5-2',   label: '3-5-2' },
    { key: '1-3-4-3',   label: '3-4-3' },
  ],
  '9v9': [
    { key: '1-3-3-2',   label: '3-3-2' },
    { key: '1-4-3-1',   label: '4-3-1' },
    { key: '1-2-4-2',   label: '2-4-2' },
    { key: '1-3-2-3',   label: '3-2-3' },
    { key: '1-1-3-3-1', label: '1-3-3-1' },
  ],
  '7v7': [
    { key: '1-2-3-1',   label: '2-3-1' },
    { key: '1-3-2-1',   label: '3-2-1' },
    { key: '1-2-1-2-1', label: '2-1-2-1' },
    { key: '1-3-1-2',   label: '3-1-2' },
    { key: '1-2-2-2',   label: '2-2-2' },
  ],
  '4v4': [
    { key: '2-2',     label: '2-2' },
    { key: '1-2-1',   label: '1-2-1' },
  ],
};

export function getDefaultFormation(format: GameFormat): FormationKey {
  return FORMATIONS_BY_FORMAT[format][0].key;
}

export const PLAYER_RADIUS = 3.2;
export const PLAYER_HIT_RADIUS = 4.2;
export const PLAYER_FONT_SIZE = 2.4;
export const NAME_FONT_SIZE = 2.25;

export interface LineupSlot {
  playerId: string;
}

export interface StoredPlayer {
  id?: string;
  number: string;
  name: string;
  nickname?: string;
  primaryPos?: Position;
  secondaryPos?: Position;
  half1Time?: number;
  half2Time?: number;
  benchTime?: number;
  onFieldTime?: number;
}

/** @deprecated kept for migration only */
export interface StoredPosition {
  rosterIndex: number;
  playerId?: string;
  x: number;
  y: number;
}

export type MatchType = 'vs' | '@';
export type MatchPhase = 'plan' | 'game';

export interface StoredHalfPlan {
  formation: FormationKey;
  lineup: LineupSlot[];
  /** @deprecated Use lineup instead */
  fieldPositions?: StoredPosition[];
}

export interface StoredGamePlan {
  id: string;
  name: string;
  formation: FormationKey;
  opponentName?: string;
  matchType?: MatchType;
  phase: MatchPhase;
  lineup?: LineupSlot[];
  halfPlan1H?: StoredHalfPlan;
  halfPlan2H?: StoredHalfPlan;
  half1Started?: boolean;
  half2Started?: boolean;
  playerTimes?: Record<string, { half1Time: number; half2Time: number; benchTime: number; onFieldTime: number }>;
  gameEvents?: GameEvent[];
  timerElapsed?: number;
  timerHalf?: 1 | 2;
  /** @deprecated Use lineup instead */
  fieldPositions?: StoredPosition[];
  /** @deprecated Use halfPlan1H instead */
  fieldPositions1H?: StoredPosition[];
  /** @deprecated Use halfPlan2H instead */
  fieldPositions2H?: StoredPosition[];
}

export interface StoredTeam {
  id: string;
  teamName: string;
  players: StoredPlayer[];
  halfLength: number;
  gameFormat: GameFormat;
  formation: FormationKey;
  lineup?: LineupSlot[];
  showBenchTime?: boolean;
  showOnFieldTime?: boolean;
  largeTimeDisplay?: boolean;
  timeDisplayFormat?: TimeDisplayFormat;
  gamePlans?: StoredGamePlan[];
  /** @deprecated Use lineup instead */
  fieldPositions?: StoredPosition[];
}

export interface StoredAppState {
  activeTeamId: string | null;
  teams: StoredTeam[];
}

/** @deprecated kept for migration only */
export interface StoredRoster {
  teamName: string;
  players: StoredPlayer[];
  halfLength?: number;
  gameFormat?: GameFormat;
  formation?: FormationKey;
}

export interface GameEvent {
  type: 'sub' | 'swap';
  half: 1 | 2;
  elapsed: number;
  playerA: string;
  playerB: string;
}

export type TimeDisplayFormat = 'mm:ss' | 'mm';

export function formatTime(seconds: number, format: TimeDisplayFormat = 'mm:ss'): string {
  const m = Math.floor(seconds / 60);
  if (format === 'mm') return String(m).padStart(2, '0');
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Map from old (pre-v2) formation keys to new GK-inclusive keys */
export const FORMATION_KEY_MIGRATION: Record<string, FormationKey> = {
  '4-3-3':   '1-4-3-3',
  '4-2-3-1': '1-4-2-3-1',
  '4-4-2':   '1-4-4-2',
  '3-5-2':   '1-3-5-2',
  '3-4-3':   '1-3-4-3',
  '3-3-2':   '1-3-3-2',
  '4-3-1':   '1-4-3-1',
  '2-4-2':   '1-2-4-2',
  '3-2-3':   '1-3-2-3',
  '1-3-3-1': '1-1-3-3-1',
  '2-3-1':   '1-2-3-1',
  '3-2-1':   '1-3-2-1',
  '2-1-2-1': '1-2-1-2-1',
  '3-1-2':   '1-3-1-2',
  '2-2-2':   '1-2-2-2',
};
