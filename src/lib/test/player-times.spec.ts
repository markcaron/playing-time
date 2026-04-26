import { expect } from '@open-wc/testing';
import { applyTimeDelta } from '../player-times.js';
import type { RosterEntry, FormationKey } from '../types.js';

/*
 * Specification: Delta-based player time updates
 * See: .cursor/plans/player_position_tracking_0e77d415.plan.md
 *
 * applyTimeDelta replaces the old +1-per-tick approach.
 * Given a roster, the set of on-field player IDs, the current half,
 * and a delta in seconds, it returns a new roster with updated times.
 *
 * This is a pure function — no DOM, no side effects.
 */

/* ─── Helpers ─────────────────────────────────────────────── */

function player(id: string, overrides: Partial<RosterEntry> = {}): RosterEntry {
  return {
    id, name: `Player ${id}`, number: '1',
    half1Time: 0, half2Time: 0, benchTime: 0, onFieldTime: 0,
    ...overrides,
  };
}

/* ─── Basic contract ──────────────────────────────────────── */

describe('applyTimeDelta()', function () {
  it('is a function exported from player-times module', function () {
    expect(applyTimeDelta).to.be.a('function');
  });

  it('returns a new roster array (does not mutate input)', function () {
    const roster = [player('p1'), player('p2')];
    const fieldIds = new Set(['p1']);
    const result = applyTimeDelta(roster, fieldIds, 1, 5);
    expect(result).to.not.equal(roster);
    expect(result[0]).to.not.equal(roster[0]);
  });
});

/* ─── Half time accumulation ──────────────────────────────── */

describe('applyTimeDelta() — half times', function () {
  it('adds delta to half1Time for on-field players in half 1', function () {
    const roster = [player('p1', { half1Time: 10 })];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, 5);
    expect(result[0].half1Time).to.equal(15);
  });

  it('adds delta to half2Time for on-field players in half 2', function () {
    const roster = [player('p1', { half2Time: 10 })];
    const result = applyTimeDelta(roster, new Set(['p1']), 2, 5);
    expect(result[0].half2Time).to.equal(15);
  });

  it('does not change the wrong half', function () {
    const roster = [player('p1', { half1Time: 10, half2Time: 20 })];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, 5);
    expect(result[0].half1Time).to.equal(15);
    expect(result[0].half2Time).to.equal(20);
  });
});

/* ─── On-field vs bench ───────────────────────────────────── */

describe('applyTimeDelta() — field vs bench', function () {
  it('adds delta to onFieldTime for on-field players', function () {
    const roster = [player('p1', { onFieldTime: 10 })];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, 5);
    expect(result[0].onFieldTime).to.equal(15);
  });

  it('adds delta to benchTime for bench players', function () {
    const roster = [player('p1'), player('p2')];
    const fieldIds = new Set(['p1']);
    const result = applyTimeDelta(roster, fieldIds, 1, 5);
    expect(result[1].benchTime).to.equal(5);
  });

  it('does not add benchTime to on-field players', function () {
    const roster = [player('p1')];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, 5);
    expect(result[0].benchTime).to.equal(0);
  });

  it('does not add onFieldTime to bench players', function () {
    const roster = [player('p1'), player('bench1')];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, 5);
    expect(result[1].onFieldTime).to.equal(0);
  });
});

/* ─── Large delta (sleep/wake catch-up) ───────────────────── */

describe('applyTimeDelta() — large delta (sleep/wake)', function () {
  it('applies a 300-second delta correctly (5 min sleep)', function () {
    const roster = [
      player('field1', { half1Time: 60, onFieldTime: 60 }),
      player('bench1', { benchTime: 60 }),
    ];
    const result = applyTimeDelta(roster, new Set(['field1']), 1, 300);
    expect(result[0].half1Time).to.equal(360);
    expect(result[0].onFieldTime).to.equal(360);
    expect(result[1].benchTime).to.equal(360);
  });

  it('applies a 1-second delta correctly (normal tick)', function () {
    const roster = [player('p1', { half1Time: 10, onFieldTime: 10 })];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, 1);
    expect(result[0].half1Time).to.equal(11);
    expect(result[0].onFieldTime).to.equal(11);
  });
});

/* ─── Zero and edge cases ─────────────────────────────────── */

describe('applyTimeDelta() — edge cases', function () {
  it('does nothing with delta of 0', function () {
    const roster = [player('p1', { half1Time: 10 })];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, 0);
    expect(result[0].half1Time).to.equal(10);
  });

  it('handles an empty roster', function () {
    const result = applyTimeDelta([], new Set(), 1, 5);
    expect(result).to.deep.equal([]);
  });

  it('handles empty fieldIds (everyone on bench)', function () {
    const roster = [player('p1'), player('p2')];
    const result = applyTimeDelta(roster, new Set(), 1, 5);
    expect(result[0].benchTime).to.equal(5);
    expect(result[1].benchTime).to.equal(5);
    expect(result[0].onFieldTime).to.equal(0);
  });

  it('treats negative delta as 0 (no time subtraction)', function () {
    const roster = [player('p1', { half1Time: 10 })];
    const result = applyTimeDelta(roster, new Set(['p1']), 1, -5);
    expect(result[0].half1Time).to.equal(10);
  });
});

/* ─── Multiple players ────────────────────────────────────── */

describe('applyTimeDelta() — multiple players', function () {
  it('updates all field and bench players in one call', function () {
    const roster = [
      player('gk1'),
      player('cb1'),
      player('cm1'),
      player('sub1'),
      player('sub2'),
    ];
    const fieldIds = new Set(['gk1', 'cb1', 'cm1']);
    const result = applyTimeDelta(roster, fieldIds, 1, 10);

    for (const p of result.slice(0, 3)) {
      expect(p.half1Time).to.equal(10);
      expect(p.onFieldTime).to.equal(10);
      expect(p.benchTime).to.equal(0);
    }
    for (const p of result.slice(3)) {
      expect(p.benchTime).to.equal(10);
      expect(p.onFieldTime).to.equal(0);
      expect(p.half1Time).to.equal(0);
    }
  });
});
