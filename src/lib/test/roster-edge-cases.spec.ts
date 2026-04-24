import { expect } from '@open-wc/testing';
import { parseRosterWithMeta, serializeRosterYaml } from '../roster-parser.js';
import { POSITIONS } from '../types.js';

/*
 * Edge-case tests from issue #7:
 * https://github.com/markcaron/playing-time/issues/7
 *
 * 1. yamlQuote must handle newlines in values
 * 2. Position strings from import should be validated against POSITIONS
 */

/* ─── Newline handling in YAML values ─────────────────────── */

describe('serializeRosterYaml() — newline handling', function () {
  it('round-trips a player name containing a newline', function () {
    const players = [{ number: '8', name: 'Line\nBreak' }];
    const yaml = serializeRosterYaml({}, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0].name).to.equal('Line\nBreak');
  });

  it('round-trips a nickname containing a newline', function () {
    const players = [{ number: '8', name: 'Test', nickname: 'Nick\nName' }];
    const yaml = serializeRosterYaml({}, players);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.players[0]).to.have.property('nickname', 'Nick\nName');
  });

  it('round-trips a team name containing a newline', function () {
    const meta = { name: 'FC\nUnited' };
    const yaml = serializeRosterYaml(meta, [{ number: '1', name: 'Alice' }]);
    const parsed = parseRosterWithMeta(yaml);
    expect(parsed.meta.name).to.equal('FC\nUnited');
  });
});

/* ─── Position validation on import ───────────────────────── */

describe('parseRosterWithMeta() — position validation', function () {
  const validPositions = new Set(POSITIONS);

  it('returns valid Position values for known positions in YAML', function () {
    const yaml = [
      'players:',
      '  - number: "10"',
      '    name: Rose Lavelle',
      '    primaryPos: CM',
      '    secondaryPos: CAM',
    ].join('\n');
    const { players } = parseRosterWithMeta(yaml);
    expect(validPositions.has(players[0].primaryPos as any)).to.be.true;
    expect(validPositions.has(players[0].secondaryPos as any)).to.be.true;
  });

  it('discards invalid primaryPos values in YAML', function () {
    const yaml = [
      'players:',
      '  - number: "10"',
      '    name: Rose Lavelle',
      '    primaryPos: GOALIE',
    ].join('\n');
    const { players } = parseRosterWithMeta(yaml);
    expect(players[0]).to.not.have.property('primaryPos');
  });

  it('discards invalid secondaryPos values in YAML', function () {
    const yaml = [
      'players:',
      '  - number: "10"',
      '    name: Rose Lavelle',
      '    secondaryPos: STRIKER',
    ].join('\n');
    const { players } = parseRosterWithMeta(yaml);
    expect(players[0]).to.not.have.property('secondaryPos');
  });

  it('discards invalid positions in CSV import', function () {
    const csv = [
      'number,name,primaryPos,secondaryPos',
      '10,Rose Lavelle,GOALIE,STRIKER',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players[0]).to.not.have.property('primaryPos');
    expect(players[0]).to.not.have.property('secondaryPos');
  });

  it('keeps valid positions and discards invalid in same player', function () {
    const yaml = [
      'players:',
      '  - number: "10"',
      '    name: Rose Lavelle',
      '    primaryPos: CM',
      '    secondaryPos: INVALID',
    ].join('\n');
    const { players } = parseRosterWithMeta(yaml);
    expect(players[0]).to.have.property('primaryPos', 'CM');
    expect(players[0]).to.not.have.property('secondaryPos');
  });

  it('treats position matching as case-sensitive', function () {
    const yaml = [
      'players:',
      '  - number: "10"',
      '    name: Rose Lavelle',
      '    primaryPos: cm',
    ].join('\n');
    const { players } = parseRosterWithMeta(yaml);
    expect(players[0]).to.not.have.property('primaryPos');
  });
});
