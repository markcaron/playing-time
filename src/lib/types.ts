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

export type FormationKey = '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2' | '3-4-3';

export const FORMATION_LABELS: { key: FormationKey; label: string }[] = [
  { key: '4-3-3',   label: '4-3-3' },
  { key: '4-2-3-1', label: '4-2-3-1' },
  { key: '4-4-2',   label: '4-4-2' },
  { key: '3-5-2',   label: '3-5-2' },
  { key: '3-4-3',   label: '3-4-3' },
];

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
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
