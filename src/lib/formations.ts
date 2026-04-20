import { FIELD } from './field.js';
import type { FormationKey } from './types.js';

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
  '4-3-3':   formation([4, 3, 3]),
  '4-2-3-1': formation([4, 2, 3, 1]),
  '4-4-2':   formation([4, 4, 2]),
  '3-5-2':   formation([3, 5, 2]),
  '3-4-3':   formation([3, 4, 3]),

  // 9v9
  '3-3-2':   formation([3, 3, 2]),
  '4-3-1':   formation([4, 3, 1]),
  '2-4-2':   formation([2, 4, 2]),
  '3-2-3':   formation([3, 2, 3]),
  '1-3-3-1': formation([1, 3, 3, 1]),

  // 7v7
  '2-3-1':   formation([2, 3, 1]),
  '3-2-1':   formation([3, 2, 1]),
  '2-1-2-1': formation([2, 1, 2, 1]),
  '3-1-2':   formation([3, 1, 2]),
  '2-2-2':   formation([2, 2, 2]),

  // 4v4 (no GK)
  '2-2':   formationNoGK([2, 2]),
  '1-2-1': formationNoGK([1, 2, 1]),
};

export function getFormationPositions(key: FormationKey): { x: number; y: number }[] {
  return FORMATIONS[key];
}
