import { expect } from '@open-wc/testing';
import { parseRosterWithMeta, serializeRosterYaml } from '../roster-parser.js';
import type { RosterMeta } from '../roster-parser.js';

/*
 * Specification: YAML serialization normalization
 *
 * The serializer should output standard YAML key-value pairs for each
 * player, NOT the hybrid `- NUMBER. Name` format:
 *
 * BEFORE (hybrid):
 *   - 7. Ally Sentnor
 *     primaryPos: ST
 *
 * AFTER (normalized):
 *   - name: Ally Sentnor
 *     number: "7"
 *     primaryPos: ST
 *
 * The parser must continue to accept both formats on import.
 */

/* ─── Normalized YAML output format ───────────────────────── */

describe('serializeRosterYaml() — normalized output', function () {
  it('outputs each player as YAML key-value pairs, not hybrid format', function () {
    const yaml = serializeRosterYaml({}, [
      { number: '7', name: 'Ally Sentnor', primaryPos: 'ST' },
    ]);
    expect(yaml).to.include('name: Ally Sentnor');
    expect(yaml).to.not.match(/- \d+\./);
  });

  it('outputs number as a separate key-value pair', function () {
    const yaml = serializeRosterYaml({}, [
      { number: '7', name: 'Ally Sentnor' },
    ]);
    expect(yaml).to.match(/number: "?7"?/);
  });

  it('outputs name as a separate key-value pair', function () {
    const yaml = serializeRosterYaml({}, [
      { number: '10', name: 'Rose Lavelle' },
    ]);
    expect(yaml).to.include('name: Rose Lavelle');
  });

  it('outputs a full player with all fields as key-value pairs', function () {
    const yaml = serializeRosterYaml({}, [
      { number: '11', name: 'Rose Lavelle', nickname: 'Rosie', primaryPos: 'CAM', secondaryPos: 'CM' },
    ]);
    expect(yaml).to.include('name: Rose Lavelle');
    expect(yaml).to.match(/number: "?11"?/);
    expect(yaml).to.include('nickname: Rosie');
    expect(yaml).to.include('primaryPos: CAM');
    expect(yaml).to.include('secondaryPos: CM');
    expect(yaml).to.not.match(/- \d+\./);
  });

  it('outputs players without numbers using only name key', function () {
    const yaml = serializeRosterYaml({}, [
      { name: 'Unknown Player' },
    ]);
    expect(yaml).to.include('name: Unknown Player');
    expect(yaml).to.not.match(/number:/);
  });

  it('round-trips through the normalized format', function () {
    const meta: RosterMeta = { name: 'Test FC', format: '7v7', halfLength: 25, formation: '1-2-3-1' };
    const players = [
      { number: '1', name: 'Keeper Kim', primaryPos: 'GK' },
      { number: '10', name: 'Rose Lavelle', nickname: 'Rosie', primaryPos: 'CAM', secondaryPos: 'CM' },
      { number: '9', name: 'Striker Sam', primaryPos: 'ST' },
    ];
    const yaml = serializeRosterYaml(meta, players);
    const parsed = parseRosterWithMeta(yaml);

    expect(parsed.meta.name).to.equal('Test FC');
    expect(parsed.meta.format).to.equal('7v7');
    expect(parsed.meta.halfLength).to.equal(25);
    expect(parsed.meta.formation).to.equal('1-2-3-1');
    expect(parsed.players).to.have.length(3);

    expect(parsed.players[0]).to.deep.include({ number: '1', name: 'Keeper Kim', primaryPos: 'GK' });
    expect(parsed.players[1]).to.deep.include({ number: '10', name: 'Rose Lavelle', nickname: 'Rosie', primaryPos: 'CAM', secondaryPos: 'CM' });
    expect(parsed.players[2]).to.deep.include({ number: '9', name: 'Striker Sam', primaryPos: 'ST' });
  });
});

/* ─── Backward compat: hybrid format still imports ────────── */

describe('parseRosterWithMeta() — hybrid format backward compat', function () {
  it('still parses the old hybrid "NUMBER. Name" format', function () {
    const yaml = [
      'name: USWNT',
      'format: 11v11',
      'players:',
      '  - 7. Ally Sentnor',
      '    primaryPos: ST',
      '  - 11. Rose Lavelle',
      '    nickname: Rosie',
    ].join('\n');
    const { meta, players } = parseRosterWithMeta(yaml);
    expect(meta.name).to.equal('USWNT');
    expect(players).to.have.length(2);
    expect(players[0]).to.deep.include({ number: '7', name: 'Ally Sentnor', primaryPos: 'ST' });
    expect(players[1]).to.deep.include({ number: '11', name: 'Rose Lavelle', nickname: 'Rosie' });
  });
});

/* ─── Example roster file ─────────────────────────────────── */

describe('public/examples/uswnt.yaml', function () {
  let yaml: string;
  let parsed: ReturnType<typeof parseRosterWithMeta>;

  before(async function () {
    const resp = await fetch('/examples/uswnt.yaml');
    expect(resp.ok, 'uswnt.yaml should exist at /examples/uswnt.yaml').to.be.true;
    yaml = await resp.text();
    parsed = parseRosterWithMeta(yaml);
  });

  it('exists as a .yaml file (not .md)', async function () {
    const mdResp = await fetch('/examples/uswnt.md');
    expect(mdResp.ok, 'uswnt.md should no longer exist').to.be.false;
  });

  it('has team metadata', function () {
    expect(parsed.meta.name).to.equal('USWNT');
    expect(parsed.meta.format).to.equal('11v11');
    expect(parsed.meta.halfLength).to.equal(45);
    expect(parsed.meta.formation).to.equal('1-4-3-3');
  });

  it('has 26 players', function () {
    expect(parsed.players).to.have.length(26);
  });

  it('uses normalized key-value format (no hybrid lines)', function () {
    expect(yaml).to.not.match(/- \d+\./);
    for (const p of parsed.players) {
      expect(p.name).to.be.a('string').and.not.empty;
      expect(p.number).to.be.a('string').and.not.empty;
    }
  });

  it('includes players with positions', function () {
    const withPos = parsed.players.filter(p => p.primaryPos);
    expect(withPos.length).to.be.greaterThan(0);
  });

  it('contains known players', function () {
    const names = parsed.players.map(p => p.name);
    expect(names).to.include('Rose Lavelle');
    expect(names).to.include('Trinity Rodman');
    expect(names).to.include('Naomi Girma');
  });

  it('players are sorted alphabetically by name', function () {
    const names = parsed.players.map(p => p.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).to.deep.equal(sorted);
  });
});
