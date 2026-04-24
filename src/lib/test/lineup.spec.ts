import { expect } from '@open-wc/testing';
import { buildInitialLineup, toLineupSlots, fromLineupSlots } from '../lineup.js';
import { getFormationPositions } from '../formations.js';
import type { RosterEntry, FormationKey, LineupSlot, FieldPlayer } from '../types.js';

/*
 * Specification for the position-based lineup engine.
 * See: .cursor/plans/position-based_lineup_engine_6e998405.plan.md
 *
 * buildInitialLineup is the core auto-fill algorithm, extracted as a
 * pure function from the PlayingTime component so it can be tested
 * without DOM.
 *
 * The algorithm fills formation slots in 4 passes:
 *   1. Exact primaryPos match
 *   2. Exact secondaryPos match
 *   3. Best-fit by positional group score
 *   4. Fill remaining by roster order
 */

/* ─── Test fixtures ───────────────────────────────────────── */

function player(id: string, name: string, number: string, opts: {
  primaryPos?: RosterEntry['primaryPos'];
  secondaryPos?: RosterEntry['secondaryPos'];
  nickname?: string;
} = {}): RosterEntry {
  return {
    id, name, number,
    nickname: opts.nickname,
    primaryPos: opts.primaryPos,
    secondaryPos: opts.secondaryPos,
    half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0,
  };
}

const SEVEN_V_SEVEN: FormationKey = '1-2-3-1';

const FULL_7V7_ROSTER: RosterEntry[] = [
  player('gk1',  'Keeper Kim',       '1',  { primaryPos: 'GK' }),
  player('cb1',  'Center Back One',   '4',  { primaryPos: 'CB' }),
  player('cb2',  'Center Back Two',   '5',  { primaryPos: 'CB' }),
  player('cm1',  'Mid One',           '6',  { primaryPos: 'CM' }),
  player('cm2',  'Mid Two',           '8',  { primaryPos: 'CM' }),
  player('cm3',  'Mid Three',         '10', { primaryPos: 'CM' }),
  player('st1',  'Striker Sam',       '9',  { primaryPos: 'ST' }),
  player('sub1', 'Sub Alpha',         '12', { primaryPos: 'CB', secondaryPos: 'CM' }),
  player('sub2', 'Sub Bravo',         '14'),
];

/* ─── buildInitialLineup — basic contract ─────────────────── */

describe('buildInitialLineup()', function () {
  it('is a function exported from lineup module', function () {
    expect(buildInitialLineup).to.be.a('function');
  });

  it('returns a LineupSlot array', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    expect(result).to.be.an('array');
    expect(result[0]).to.have.property('playerId').that.is.a('string');
  });

  it('returns exactly as many slots as the formation requires', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    const expected = getFormationPositions(SEVEN_V_SEVEN).length;
    expect(result).to.have.length(expected);
  });

  it('never assigns the same player to two slots', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    const ids = result.map(s => s.playerId);
    expect(new Set(ids).size).to.equal(ids.length);
  });

  it('only assigns players that exist in the roster', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    const rosterIds = new Set(FULL_7V7_ROSTER.map(p => p.id));
    for (const slot of result) {
      expect(rosterIds.has(slot.playerId)).to.be.true;
    }
  });
});

/* ─── Pass 1: exact primaryPos match ──────────────────────── */

describe('buildInitialLineup() — Pass 1: primaryPos', function () {
  it('places GK at slot 0 for GK-having formations', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    expect(result[0].playerId).to.equal('gk1');
  });

  it('places exact primaryPos matches in correct slots', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    // 1-2-3-1 slots: [GK, CB, CB, CM, CM, CM, ST]
    expect(result[0].playerId).to.equal('gk1');
    expect(result[6].playerId).to.equal('st1');
  });

  it('fills CB slots with CB players', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    const cbIds = new Set(['cb1', 'cb2']);
    expect(cbIds.has(result[1].playerId)).to.be.true;
    expect(cbIds.has(result[2].playerId)).to.be.true;
  });

  it('fills CM slots with CM players', function () {
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN);
    const cmIds = new Set(['cm1', 'cm2', 'cm3']);
    expect(cmIds.has(result[3].playerId)).to.be.true;
    expect(cmIds.has(result[4].playerId)).to.be.true;
    expect(cmIds.has(result[5].playerId)).to.be.true;
  });
});

/* ─── Pass 2: secondaryPos match ──────────────────────────── */

describe('buildInitialLineup() — Pass 2: secondaryPos', function () {
  it('uses secondaryPos when primaryPos slots are full', function () {
    const roster: RosterEntry[] = [
      player('gk1', 'Keeper',   '1', { primaryPos: 'GK' }),
      player('cb1', 'Def One',  '4', { primaryPos: 'CB' }),
      player('cb2', 'Def Two',  '5', { primaryPos: 'CB' }),
      player('cm1', 'Mid One',  '8', { primaryPos: 'CM' }),
      player('cm2', 'Mid Two',  '10', { primaryPos: 'CM' }),
      // This player's primary is LW (no LW slot in 1-2-3-1)
      // but secondary is CM — should fill the 3rd CM slot
      player('lw1', 'Winger',   '7', { primaryPos: 'LW', secondaryPos: 'CM' }),
      player('st1', 'Striker',  '9', { primaryPos: 'ST' }),
    ];
    const result = buildInitialLineup(roster, SEVEN_V_SEVEN);
    // 1-2-3-1 has 3 CM slots; lw1 should fill one via secondaryPos
    const cmSlotIds = [result[3].playerId, result[4].playerId, result[5].playerId];
    expect(cmSlotIds).to.include('lw1');
  });
});

/* ─── Pass 3: best-fit by positional group ────────────────── */

describe('buildInitialLineup() — Pass 3: group affinity', function () {
  it('prefers same-group player over no-position player', function () {
    const roster: RosterEntry[] = [
      player('gk1', 'Keeper',     '1', { primaryPos: 'GK' }),
      player('cb1', 'Def One',    '4', { primaryPos: 'CB' }),
      player('cb2', 'Def Two',    '5', { primaryPos: 'CB' }),
      player('cm1', 'Mid One',    '8', { primaryPos: 'CM' }),
      player('cm2', 'Mid Two',    '10', { primaryPos: 'CM' }),
      // CAM is in the MID group — should be preferred for the CM slot
      // over a player with no position
      player('cam1', 'Playmaker', '11', { primaryPos: 'CAM' }),
      player('nopos', 'No Pos',  '99'),
      player('st1', 'Striker',    '9', { primaryPos: 'ST' }),
    ];
    const result = buildInitialLineup(roster, SEVEN_V_SEVEN);
    // 3 CM slots: cm1, cm2 fill 2 via exact match; cam1 should get 3rd via group
    const cmSlotIds = [result[3].playerId, result[4].playerId, result[5].playerId];
    expect(cmSlotIds).to.include('cam1');
    expect(cmSlotIds).to.not.include('nopos');
  });

  it('prefers DEF group player for CB slot over FWD group', function () {
    const roster: RosterEntry[] = [
      player('gk1', 'Keeper',   '1', { primaryPos: 'GK' }),
      player('cb1', 'Def One',  '4', { primaryPos: 'CB' }),
      // Need a 2nd CB — LB is DEF group, should win over ST
      player('lb1', 'Left Back','3', { primaryPos: 'LB' }),
      player('rw1', 'Winger',   '7', { primaryPos: 'RW' }),
      player('cm1', 'Mid',      '8', { primaryPos: 'CM' }),
      player('cm2', 'Mid Two',  '10', { primaryPos: 'CM' }),
      player('cm3', 'Mid Three','6', { primaryPos: 'CM' }),
      player('st1', 'Striker',  '9', { primaryPos: 'ST' }),
    ];
    const result = buildInitialLineup(roster, SEVEN_V_SEVEN);
    // Slot 1 and 2 are CB; cb1 fills one, lb1 should fill the other
    const defSlotIds = [result[1].playerId, result[2].playerId];
    expect(defSlotIds).to.include('lb1');
  });
});

/* ─── Pass 4: fill remaining ──────────────────────────────── */

describe('buildInitialLineup() — Pass 4: fill remaining', function () {
  it('fills slots with unpositioned players when no matches found', function () {
    const roster: RosterEntry[] = [
      player('p1', 'Alice', '1'),
      player('p2', 'Bob',   '2'),
      player('p3', 'Carol', '3'),
      player('p4', 'Dave',  '4'),
      player('p5', 'Eve',   '5'),
      player('p6', 'Frank', '6'),
      player('p7', 'Grace', '7'),
    ];
    const result = buildInitialLineup(roster, SEVEN_V_SEVEN);
    expect(result).to.have.length(7);
    const ids = result.map(s => s.playerId);
    expect(new Set(ids).size).to.equal(7);
  });

  it('places all available players when roster is smaller than formation', function () {
    const roster: RosterEntry[] = [
      player('p1', 'Alice', '1'),
      player('p2', 'Bob',   '2'),
      player('p3', 'Carol', '3'),
    ];
    const result = buildInitialLineup(roster, SEVEN_V_SEVEN);
    expect(result).to.have.length(3);
    for (const slot of result) {
      expect(slot.playerId).to.not.equal('');
    }
  });

  it('cascades through all 4 passes in a mixed roster', function () {
    // Roster with a mix: some exact matches, one secondary, one group, one unpositioned
    const roster: RosterEntry[] = [
      player('gk1',   'Keeper',    '1',  { primaryPos: 'GK' }),           // Pass 1 → GK slot
      player('cb1',   'Def One',   '4',  { primaryPos: 'CB' }),           // Pass 1 → CB slot
      player('cb2',   'Def Two',   '5',  { primaryPos: 'CB' }),           // Pass 1 → CB slot
      player('cm1',   'Mid One',   '8',  { primaryPos: 'CM' }),           // Pass 1 → CM slot
      player('lw1',   'Winger',    '7',  { primaryPos: 'LW', secondaryPos: 'CM' }), // Pass 2 → CM slot via secondary
      player('cam1',  'Playmaker', '11', { primaryPos: 'CAM' }),          // Pass 3 → CM slot via MID group
      player('nopos', 'Rookie',    '99'),                                  // Pass 4 → ST slot (last open)
    ];
    const result = buildInitialLineup(roster, SEVEN_V_SEVEN);
    expect(result).to.have.length(7);
    const ids = result.map(s => s.playerId);
    // All 7 players placed, no duplicates
    expect(new Set(ids).size).to.equal(7);
    // GK at slot 0 (Pass 1)
    expect(result[0].playerId).to.equal('gk1');
    // The unpositioned player ends up somewhere (Pass 4)
    expect(ids).to.include('nopos');
  });
});

/* ─── Absent players ──────────────────────────────────────── */

describe('buildInitialLineup() — absent players', function () {
  it('excludes absent players from the lineup', function () {
    const absent = new Set(['gk1', 'cm1']);
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN, absent);
    const ids = result.map(s => s.playerId);
    expect(ids).to.not.include('gk1');
    expect(ids).to.not.include('cm1');
  });

  it('fills slots with available players when starter is absent', function () {
    const absent = new Set(['gk1']);
    const result = buildInitialLineup(FULL_7V7_ROSTER, SEVEN_V_SEVEN, absent);
    expect(result).to.have.length(7);
    expect(result[0].playerId).to.not.equal('gk1');
  });
});

/* ─── 4v4 (no GK) ────────────────────────────────────────── */

describe('buildInitialLineup() — 4v4 formations', function () {
  const FOUR_V_FOUR: FormationKey = '2-2';

  it('does not place a GK for 4v4', function () {
    const roster: RosterEntry[] = [
      player('gk1', 'Keeper', '1', { primaryPos: 'GK' }),
      player('cb1', 'Def',    '4', { primaryPos: 'CB' }),
      player('cb2', 'Def 2',  '5', { primaryPos: 'CB' }),
      player('st1', 'Fwd',    '9', { primaryPos: 'ST' }),
      player('st2', 'Fwd 2',  '10', { primaryPos: 'ST' }),
    ];
    const result = buildInitialLineup(roster, FOUR_V_FOUR);
    // 2-2 slots: [CB, CB, ST, ST] — 4 slots, no GK
    expect(result).to.have.length(4);
  });
});

/* ─── 11v11 ───────────────────────────────────────────────── */

describe('buildInitialLineup() — 11v11', function () {
  const ELEVEN: FormationKey = '1-4-3-3';

  it('fills all 11 slots with a full positioned roster', function () {
    const roster: RosterEntry[] = [
      player('gk1', 'GK',  '1',  { primaryPos: 'GK' }),
      player('rb1', 'RB',  '2',  { primaryPos: 'RB' }),
      player('cb1', 'CB1', '4',  { primaryPos: 'CB' }),
      player('cb2', 'CB2', '5',  { primaryPos: 'CB' }),
      player('lb1', 'LB',  '3',  { primaryPos: 'LB' }),
      player('cm1', 'CM1', '8',  { primaryPos: 'CM' }),
      player('cdm', 'CDM', '6',  { primaryPos: 'CDM' }),
      player('cm2', 'CM2', '10', { primaryPos: 'CM' }),
      player('rw1', 'RW',  '7',  { primaryPos: 'RW' }),
      player('st1', 'ST',  '9',  { primaryPos: 'ST' }),
      player('lw1', 'LW',  '11', { primaryPos: 'LW' }),
      player('sub1','Sub', '12'),
    ];
    const result = buildInitialLineup(roster, ELEVEN);
    expect(result).to.have.length(11);
    // GK at slot 0
    expect(result[0].playerId).to.equal('gk1');
  });
});

/* ─── Duplicate positions ─────────────────────────────────── */

describe('buildInitialLineup() — duplicate positions', function () {
  it('places only one GK at slot 0 when two GKs exist', function () {
    const roster: RosterEntry[] = [
      player('gk1', 'First GK',  '1', { primaryPos: 'GK' }),
      player('gk2', 'Second GK', '12', { primaryPos: 'GK' }),
      player('cb1', 'CB1', '4', { primaryPos: 'CB' }),
      player('cb2', 'CB2', '5', { primaryPos: 'CB' }),
      player('cm1', 'CM1', '8', { primaryPos: 'CM' }),
      player('cm2', 'CM2', '10', { primaryPos: 'CM' }),
      player('cm3', 'CM3', '6', { primaryPos: 'CM' }),
      player('st1', 'ST',  '9', { primaryPos: 'ST' }),
    ];
    const result = buildInitialLineup(roster, SEVEN_V_SEVEN);
    // Only one GK slot; first GK in roster should win
    expect(result[0].playerId).to.equal('gk1');
    // Second GK should not be at slot 0
    const ids = result.map(s => s.playerId);
    expect(ids.filter(id => id === 'gk1')).to.have.length(1);
  });
});

/* ─── Round-trip integration ──────────────────────────────── */

describe('lineup round-trip (build → toSlots → fromSlots)', function () {
  it('build then snapshot then restore preserves all players', function () {
    const roster = FULL_7V7_ROSTER;
    const formation = SEVEN_V_SEVEN;

    const lineup = buildInitialLineup(roster, formation);
    const slots = toLineupSlots(
      fromLineupSlots(lineup, roster, formation),
    );

    expect(slots).to.have.length(lineup.length);
    for (let i = 0; i < slots.length; i++) {
      expect(slots[i].playerId).to.equal(lineup[i].playerId);
    }
  });

  it('formation change preserves player assignments at same slot indices', function () {
    const roster = FULL_7V7_ROSTER;
    const original: FormationKey = '1-2-3-1';
    const changed: FormationKey = '1-3-2-1';

    const lineup = buildInitialLineup(roster, original);
    // Restore with a different formation — same players, new coordinates
    const fieldPlayers = fromLineupSlots(lineup, roster, changed);
    const changedCoords = getFormationPositions(changed);

    expect(fieldPlayers).to.have.length(lineup.length);
    for (let i = 0; i < fieldPlayers.length; i++) {
      // Same player at same slot index
      expect(fieldPlayers[i].id).to.equal(lineup[i].playerId);
      // But coordinates from the NEW formation
      expect(fieldPlayers[i].x).to.equal(changedCoords[i].x);
      expect(fieldPlayers[i].y).to.equal(changedCoords[i].y);
    }
  });
});

/* ─── toLineupSlots / fromLineupSlots (snapshot helpers) ──── */

describe('toLineupSlots()', function () {
  it('converts FieldPlayer[] to LineupSlot[]', function () {
    const fieldPlayers: FieldPlayer[] = [
      { id: 'gk1', rosterId: 'gk1', x: 34, y: 62, number: '1', name: 'Kim' },
      { id: 'cb1', rosterId: 'cb1', x: 20, y: 50, number: '4', name: 'Dee' },
    ];
    const result = toLineupSlots(fieldPlayers);
    expect(result).to.have.length(2);
    expect(result[0]).to.deep.equal({ playerId: 'gk1' });
    expect(result[1]).to.deep.equal({ playerId: 'cb1' });
  });

  it('preserves slot order', function () {
    const fieldPlayers: FieldPlayer[] = [
      { id: 'a', rosterId: 'a', x: 0, y: 0, number: '1', name: 'A' },
      { id: 'b', rosterId: 'b', x: 0, y: 0, number: '2', name: 'B' },
      { id: 'c', rosterId: 'c', x: 0, y: 0, number: '3', name: 'C' },
    ];
    const result = toLineupSlots(fieldPlayers);
    expect(result.map(s => s.playerId)).to.deep.equal(['a', 'b', 'c']);
  });
});

describe('fromLineupSlots()', function () {
  it('converts LineupSlot[] back to FieldPlayer[] using formation coords', function () {
    const lineup: LineupSlot[] = [
      { playerId: 'gk1' },
      { playerId: 'cb1' },
    ];
    const roster: RosterEntry[] = [
      player('gk1', 'Keeper Kim', '1', { primaryPos: 'GK', nickname: 'KK' }),
      player('cb1', 'Defender Dee', '4', { primaryPos: 'CB' }),
    ];
    const formation: FormationKey = '1-2-3-1';
    const coords = getFormationPositions(formation);

    const result = fromLineupSlots(lineup, roster, formation);
    expect(result).to.have.length(2);
    expect(result[0].id).to.equal('gk1');
    expect(result[0].x).to.equal(coords[0].x);
    expect(result[0].y).to.equal(coords[0].y);
  });

  it('uses nickname for display name when available', function () {
    const lineup: LineupSlot[] = [{ playerId: 'gk1' }];
    const roster: RosterEntry[] = [
      player('gk1', 'Keeper Kim', '1', { nickname: 'KK' }),
    ];
    const result = fromLineupSlots(lineup, roster, '1-2-3-1');
    expect(result[0].name).to.equal('KK');
  });

  it('uses full name when no nickname is set', function () {
    const lineup: LineupSlot[] = [{ playerId: 'cb1' }];
    const roster: RosterEntry[] = [
      player('cb1', 'Defender Dee', '4'),
    ];
    const result = fromLineupSlots(lineup, roster, '1-2-3-1');
    expect(result[0].name).to.equal('Defender Dee');
  });

  it('skips players not found in roster', function () {
    const lineup: LineupSlot[] = [
      { playerId: 'gk1' },
      { playerId: 'deleted-player' },
    ];
    const roster: RosterEntry[] = [
      player('gk1', 'Keeper', '1'),
    ];
    const result = fromLineupSlots(lineup, roster, '1-2-3-1');
    expect(result).to.have.length(1);
    expect(result[0].id).to.equal('gk1');
  });

  it('assigns correct x/y from formation coordinates per slot index', function () {
    const lineup: LineupSlot[] = [
      { playerId: 'gk1' },
      { playerId: 'cb1' },
      { playerId: 'cb2' },
    ];
    const roster: RosterEntry[] = [
      player('gk1', 'GK', '1'),
      player('cb1', 'CB1', '4'),
      player('cb2', 'CB2', '5'),
    ];
    const formation: FormationKey = '1-2-3-1';
    const coords = getFormationPositions(formation);
    const result = fromLineupSlots(lineup, roster, formation);

    for (let i = 0; i < result.length; i++) {
      expect(result[i].x).to.equal(coords[i].x);
      expect(result[i].y).to.equal(coords[i].y);
    }
  });
});
