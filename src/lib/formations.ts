import { FIELD } from './field.js';
import type { FormationKey } from './types.js';

/**
 * Each formation is an array of 11 {x,y} positions on the half-field.
 * Field: 68 wide × 52.5 tall. (0,0) = top-left, goal at bottom.
 * Index 0 = GK (near bottom/goal). Rows go from defense → attack (high y → low y).
 */

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
  '4-3-3': [
    { x: W / 2, y: H - 4 },         // GK
    ...row(H - 14, 4),               // 4 defenders
    ...row(H - 28, 3),               // 3 midfielders
    ...row(H - 42, 3),               // 3 forwards
  ],
  '4-2-3-1': [
    { x: W / 2, y: H - 4 },
    ...row(H - 13, 4),               // 4 defenders
    ...row(H - 23, 2),               // 2 defensive mids
    ...row(H - 34, 3),               // 3 attacking mids
    { x: W / 2, y: H - 46 },        // 1 striker
  ],
  '4-4-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 4),
    ...row(H - 28, 4),
    ...row(H - 42, 2),
  ],
  '3-5-2': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 3),               // 3 defenders
    ...row(H - 28, 5),               // 5 midfielders
    ...row(H - 42, 2),               // 2 forwards
  ],
  '3-4-3': [
    { x: W / 2, y: H - 4 },
    ...row(H - 14, 3),
    ...row(H - 28, 4),
    ...row(H - 42, 3),
  ],
};

export function getFormationPositions(key: FormationKey): { x: number; y: number }[] {
  return FORMATIONS[key];
}
