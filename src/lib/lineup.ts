import { getFormationPositions, getSlotPositions, positionFitScore } from './formations.js';
import type { RosterEntry, FormationKey, LineupSlot, FieldPlayer } from './types.js';

/**
 * Build an initial lineup by auto-filling formation slots in 3 passes:
 *   1. Exact primaryPos match
 *   2. Exact secondaryPos match
 *   3. Best-fit by positional group affinity score, which also
 *      handles unpositioned players (score 0 still beats the
 *      initial bestScore of -1, so Pass 3 subsumes what would
 *      otherwise be a separate "fill remaining" pass)
 *
 * Returns only slots that were filled (may be fewer than formation
 * slots if the roster is smaller).
 *
 * @see .cursor/plans/position-based_lineup_engine_6e998405.plan.md
 */
export function buildInitialLineup(
  roster: RosterEntry[],
  formation: FormationKey,
  absentIds?: Set<string>,
): LineupSlot[] {
  const coords = getFormationPositions(formation);
  const slotPositions = getSlotPositions(formation);
  const count = coords.length;
  const lineup: (RosterEntry | null)[] = new Array(count).fill(null);
  const used = new Set<string>();
  const presentRoster = absentIds
    ? roster.filter(p => !absentIds.has(p.id))
    : roster;

  for (let i = 0; i < count; i++) {
    const slotPos = slotPositions[i];
    const match = presentRoster.find(p => !used.has(p.id) && p.primaryPos === slotPos);
    if (match) {
      lineup[i] = match;
      used.add(match.id);
    }
  }

  for (let i = 0; i < count; i++) {
    if (lineup[i]) continue;
    const slotPos = slotPositions[i];
    const match = presentRoster.find(p => !used.has(p.id) && p.secondaryPos === slotPos);
    if (match) {
      lineup[i] = match;
      used.add(match.id);
    }
  }

  // Pass 3 handles both group-affinity placement AND unpositioned
  // players: bestScore starts at -1, so even a score of 0 (no
  // position data) wins. This fills every open slot that has an
  // available player, making a separate "fill remaining" pass
  // unnecessary.
  const openSlots: number[] = [];
  for (let i = 0; i < count; i++) {
    if (!lineup[i]) openSlots.push(i);
  }
  const remaining = presentRoster.filter(p => !used.has(p.id));

  if (openSlots.length > 0 && remaining.length > 0) {
    const pool = [...remaining];
    for (const slotIdx of openSlots) {
      if (pool.length === 0) break;
      const slotPos = slotPositions[slotIdx];
      let bestIdx = 0;
      let bestScore = -1;
      for (let j = 0; j < pool.length; j++) {
        const score =
          positionFitScore(pool[j].primaryPos, slotPos) * 2 +
          positionFitScore(pool[j].secondaryPos, slotPos);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
        }
      }
      lineup[slotIdx] = pool[bestIdx];
      used.add(pool[bestIdx].id);
      pool.splice(bestIdx, 1);
    }
  }

  return lineup
    .filter((entry): entry is RosterEntry => entry !== null)
    .map(entry => ({ playerId: entry.id }));
}

/**
 * Snapshot: extract player IDs from FieldPlayer[] in slot order.
 */
export function toLineupSlots(fieldPlayers: FieldPlayer[]): LineupSlot[] {
  return fieldPlayers.map(fp => ({ playerId: fp.rosterId }));
}

/**
 * Restore: rebuild FieldPlayer[] from lineup slots + roster data +
 * formation coordinates. Uses nickname as display name when available.
 * Skips players not found in the roster or beyond formation bounds.
 */
export function fromLineupSlots(
  lineup: LineupSlot[],
  roster: RosterEntry[],
  formation: FormationKey,
): FieldPlayer[] {
  const coords = getFormationPositions(formation);
  return lineup
    .map((slot, i) => {
      const entry = roster.find(r => r.id === slot.playerId);
      if (!entry || !coords[i]) return null;
      return {
        id: entry.id,
        rosterId: entry.id,
        x: coords[i].x,
        y: coords[i].y,
        number: entry.number,
        name: entry.nickname || entry.name,
      };
    })
    .filter((p): p is FieldPlayer => p !== null);
}
