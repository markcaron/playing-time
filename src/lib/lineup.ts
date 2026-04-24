import { getFormationPositions, getSlotPositions, positionFitScore } from './formations.js';
import type { RosterEntry, FormationKey, LineupSlot, FieldPlayer } from './types.js';

/**
 * Build an initial lineup by auto-filling formation slots in 4 passes:
 *   1. Exact primaryPos match
 *   2. Exact secondaryPos match
 *   3. Best-fit by positional group affinity score
 *   4. Fill remaining with unpositioned players by roster order
 *
 * Returns only slots that were filled (may be fewer than formation
 * slots if the roster is smaller).
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

  for (let i = 0; i < count; i++) {
    if (lineup[i]) continue;
    const match = presentRoster.find(p => !used.has(p.id));
    if (match) {
      lineup[i] = match;
      used.add(match.id);
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
  return fieldPlayers.map(fp => ({ playerId: fp.id }));
}

/**
 * Restore: rebuild FieldPlayer[] from lineup slots + roster data +
 * formation coordinates. Uses nickname as display name when available.
 * Skips players not found in the roster.
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
      if (!entry) return null;
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
