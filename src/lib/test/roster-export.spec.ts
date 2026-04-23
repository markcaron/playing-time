import { expect } from '@open-wc/testing';
import { parseRosterWithMeta, serializeRosterYaml } from '../roster-parser.js';
import type { RosterMeta } from '../roster-parser.js';

/* RosterMeta will need a `formation?: string` field added by the implementer */

/*
 * Specification for issue #1 — YAML export and round-trip:
 * https://github.com/markcaron/playing-time/issues/1
 *
 * serializeRosterYaml(meta, players) returns a YAML string that
 * encodes team metadata and the full player list including nickname,
 * primaryPos, and secondaryPos.  The output must round-trip cleanly
 * through parseRosterWithMeta().
 */

/* ─── YAML export ─────────────────────────────────────────── */

describe('serializeRosterYaml()', function () {
  const meta: RosterMeta = {
    name: 'USWNT',
    format: '11v11',
    halfLength: 45,
  };

  const players = [
    { number: '10', name: 'Rose Lavelle', nickname: 'Rosie', primaryPos: 'CM', secondaryPos: 'CAM' },
    { number: '7', name: 'Ally Sentnor', primaryPos: 'LW' },
    { number: '1', name: 'Jane Campbell' },
  ];

  it('is a function exported from roster-parser', function () {
    expect(serializeRosterYaml).to.be.a('function');
  });

  it('returns a string', function () {
    const result = serializeRosterYaml(meta, players);
    expect(result).to.be.a('string');
  });

  it('includes team name in output', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('name: USWNT');
  });

  it('includes format in output', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('format: 11v11');
  });

  it('includes halfLength in output', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('halfLength: 45');
  });

  it('includes players key in output', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('players:');
  });

  it('includes player names in output', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('Rose Lavelle');
    expect(yaml).to.include('Ally Sentnor');
    expect(yaml).to.include('Jane Campbell');
  });

  it('includes nickname when present', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('nickname: Rosie');
  });

  it('includes primaryPos when present', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('primaryPos: CM');
    expect(yaml).to.include('primaryPos: LW');
  });

  it('includes secondaryPos when present', function () {
    const yaml = serializeRosterYaml(meta, players);
    expect(yaml).to.include('secondaryPos: CAM');
  });

  it('omits nickname key for players without one', function () {
    const yaml = serializeRosterYaml(meta, [
      { number: '7', name: 'Ally Sentnor', primaryPos: 'LW' },
    ]);
    expect(yaml).to.not.include('nickname');
  });

  it('omits position keys for players without positions', function () {
    const yaml = serializeRosterYaml(meta, [
      { number: '1', name: 'Jane Campbell' },
    ]);
    expect(yaml).to.not.include('primaryPos');
    expect(yaml).to.not.include('secondaryPos');
  });

  it('omits absent meta fields', function () {
    const yaml = serializeRosterYaml({}, [
      { number: '1', name: 'Jane Campbell' },
    ]);
    const topLevelLines = yaml.split('\n').filter(l => l.length > 0 && !l.startsWith(' '));
    expect(topLevelLines.some(l => l.startsWith('name:'))).to.be.false;
    expect(topLevelLines.some(l => l.startsWith('format:'))).to.be.false;
    expect(topLevelLines.some(l => l.startsWith('halfLength:'))).to.be.false;
  });

  it('handles an empty player list', function () {
    const yaml = serializeRosterYaml(meta, []);
    expect(yaml).to.include('players:');
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players).to.have.length(0);
  });

  it('safely quotes player names containing colons', function () {
    const yaml = serializeRosterYaml({}, [
      { number: '8', name: "O'Brien: Captain" },
    ]);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0].name).to.equal("O'Brien: Captain");
  });

  it('safely quotes nicknames containing special YAML characters', function () {
    const yaml = serializeRosterYaml({}, [
      { number: '8', name: 'Test Player', nickname: 'The "Boss"' },
    ]);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0]).to.have.property('nickname', 'The "Boss"');
  });

  it('safely quotes team name containing colons', function () {
    const yaml = serializeRosterYaml({ name: 'FC: United' }, [
      { number: '1', name: 'Alice' },
    ]);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.meta.name).to.equal('FC: United');
  });

  it('includes formation when present in meta', function () {
    const yaml = serializeRosterYaml(
      { name: 'Test', format: '7v7', formation: '1-2-3-1' },
      [{ number: '1', name: 'Alice' }],
    );
    expect(yaml).to.include('formation: 1-2-3-1');
  });

  it('omits formation when absent from meta', function () {
    const yaml = serializeRosterYaml(
      { name: 'Test', format: '7v7' },
      [{ number: '1', name: 'Alice' }],
    );
    expect(yaml).to.not.include('formation');
  });
});

/* ─── YAML round-trip ─────────────────────────────────────── */

describe('YAML round-trip (export → import)', function () {
  it('preserves team metadata', function () {
    const meta: RosterMeta = { name: 'Test FC', format: '7v7', halfLength: 25 };
    const yaml = serializeRosterYaml(meta, []);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.meta.name).to.equal('Test FC');
    expect(parsed.meta.format).to.equal('7v7');
    expect(parsed.meta.halfLength).to.equal(25);
  });

  it('preserves number and name', function () {
    const meta: RosterMeta = { name: 'Test FC' };
    const players = [
      { number: '10', name: 'Rose Lavelle' },
      { number: '7', name: 'Ally Sentnor' },
    ];
    const yaml = serializeRosterYaml(meta, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players).to.have.length(2);
    expect(parsed.players[0]).to.deep.include({ number: '10', name: 'Rose Lavelle' });
    expect(parsed.players[1]).to.deep.include({ number: '7', name: 'Ally Sentnor' });
  });

  it('preserves nickname', function () {
    const players = [
      { number: '10', name: 'Rose Lavelle', nickname: 'Rosie' },
    ];
    const yaml = serializeRosterYaml({}, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0]).to.have.property('nickname', 'Rosie');
  });

  it('preserves primaryPos', function () {
    const players = [
      { number: '10', name: 'Rose Lavelle', primaryPos: 'CM' },
    ];
    const yaml = serializeRosterYaml({}, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0]).to.have.property('primaryPos', 'CM');
  });

  it('preserves secondaryPos', function () {
    const players = [
      { number: '10', name: 'Rose Lavelle', secondaryPos: 'CAM' },
    ];
    const yaml = serializeRosterYaml({}, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0]).to.have.property('secondaryPos', 'CAM');
  });

  it('preserves all fields on a full player', function () {
    const players = [
      { number: '10', name: 'Rose Lavelle', nickname: 'Rosie', primaryPos: 'CM', secondaryPos: 'CAM' },
    ];
    const yaml = serializeRosterYaml({}, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0]).to.deep.include({
      number: '10',
      name: 'Rose Lavelle',
      nickname: 'Rosie',
      primaryPos: 'CM',
      secondaryPos: 'CAM',
    });
  });

  it('preserves absent optional fields as absent (not empty strings)', function () {
    const players = [
      { number: '7', name: 'Ally Sentnor', primaryPos: 'LW' },
    ];
    const yaml = serializeRosterYaml({}, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0]).to.not.have.property('nickname');
    expect(parsed.players[0]).to.not.have.property('secondaryPos');
    expect(parsed.players[0]).to.have.property('primaryPos', 'LW');
  });

  it('preserves formation in metadata', function () {
    const meta: RosterMeta = { name: 'Test', format: '7v7', formation: '1-2-3-1' };
    const yaml = serializeRosterYaml(meta, [{ number: '1', name: 'Alice' }]);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.meta).to.have.property('formation', '1-2-3-1');
  });

  it('round-trips a large mixed roster', function () {
    const meta: RosterMeta = { name: 'USWNT', format: '11v11', halfLength: 45 };
    const players = [
      { number: '1', name: 'Jane Campbell', primaryPos: 'GK' },
      { number: '5', name: 'Emily Fox', nickname: 'Foxy', primaryPos: 'LB', secondaryPos: 'RB' },
      { number: '10', name: 'Sam Coffey', primaryPos: 'CDM' },
      { number: '11', name: 'Rose Lavelle', nickname: 'Rosie', primaryPos: 'CM', secondaryPos: 'CAM' },
      { number: '2', name: 'Trinity Rodman', primaryPos: 'RW', secondaryPos: 'ST' },
      { number: '99', name: 'New Player' },
    ];

    const yaml = serializeRosterYaml(meta, players);
    const parsed = parseRosterWithMeta(yaml);

    expect(parsed.meta.name).to.equal('USWNT');
    expect(parsed.meta.format).to.equal('11v11');
    expect(parsed.meta.halfLength).to.equal(45);
    expect(parsed.players).to.have.length(6);

    for (let i = 0; i < players.length; i++) {
      expect(parsed.players[i]).to.deep.include(players[i]);
    }
  });
});
