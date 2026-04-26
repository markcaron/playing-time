import { getSlotPositions } from './formations.js';
import type { FieldPlayer, RosterEntry, FormationKey } from './types.js';

/**
 * Determine the text shown inside a player's circle on the field/bench.
 *
 * - number mode: always jersey number
 * - position mode, field player: formation slot position (e.g. CAM at slot 8)
 * - position mode, bench player: primaryPos from roster, or jersey number
 *
 * Fallback chain for position mode:
 *   slot position → roster primaryPos → jersey number
 */
export function fieldCenterLabel(opts: {
  player: FieldPlayer;
  kind: 'player' | 'sub';
  mode: 'number' | 'position';
  formation: FormationKey;
  fieldIndex?: number;
  roster: RosterEntry[];
}): string {
  const { player, kind, mode, formation, fieldIndex, roster } = opts;

  if (mode === 'number') {
    return player.number;
  }

  if (kind === 'player' && fieldIndex != null && fieldIndex >= 0) {
    const slotPos = getSlotPositions(formation)[fieldIndex];
    if (slotPos) return slotPos;
  }

  const entry = roster.find(r => r.id === player.id);
  if (entry?.primaryPos) return entry.primaryPos;

  return player.number;
}
