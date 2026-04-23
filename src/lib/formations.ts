import { FIELD } from './field.js';
import type { FormationKey, Position } from './types.js';

const W = FIELD.WIDTH;
const H = FIELD.LENGTH;

const GK_Y = 62;
const DEF_Y = H - 24;
const ATK_Y = 10;

function distribute(lineCount: number): number[] {
  if (lineCount === 1) return [DEF_Y];
  if (lineCount === 2) return [DEF_Y, ATK_Y];
  const defY = lineCount >= 4 ? DEF_Y + 3 : DEF_Y;
  const atkY = lineCount >= 4 ? ATK_Y - 3 : ATK_Y;
  const positions: number[] = [];
  for (let i = 0; i < lineCount; i++) {
    positions.push(defY - (defY - atkY) * (i / (lineCount - 1)));
  }
  return positions;
}

function row(y: number, count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const spacing = W / (count + 1);
  for (let i = count; i >= 1; i--) {
    positions.push({ x: spacing * i, y });
  }
  return positions;
}

function formation(lines: number[]): { x: number; y: number }[] {
  const yPositions = distribute(lines.length);
  const result: { x: number; y: number }[] = [{ x: W / 2, y: GK_Y }];
  for (let i = 0; i < lines.length; i++) {
    result.push(...row(yPositions[i], lines[i]));
  }
  return result;
}

function formationNoGK(lines: number[]): { x: number; y: number }[] {
  const yPositions = distribute(lines.length);
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    result.push(...row(yPositions[i], lines[i]));
  }
  return result;
}

const FORMATIONS: Record<FormationKey, { x: number; y: number }[]> = {
  // 11v11
  '1-4-3-3':   formation([4, 3, 3]),
  '1-4-2-3-1': formation([4, 2, 3, 1]),
  '1-4-4-2':   formation([4, 4, 2]),
  '1-3-5-2':   formation([3, 5, 2]),
  '1-3-4-3':   formation([3, 4, 3]),

  // 9v9
  '1-3-3-2':   formation([3, 3, 2]),
  '1-4-3-1':   formation([4, 3, 1]),
  '1-2-4-2':   formation([2, 4, 2]),
  '1-3-2-3':   formation([3, 2, 3]),
  '1-1-3-3-1': formation([1, 3, 3, 1]),

  // 7v7
  '1-2-3-1':   formation([2, 3, 1]),
  '1-3-2-1':   formation([3, 2, 1]),
  '1-2-1-2-1': formation([2, 1, 2, 1]),
  '1-3-1-2':   formation([3, 1, 2]),
  '1-2-2-2':   formation([2, 2, 2]),

  // 4v4 (no GK)
  '2-2':   formationNoGK([2, 2]),
  '1-2-1': formationNoGK([1, 2, 1]),
};

export function getFormationPositions(key: FormationKey): { x: number; y: number }[] {
  return FORMATIONS[key];
}

export type PositionalGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

const FOUR_V_FOUR_KEYS: Set<FormationKey> = new Set(['2-2', '1-2-1']);

export function formationHasGK(key: FormationKey): boolean {
  return !FOUR_V_FOUR_KEYS.has(key);
}

export const POS_TO_GROUP: Record<Position, PositionalGroup> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF',
  CDM: 'MID', CM: 'MID', CAM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', CF: 'FWD', ST: 'FWD',
};

/**
 * Exact position for each slot in every formation.
 * The `row()` helper lays out players right-to-left, so
 * slot order within a line goes from the player's RIGHT side
 * of the pitch to LEFT (i.e., the first slot in a 4-back line
 * is the right-side defender).
 */
const SLOT_POSITIONS: Record<FormationKey, Position[]> = {
  // 11v11
  '1-4-3-3':   ['GK', 'RB','CB','CB','LB', 'CM','CDM','CM', 'RW','ST','LW'],
  '1-4-2-3-1': ['GK', 'RB','CB','CB','LB', 'CDM','CDM', 'RW','CAM','LW', 'ST'],
  '1-4-4-2':   ['GK', 'RB','CB','CB','LB', 'RM','CM','CM','LM', 'ST','ST'],
  '1-3-5-2':   ['GK', 'CB','CB','CB', 'RM','CDM','CM','CM','LM', 'ST','ST'],
  '1-3-4-3':   ['GK', 'CB','CB','CB', 'RM','CM','CM','LM', 'RW','ST','LW'],

  // 9v9
  '1-3-3-2':   ['GK', 'RB','CB','LB', 'CM','CDM','CM', 'ST','ST'],
  '1-4-3-1':   ['GK', 'RB','CB','CB','LB', 'CM','CDM','CM', 'ST'],
  '1-2-4-2':   ['GK', 'CB','CB', 'RM','CM','CM','LM', 'ST','ST'],
  '1-3-2-3':   ['GK', 'RB','CB','LB', 'CM','CM', 'RW','ST','LW'],
  '1-1-3-3-1': ['GK', 'CB', 'CM','CDM','CM', 'RW','CAM','LW', 'ST'],

  // 7v7
  '1-2-3-1':   ['GK', 'CB','CB', 'CM','CM','CM', 'ST'],
  '1-3-2-1':   ['GK', 'RB','CB','LB', 'CM','CM', 'ST'],
  '1-2-1-2-1': ['GK', 'CB','CB', 'CM', 'RW','LW', 'ST'],
  '1-3-1-2':   ['GK', 'RB','CB','LB', 'CM', 'ST','ST'],
  '1-2-2-2':   ['GK', 'CB','CB', 'CM','CM', 'ST','ST'],

  // 4v4 (no GK)
  '2-2':   ['CB','CB', 'ST','ST'],
  '1-2-1': ['CB', 'CM','CM', 'ST'],
};

/**
 * Returns the exact position expected at each slot index in the formation.
 */
export function getSlotPositions(key: FormationKey): Position[] {
  return SLOT_POSITIONS[key];
}

/**
 * Score how well a player position fits a slot position.
 * Higher = better fit. 0 = no affinity.
 */
export function positionFitScore(playerPos: Position | undefined, slotPos: Position): number {
  if (!playerPos) return 0;
  if (playerPos === slotPos) return 4;
  if (POS_TO_GROUP[playerPos] === POS_TO_GROUP[slotPos]) return 2;
  return 0;
}
