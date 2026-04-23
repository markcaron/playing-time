import { expect } from '@open-wc/testing';
import { parseRosterWithMeta } from '../roster-parser.js';

/*
 * Specification for issue #1:
 * https://github.com/markcaron/playing-time/issues/1
 *
 * parseRosterWithMeta must auto-detect YAML and CSV (with headers) in
 * addition to the existing markdown format.  All three formats must
 * return nickname, primaryPos, and secondaryPos when present.
 */

/* ─── YAML import ─────────────────────────────────────────── */

describe('parseRosterWithMeta() — YAML import', function () {
  const YAML_FULL = [
    'name: USWNT',
    'format: 11v11',
    'halfLength: 45',
    'players:',
    '  - number: "10"',
    '    name: Rose Lavelle',
    '    nickname: Rosie',
    '    primaryPos: CM',
    '    secondaryPos: CAM',
    '  - number: "7"',
    '    name: Ally Sentnor',
    '    primaryPos: LW',
  ].join('\n');

  it('detects YAML format via top-level players: key', function () {
    const { players } = parseRosterWithMeta(YAML_FULL);
    expect(players).to.have.length(2);
  });

  it('parses team metadata from YAML', function () {
    const { meta } = parseRosterWithMeta(YAML_FULL);
    expect(meta.name).to.equal('USWNT');
    expect(meta.format).to.equal('11v11');
    expect(meta.halfLength).to.equal(45);
  });

  it('parses number and name from YAML', function () {
    const { players } = parseRosterWithMeta(YAML_FULL);
    expect(players[0].number).to.equal('10');
    expect(players[0].name).to.equal('Rose Lavelle');
    expect(players[1].number).to.equal('7');
    expect(players[1].name).to.equal('Ally Sentnor');
  });

  it('parses nickname from YAML', function () {
    const { players } = parseRosterWithMeta(YAML_FULL);
    expect(players[0]).to.have.property('nickname', 'Rosie');
  });

  it('parses primaryPos from YAML', function () {
    const { players } = parseRosterWithMeta(YAML_FULL);
    expect(players[0]).to.have.property('primaryPos', 'CM');
    expect(players[1]).to.have.property('primaryPos', 'LW');
  });

  it('parses secondaryPos from YAML', function () {
    const { players } = parseRosterWithMeta(YAML_FULL);
    expect(players[0]).to.have.property('secondaryPos', 'CAM');
  });

  it('omits absent optional fields rather than empty strings', function () {
    const { players } = parseRosterWithMeta(YAML_FULL);
    expect(players[1]).to.not.have.property('nickname');
    expect(players[1]).to.not.have.property('secondaryPos');
  });

  it('handles number as unquoted integer in YAML', function () {
    const yaml = [
      'players:',
      '  - number: 10',
      '    name: Rose Lavelle',
    ].join('\n');
    const { players } = parseRosterWithMeta(yaml);
    expect(players[0].number).to.equal('10');
  });

  it('handles a player with only number and name', function () {
    const yaml = [
      'players:',
      '  - number: "1"',
      '    name: Jane Campbell',
    ].join('\n');
    const { players } = parseRosterWithMeta(yaml);
    expect(players).to.have.length(1);
    expect(players[0].number).to.equal('1');
    expect(players[0].name).to.equal('Jane Campbell');
    expect(players[0]).to.not.have.property('nickname');
    expect(players[0]).to.not.have.property('primaryPos');
    expect(players[0]).to.not.have.property('secondaryPos');
  });

  it('handles empty players list', function () {
    const yaml = [
      'name: Empty Team',
      'format: 7v7',
      'players:',
    ].join('\n');
    const { meta, players } = parseRosterWithMeta(yaml);
    expect(meta.name).to.equal('Empty Team');
    expect(players).to.have.length(0);
  });

  it('parses formation from YAML metadata', function () {
    const yaml = [
      'name: Test FC',
      'format: 7v7',
      'formation: 1-2-3-1',
      'halfLength: 25',
      'players:',
      '  - number: "1"',
      '    name: Alice',
    ].join('\n');
    const { meta } = parseRosterWithMeta(yaml);
    expect(meta).to.have.property('formation', '1-2-3-1');
  });

  it('parses a full roster of varied players', function () {
    const yaml = [
      'name: Test FC',
      'format: 7v7',
      'halfLength: 25',
      'players:',
      '  - number: "1"',
      '    name: Keeper Kim',
      '    primaryPos: GK',
      '  - number: "4"',
      '    name: Defender Dee',
      '    nickname: DD',
      '    primaryPos: CB',
      '    secondaryPos: LB',
      '  - number: "10"',
      '    name: Midfielder Mo',
      '    primaryPos: CM',
      '  - number: "9"',
      '    name: Striker Sam',
      '    nickname: Sammy',
      '    primaryPos: ST',
      '    secondaryPos: CF',
    ].join('\n');

    const { meta, players } = parseRosterWithMeta(yaml);
    expect(meta.name).to.equal('Test FC');
    expect(meta.format).to.equal('7v7');
    expect(meta.halfLength).to.equal(25);
    expect(players).to.have.length(4);

    expect(players[0]).to.deep.include({ number: '1', name: 'Keeper Kim', primaryPos: 'GK' });
    expect(players[1]).to.deep.include({ number: '4', name: 'Defender Dee', nickname: 'DD', primaryPos: 'CB', secondaryPos: 'LB' });
    expect(players[2]).to.deep.include({ number: '10', name: 'Midfielder Mo', primaryPos: 'CM' });
    expect(players[3]).to.deep.include({ number: '9', name: 'Striker Sam', nickname: 'Sammy', primaryPos: 'ST', secondaryPos: 'CF' });
  });
});

/* ─── YAML detection boundary ─────────────────────────────── */

describe('parseRosterWithMeta() — YAML detection boundary', function () {
  it('does NOT treat markdown with "players:" in frontmatter as YAML', function () {
    const md = [
      '---',
      'name: My Team',
      'format: 7v7',
      '---',
      '1. Alice',
      '2. Bob',
    ].join('\n');
    const { players } = parseRosterWithMeta(md);
    expect(players).to.have.length(2);
    expect(players[0]).to.deep.include({ number: '1', name: 'Alice' });
  });

  it('does NOT treat a plain-text roster that happens to contain "players:" as YAML', function () {
    const text = 'players: none yet\nAlice\nBob';
    const { players } = parseRosterWithMeta(text);
    expect(players).to.have.length(2);
  });
});

/* ─── CSV import (with header row) ────────────────────────── */

describe('parseRosterWithMeta() — CSV import', function () {
  it('parses CSV with a header row containing all columns', function () {
    const csv = [
      'number,name,nickname,primaryPos,secondaryPos',
      '10,Rose Lavelle,Rosie,CM,CAM',
      '7,Ally Sentnor,,LW,',
    ].join('\n');

    const { players } = parseRosterWithMeta(csv);
    expect(players).to.have.length(2);
  });

  it('extracts nickname from CSV', function () {
    const csv = [
      'number,name,nickname,primaryPos,secondaryPos',
      '10,Rose Lavelle,Rosie,CM,CAM',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players[0]).to.have.property('nickname', 'Rosie');
  });

  it('extracts positions from CSV', function () {
    const csv = [
      'number,name,nickname,primaryPos,secondaryPos',
      '10,Rose Lavelle,Rosie,CM,CAM',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players[0]).to.have.property('primaryPos', 'CM');
    expect(players[0]).to.have.property('secondaryPos', 'CAM');
  });

  it('omits empty CSV fields as undefined', function () {
    const csv = [
      'number,name,nickname,primaryPos,secondaryPos',
      '7,Ally Sentnor,,LW,',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players[0]).to.not.have.property('nickname');
    expect(players[0]).to.not.have.property('secondaryPos');
  });

  it('handles CSV with only number and name columns', function () {
    const csv = [
      'number,name',
      '10,Rose Lavelle',
      '7,Ally Sentnor',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players).to.have.length(2);
    expect(players[0]).to.deep.include({ number: '10', name: 'Rose Lavelle' });
  });

  it('handles CSV columns in different order', function () {
    const csv = [
      'name,number,primaryPos,nickname,secondaryPos',
      'Rose Lavelle,10,CM,Rosie,CAM',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players[0]).to.deep.include({
      number: '10',
      name: 'Rose Lavelle',
      nickname: 'Rosie',
      primaryPos: 'CM',
      secondaryPos: 'CAM',
    });
  });

  it('skips blank CSV rows', function () {
    const csv = [
      'number,name,nickname,primaryPos,secondaryPos',
      '10,Rose Lavelle,Rosie,CM,CAM',
      '',
      '7,Ally Sentnor,,LW,',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players).to.have.length(2);
  });

  it('trims whitespace around CSV values', function () {
    const csv = [
      'number , name , nickname , primaryPos , secondaryPos',
      ' 10 , Rose Lavelle , Rosie , CM , CAM ',
    ].join('\n');
    const { players } = parseRosterWithMeta(csv);
    expect(players[0]).to.deep.include({
      number: '10',
      name: 'Rose Lavelle',
      nickname: 'Rosie',
      primaryPos: 'CM',
      secondaryPos: 'CAM',
    });
  });
});

/* ─── Backward compatibility ──────────────────────────────── */

describe('parseRosterWithMeta() — backward compatibility', function () {
  it('existing markdown numbered list still works', function () {
    const md = '1. Alice\n2. Bob';
    const { players } = parseRosterWithMeta(md);
    expect(players).to.have.length(2);
    expect(players[0]).to.deep.include({ number: '1', name: 'Alice' });
  });

  it('existing markdown with frontmatter still works', function () {
    const md = [
      '---',
      'name: USWNT',
      'format: 11v11',
      'halfLength: 45',
      '---',
      '1. Player One',
      '2. Player Two',
    ].join('\n');
    const { meta, players } = parseRosterWithMeta(md);
    expect(meta.name).to.equal('USWNT');
    expect(players).to.have.length(2);
  });

  it('existing simple CSV (no header) still works', function () {
    const csv = '10, Alice\n23, Bob';
    const { players } = parseRosterWithMeta(csv);
    expect(players).to.have.length(2);
    expect(players[0]).to.deep.include({ number: '10', name: 'Alice' });
  });
});
