import type { RosterEntry } from './types.js';

/**
 * Apply a time delta to all players in the roster. On-field players
 * receive half time and onFieldTime; bench players receive benchTime.
 * Returns a new array — does not mutate the input.
 */
export function applyTimeDelta(
  roster: RosterEntry[],
  fieldIds: Set<string>,
  half: 1 | 2,
  delta: number,
): RosterEntry[] {
  const d = Math.max(0, delta);
  return roster.map(p => {
    const onField = fieldIds.has(p.id);
    return {
      ...p,
      half1Time: p.half1Time + (onField && half === 1 ? d : 0),
      half2Time: p.half2Time + (onField && half === 2 ? d : 0),
      onFieldTime: p.onFieldTime + (onField ? d : 0),
      benchTime: p.benchTime + (!onField ? d : 0),
    };
  });
}
