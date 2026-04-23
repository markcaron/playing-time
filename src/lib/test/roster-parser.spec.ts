import { expect } from '@open-wc/testing';
import { parseRoster, parseRosterWithMeta } from '../roster-parser.js';

describe('parseRoster()', function () {
  it('parses numbered markdown lines', function () {
    const input = '1. Alice\n2. Bob\n3. Charlie';
    const result = parseRoster(input);
    expect(result).to.have.length(3);
    expect(result[0]).to.deep.equal({ number: '1', name: 'Alice' });
    expect(result[2]).to.deep.equal({ number: '3', name: 'Charlie' });
  });

  it('parses CSV format', function () {
    const input = '10, Jane Doe\n23, John Smith';
    const result = parseRoster(input);
    expect(result).to.have.length(2);
    expect(result[0]).to.deep.equal({ number: '10', name: 'Jane Doe' });
    expect(result[1]).to.deep.equal({ number: '23', name: 'John Smith' });
  });

  it('treats plain names as numberless entries', function () {
    const result = parseRoster('Alice\nBob');
    expect(result).to.have.length(2);
    expect(result[0]).to.deep.equal({ number: '', name: 'Alice' });
  });

  it('skips blank lines', function () {
    const result = parseRoster('1. Alice\n\n2. Bob');
    expect(result).to.have.length(2);
  });

  it('skips header-like lines', function () {
    const result = parseRoster('Number, Name\n10, Alice');
    expect(result).to.have.length(1);
    expect(result[0].name).to.equal('Alice');
  });
});

describe('parseRosterWithMeta()', function () {
  it('parses YAML frontmatter metadata', function () {
    const input = `---
name: USWNT
format: 11v11
halfLength: 45
---
1. Player One
2. Player Two`;

    const { meta, players } = parseRosterWithMeta(input);
    expect(meta.name).to.equal('USWNT');
    expect(meta.format).to.equal('11v11');
    expect(meta.halfLength).to.equal(45);
    expect(players).to.have.length(2);
  });

  it('parses comment-style metadata', function () {
    const input = `# name: My Team
# format: 7v7
# halfLength: 25
1. Alice
2. Bob`;

    const { meta, players } = parseRosterWithMeta(input);
    expect(meta.name).to.equal('My Team');
    expect(meta.format).to.equal('7v7');
    expect(meta.halfLength).to.equal(25);
    expect(players).to.have.length(2);
  });

  it('returns empty meta when no metadata present', function () {
    const { meta, players } = parseRosterWithMeta('1. Alice\n2. Bob');
    expect(meta).to.deep.equal({});
    expect(players).to.have.length(2);
  });

  it('handles CSV with no number', function () {
    const { players } = parseRosterWithMeta(', Alice\n, Bob');
    expect(players[0]).to.deep.equal({ number: '', name: 'Alice' });
  });
});
