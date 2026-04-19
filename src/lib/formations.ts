import { FIELD } from './field.js';
import type { FormationKey } from './types.js';

const W = FIELD.WIDTH;
const H = FIELD.HALF_LENGTH;

function row(y: number, count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const spacing = W / (count + 1);
  for (let i = count; i >= 1; i--) {
    positions.push({ x: spacing * i, y });
  }
  return positions;
}

const FORMATIONS: Record<FormationKey, { x: number; y: number }[]> = {
  // 11v11
  '4-3-3': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 4),
    ...row(H - 28, 3),
    ...row(H - 42, 3),
  ],
  '4-2-3-1': [
    { x: W / 2, y: H - 4 },
    ...row(H - 13, 4),
    ...row(H - 23, 2),
    ...row(H - 34, 3),
    { x: W / 2, y: H - 46 },
  ],
  '4-4-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 4),
    ...row(H - 28, 4),
    ...row(H - 42, 2),
  ],
  '3-5-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 3),
    ...row(H - 28, 5),
    ...row(H - 42, 2),
  ],
  '3-4-3': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 3),
    ...row(H - 28, 4),
    ...row(H - 42, 3),
  ],

  // 9v9 (8 outfield + GK)
  '3-3-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 15, 3),
    ...row(H - 28, 3),
    ...row(H - 41, 2),
  ],
  '4-3-1': [
    { x: W / 2, y: H - 4 },
    ...row(H - 15, 4),
    ...row(H - 28, 3),
    { x: W / 2, y: H - 42 },
  ],
  '2-4-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 15, 2),
    ...row(H - 28, 4),
    ...row(H - 41, 2),
  ],
  '3-2-3': [
    { x: W / 2, y: H - 4 },
    ...row(H - 15, 3),
    ...row(H - 28, 2),
    ...row(H - 41, 3),
  ],
  '1-3-3-1': [
    { x: W / 2, y: H - 4 },
    { x: W / 2, y: H - 14 },
    ...row(H - 24, 3),
    ...row(H - 34, 3),
    { x: W / 2, y: H - 44 },
  ],

  // 7v7 (6 outfield + GK)
  '2-3-1': [
    { x: W / 2, y: H - 4 },
    ...row(H - 16, 2),
    ...row(H - 30, 3),
    { x: W / 2, y: H - 43 },
  ],
  '3-2-1': [
    { x: W / 2, y: H - 4 },
    ...row(H - 16, 3),
    ...row(H - 30, 2),
    { x: W / 2, y: H - 43 },
  ],
  '2-1-2-1': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 2),
    { x: W / 2, y: H - 24 },
    ...row(H - 34, 2),
    { x: W / 2, y: H - 44 },
  ],
  '3-1-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 16, 3),
    { x: W / 2, y: H - 30 },
    ...row(H - 43, 2),
  ],

  '2-2-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 16, 2),
    ...row(H - 30, 2),
    ...row(H - 43, 2),
  ],

  // 4v4 (no GK)
  '2-2': [
    ...row(H - 14, 2),
    ...row(H - 36, 2),
  ],
  '1-2-1': [
    { x: W / 2, y: H - 10 },
    ...row(H - 26, 2),
    { x: W / 2, y: H - 42 },
  ],
};

export function getFormationPositions(key: FormationKey): { x: number; y: number }[] {
  return FORMATIONS[key];
}
