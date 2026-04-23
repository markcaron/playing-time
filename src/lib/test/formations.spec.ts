import { expect } from '@open-wc/testing';
import {
  getFormationPositions,
  getSlotPositions,
  formationHasGK,
  positionFitScore,
  POS_TO_GROUP,
} from '../formations.js';
import { FORMATIONS_BY_FORMAT, GAME_FORMATS, getPlayerCount } from '../types.js';
import type { FormationKey, GameFormat } from '../types.js';

describe('getFormationPositions()', function () {
  for (const { key: format, playerCount } of GAME_FORMATS) {
    for (const { key } of FORMATIONS_BY_FORMAT[format]) {
      it(`returns ${playerCount} positions for ${key} (${format})`, function () {
        const positions = getFormationPositions(key);
        expect(positions).to.be.an('array').with.length(playerCount);
      });

      it(`returns positions with x and y for ${key}`, function () {
        const positions = getFormationPositions(key);
        for (const pos of positions) {
          expect(pos).to.have.property('x').that.is.a('number');
          expect(pos).to.have.property('y').that.is.a('number');
        }
      });
    }
  }
});

describe('getSlotPositions()', function () {
  for (const { key: format, playerCount } of GAME_FORMATS) {
    for (const { key } of FORMATIONS_BY_FORMAT[format]) {
      it(`returns ${playerCount} slot positions for ${key}`, function () {
        const slots = getSlotPositions(key);
        expect(slots).to.be.an('array').with.length(playerCount);
      });
    }
  }

  it('starts with GK for formations that have a goalkeeper', function () {
    const slots = getSlotPositions('1-4-3-3');
    expect(slots[0]).to.equal('GK');
  });

  it('does not start with GK for 4v4 formations', function () {
    const slots = getSlotPositions('2-2');
    expect(slots[0]).to.not.equal('GK');
  });
});

describe('formationHasGK()', function () {
  it('returns true for 11v11 formations', function () {
    expect(formationHasGK('1-4-3-3')).to.be.true;
  });

  it('returns true for 9v9 formations', function () {
    expect(formationHasGK('1-3-3-2')).to.be.true;
  });

  it('returns true for 7v7 formations', function () {
    expect(formationHasGK('1-2-3-1')).to.be.true;
  });

  it('returns false for 4v4 "2-2"', function () {
    expect(formationHasGK('2-2')).to.be.false;
  });

  it('returns false for 4v4 "1-2-1"', function () {
    expect(formationHasGK('1-2-1')).to.be.false;
  });
});

describe('positionFitScore()', function () {
  it('returns 4 for exact match', function () {
    expect(positionFitScore('GK', 'GK')).to.equal(4);
    expect(positionFitScore('ST', 'ST')).to.equal(4);
  });

  it('returns 2 for same positional group', function () {
    expect(positionFitScore('LB', 'CB')).to.equal(2);
    expect(positionFitScore('CM', 'CDM')).to.equal(2);
    expect(positionFitScore('RW', 'ST')).to.equal(2);
  });

  it('returns 0 for different groups', function () {
    expect(positionFitScore('GK', 'ST')).to.equal(0);
    expect(positionFitScore('CB', 'CM')).to.equal(0);
  });

  it('returns 0 for undefined player position', function () {
    expect(positionFitScore(undefined, 'ST')).to.equal(0);
  });
});

describe('POS_TO_GROUP', function () {
  it('maps GK to GK group', function () {
    expect(POS_TO_GROUP.GK).to.equal('GK');
  });

  it('maps defensive positions to DEF', function () {
    expect(POS_TO_GROUP.CB).to.equal('DEF');
    expect(POS_TO_GROUP.LB).to.equal('DEF');
    expect(POS_TO_GROUP.RB).to.equal('DEF');
  });

  it('maps midfield positions to MID', function () {
    expect(POS_TO_GROUP.CDM).to.equal('MID');
    expect(POS_TO_GROUP.CM).to.equal('MID');
    expect(POS_TO_GROUP.CAM).to.equal('MID');
    expect(POS_TO_GROUP.LM).to.equal('MID');
    expect(POS_TO_GROUP.RM).to.equal('MID');
  });

  it('maps forward positions to FWD', function () {
    expect(POS_TO_GROUP.LW).to.equal('FWD');
    expect(POS_TO_GROUP.RW).to.equal('FWD');
    expect(POS_TO_GROUP.CF).to.equal('FWD');
    expect(POS_TO_GROUP.ST).to.equal('FWD');
  });
});
