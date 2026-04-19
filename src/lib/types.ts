export interface RosterEntry {
  id: string;
  number: string;
  name: string;
  half1Time: number;
  half2Time: number;
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

export const GAME_FORMATS: { key: GameFormat; label: string; playerCount: number }[] = [
  { key: '11v11', label: '11v11', playerCount: 11 },
  { key: '9v9',   label: '9v9',   playerCount: 9 },
  { key: '7v7',   label: '7v7',   playerCount: 7 },
  { key: '4v4',   label: '4v4',   playerCount: 4 },
];

export function getPlayerCount(format: GameFormat): number {
  return GAME_FORMATS.find(f => f.key === format)?.playerCount ?? 11;
}

export type FormationKey =
  | '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2' | '3-4-3'
  | '3-3-2' | '4-3-1' | '2-4-2' | '3-2-3' | '1-3-3-1'
  | '2-3-1' | '3-2-1' | '2-1-2-1' | '3-1-2' | '2-2-2'
  | '2-2' | '1-2-1';

export const FORMATIONS_BY_FORMAT: Record<GameFormat, { key: FormationKey; label: string }[]> = {
  '11v11': [
    { key: '4-3-3',   label: '4-3-3' },
    { key: '4-2-3-1', label: '4-2-3-1' },
    { key: '4-4-2',   label: '4-4-2' },
    { key: '3-5-2',   label: '3-5-2' },
    { key: '3-4-3',   label: '3-4-3' },
  ],
  '9v9': [
    { key: '3-3-2',   label: '3-3-2' },
    { key: '4-3-1',   label: '4-3-1' },
    { key: '2-4-2',   label: '2-4-2' },
    { key: '3-2-3',   label: '3-2-3' },
    { key: '1-3-3-1', label: '1-3-3-1' },
  ],
  '7v7': [
    { key: '2-3-1',   label: '2-3-1' },
    { key: '3-2-1',   label: '3-2-1' },
    { key: '2-1-2-1', label: '2-1-2-1' },
    { key: '3-1-2',   label: '3-1-2' },
    { key: '2-2-2',   label: '2-2-2' },
  ],
  '4v4': [
    { key: '2-2',     label: '2-2' },
    { key: '1-2-1',   label: '1-2-1' },
  ],
};

export function getDefaultFormation(format: GameFormat): FormationKey {
  return FORMATIONS_BY_FORMAT[format][0].key;
}

export const PLAYER_RADIUS = 2.25;
export const PLAYER_FONT_SIZE = 1.8;
export const NAME_FONT_SIZE = 1.6;

export interface StoredPlayer {
  number: string;
  name: string;
  half1Time?: number;
  half2Time?: number;
}

export interface StoredRoster {
  teamName: string;
  players: StoredPlayer[];
  halfLength?: number;
  gameFormat?: GameFormat;
  formation?: FormationKey;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
