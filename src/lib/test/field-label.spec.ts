import { expect } from '@open-wc/testing';
import { fieldCenterLabel } from '../field-label.js';
import type { FieldPlayer, RosterEntry, FormationKey } from '../types.js';

/*
 * Specification: field center label logic
 *
 * fieldCenterLabel determines what text appears inside each player's
 * circle on the field and bench:
 *
 *   - number mode: always show jersey number
 *   - position mode, field player: show formation slot position
 *     (e.g. CAM at slot 8 in 1-4-2-3-1)
 *   - position mode, bench player: show primaryPos from roster
 *   - position mode, bench player with no primaryPos: fall back to
 *     jersey number
 *
 * After a swap, labels reflect the NEW slot positions (labels match
 * the formation slot, not the player's original position).
 *
 * This is extracted as a pure function for testability. The component
 * calls it in #renderPlayerCircle.
 */

function fp(id: string, number: string): FieldPlayer {
  return { id, rosterId: id, x: 0, y: 0, number, name: `Player ${id}` };
}

function roster(id: string, number: string, primaryPos?: string): RosterEntry {
  return {
    id, number, name: `Player ${id}`,
    primaryPos: primaryPos as any,
    half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0,
  };
}

const FORMATION: FormationKey = '1-4-2-3-1';

/* ═══════════════════════════════════════════════════════════════
 * Number mode — always jersey number
 * ═══════════════════════════════════════════════════════════════ */

describe('fieldCenterLabel() — number mode', function () {
  it('returns jersey number for a field player', function () {
    const result = fieldCenterLabel({
      player: fp('p1', '10'),
      kind: 'player',
      mode: 'number',
      formation: FORMATION,
      fieldIndex: 8,
      roster: [roster('p1', '10', 'CAM')],
    });
    expect(result).to.equal('10');
  });

  it('returns jersey number for a bench player', function () {
    const result = fieldCenterLabel({
      player: fp('sub1', '12'),
      kind: 'sub',
      mode: 'number',
      formation: FORMATION,
      roster: [roster('sub1', '12', 'CM')],
    });
    expect(result).to.equal('12');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Position mode — field players show formation slot
 * ═══════════════════════════════════════════════════════════════ */

describe('fieldCenterLabel() — position mode, field', function () {
  it('shows the formation slot position for a field player', function () {
    // 1-4-2-3-1 slot 8 = CAM
    const result = fieldCenterLabel({
      player: fp('p1', '10'),
      kind: 'player',
      mode: 'position',
      formation: FORMATION,
      fieldIndex: 8,
      roster: [roster('p1', '10', 'CM')],
    });
    expect(result).to.equal('CAM');
  });

  it('shows GK for slot 0', function () {
    const result = fieldCenterLabel({
      player: fp('gk1', '1'),
      kind: 'player',
      mode: 'position',
      formation: FORMATION,
      fieldIndex: 0,
      roster: [roster('gk1', '1', 'GK')],
    });
    expect(result).to.equal('GK');
  });

  it('shows ST for the striker slot', function () {
    // 1-4-2-3-1 slot 10 = ST
    const result = fieldCenterLabel({
      player: fp('st1', '9'),
      kind: 'player',
      mode: 'position',
      formation: FORMATION,
      fieldIndex: 10,
      roster: [roster('st1', '9', 'ST')],
    });
    expect(result).to.equal('ST');
  });

  it('reflects new position after a swap (label matches slot, not player)', function () {
    // Player was originally a CM but swapped to the CAM slot (8)
    const result = fieldCenterLabel({
      player: fp('cm1', '8'),
      kind: 'player',
      mode: 'position',
      formation: FORMATION,
      fieldIndex: 8,
      roster: [roster('cm1', '8', 'CM')],
    });
    expect(result, 'should show slot position, not primaryPos').to.equal('CAM');
  });

  it('works with different formations', function () {
    // 1-2-3-1 slot 3 = CM
    const result = fieldCenterLabel({
      player: fp('p1', '10'),
      kind: 'player',
      mode: 'position',
      formation: '1-2-3-1' as FormationKey,
      fieldIndex: 3,
      roster: [roster('p1', '10')],
    });
    expect(result).to.equal('CM');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Position mode — bench players show primaryPos
 * ═══════════════════════════════════════════════════════════════ */

describe('fieldCenterLabel() — position mode, bench', function () {
  it('shows primaryPos for a bench player', function () {
    const result = fieldCenterLabel({
      player: fp('sub1', '12'),
      kind: 'sub',
      mode: 'position',
      formation: FORMATION,
      roster: [roster('sub1', '12', 'CM')],
    });
    expect(result).to.equal('CM');
  });

  it('falls back to jersey number when bench player has no primaryPos', function () {
    const result = fieldCenterLabel({
      player: fp('sub2', '14'),
      kind: 'sub',
      mode: 'position',
      formation: FORMATION,
      roster: [roster('sub2', '14')],
    });
    expect(result).to.equal('14');
  });

  it('shows primaryPos regardless of formation (not slot-dependent)', function () {
    const result = fieldCenterLabel({
      player: fp('sub1', '12'),
      kind: 'sub',
      mode: 'position',
      formation: '2-2' as FormationKey,
      roster: [roster('sub1', '12', 'GK')],
    });
    expect(result).to.equal('GK');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Edge cases
 * ═══════════════════════════════════════════════════════════════ */

describe('fieldCenterLabel() — edge cases', function () {
  it('falls back to jersey number if fieldIndex is out of bounds', function () {
    const result = fieldCenterLabel({
      player: fp('p1', '10'),
      kind: 'player',
      mode: 'position',
      formation: FORMATION,
      fieldIndex: 99,
      roster: [roster('p1', '10', 'CM')],
    });
    expect(result).to.equal('CM');
  });

  it('falls back to jersey number if player not found in roster', function () {
    const result = fieldCenterLabel({
      player: fp('ghost', '99'),
      kind: 'sub',
      mode: 'position',
      formation: FORMATION,
      roster: [],
    });
    expect(result).to.equal('99');
  });
});
