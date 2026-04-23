import { expect } from '@open-wc/testing';
import {
  formatTime,
  getPlayerCount,
  getStandardHalfLength,
  getDefaultFormation,
  GAME_FORMATS,
  FORMATIONS_BY_FORMAT,
  FORMATION_KEY_MIGRATION,
} from '../types.js';
import type { GameFormat, FormationKey } from '../types.js';

describe('formatTime()', function () {
  it('formats mm:ss by default', function () {
    expect(formatTime(125)).to.equal('02:05');
  });

  it('formats zero seconds as 00:00', function () {
    expect(formatTime(0)).to.equal('00:00');
  });

  it('pads single-digit seconds', function () {
    expect(formatTime(61)).to.equal('01:01');
  });

  it('formats mm mode with zero-padded minutes', function () {
    expect(formatTime(125, 'mm')).to.equal('02');
  });

  it('formats m mode without padding', function () {
    expect(formatTime(125, 'm')).to.equal('2');
  });

  it('formats m mode for zero', function () {
    expect(formatTime(0, 'm')).to.equal('0');
  });
});

describe('getPlayerCount()', function () {
  it('returns 11 for 11v11', function () {
    expect(getPlayerCount('11v11')).to.equal(11);
  });

  it('returns 9 for 9v9', function () {
    expect(getPlayerCount('9v9')).to.equal(9);
  });

  it('returns 7 for 7v7', function () {
    expect(getPlayerCount('7v7')).to.equal(7);
  });

  it('returns 4 for 4v4', function () {
    expect(getPlayerCount('4v4')).to.equal(4);
  });
});

describe('getStandardHalfLength()', function () {
  for (const { key, halfLength } of GAME_FORMATS) {
    it(`returns ${halfLength} for ${key}`, function () {
      expect(getStandardHalfLength(key)).to.equal(halfLength);
    });
  }
});

describe('getDefaultFormation()', function () {
  for (const { key } of GAME_FORMATS) {
    it(`returns the first formation for ${key}`, function () {
      const expected = FORMATIONS_BY_FORMAT[key][0].key;
      expect(getDefaultFormation(key)).to.equal(expected);
    });
  }
});

describe('FORMATIONS_BY_FORMAT', function () {
  for (const { key, playerCount } of GAME_FORMATS) {
    it(`has at least one formation for ${key}`, function () {
      expect(FORMATIONS_BY_FORMAT[key]).to.be.an('array').with.length.greaterThan(0);
    });
  }
});

describe('FORMATION_KEY_MIGRATION', function () {
  it('maps old keys to new GK-inclusive keys', function () {
    expect(FORMATION_KEY_MIGRATION['4-3-3']).to.equal('1-4-3-3');
    expect(FORMATION_KEY_MIGRATION['3-5-2']).to.equal('1-3-5-2');
    expect(FORMATION_KEY_MIGRATION['2-3-1']).to.equal('1-2-3-1');
  });

  it('maps all old keys to valid FormationKey values', function () {
    const validKeys = Object.keys(FORMATIONS_BY_FORMAT).flatMap(
      fmt => FORMATIONS_BY_FORMAT[fmt as GameFormat].map(f => f.key),
    );
    for (const newKey of Object.values(FORMATION_KEY_MIGRATION)) {
      expect(validKeys).to.include(newKey);
    }
  });
});
