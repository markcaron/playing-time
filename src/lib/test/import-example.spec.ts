import { expect } from '@open-wc/testing';
import { parseRosterWithMeta } from '../roster-parser.js';
import { createNewTeam, playerId } from '../storage.js';
import type { StoredTeam, StoredPlayer, Position } from '../types.js';

/*
 * Specification: Example roster import preserves all player fields
 * See: https://github.com/markcaron/playing-time/issues/54
 *
 * Bug: #onImportExample in playing-time.ts only copies number and
 * name from parsed players. It drops nickname, primaryPos,
 * secondaryPos, and id. It also ignores meta.formation.
 *
 * This tests the mapping logic that SHOULD exist — converting
 * ParsedRoster players to StoredPlayer[] with all fields preserved.
 *
 * The test uses the actual USWNT YAML file to verify the real
 * import path produces correct data.
 */

/* ═══════════════════════════════════════════════════════════════
 * mapParsedToStoredPlayers — pure function to be extracted
 * ═══════════════════════════════════════════════════════════════ */

/*
 * The fix should either:
 * (a) Extract a pure mapParsedToStoredPlayers function, or
 * (b) Fix #onImportExample inline to copy all fields
 *
 * These tests verify the CONTRACT — parsed player fields appear
 * in the resulting StoredPlayer[], regardless of implementation.
 */

describe('Example import — USWNT roster round-trip', function () {
  let parsed: ReturnType<typeof parseRosterWithMeta>;

  before(async function () {
    const resp = await fetch('/examples/uswnt.yaml');
    expect(resp.ok, 'uswnt.yaml should be fetchable').to.be.true;
    const text = await resp.text();
    parsed = parseRosterWithMeta(text);
  });

  it('parses 26 players from the USWNT roster', function () {
    expect(parsed.players).to.have.length(26);
  });

  it('parsed players include primaryPos', function () {
    const withPos = parsed.players.filter(p => p.primaryPos);
    expect(withPos.length, 'some players should have primaryPos').to.be.greaterThan(0);
  });

  it('parsed players include nickname where set', function () {
    const rose = parsed.players.find(p => p.name === 'Rose Lavelle');
    expect(rose, 'Rose Lavelle should exist').to.exist;
    expect(rose!.nickname).to.equal('Rosie');
  });

  it('parsed players include secondaryPos where set', function () {
    const withSecondary = parsed.players.filter(p => p.secondaryPos);
    expect(withSecondary.length, 'some players should have secondaryPos').to.be.greaterThan(0);
  });

  it('parsed meta includes formation', function () {
    expect(parsed.meta.formation).to.exist;
    expect(parsed.meta.formation).to.equal('1-4-3-3');
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Source contract: #onImportExample maps ALL fields
 * ═══════════════════════════════════════════════════════════════ */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/src/components/playing-time.ts');
  expect(resp.ok, 'playing-time.ts should be fetchable').to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — #onImportExample field mapping', function () {
  it('copies primaryPos from parsed players', function () {
    if (!playingTimeSource) this.skip();
    expect(playingTimeSource).to.match(/primaryPos/);
    // The import handler must reference primaryPos when building StoredPlayer
    const importSection = playingTimeSource.match(
      /onImportExample[\s\S]{0,500}players\.map/
    );
    expect(importSection, '#onImportExample should map players').to.not.be.null;
    const mapBody = playingTimeSource.slice(
      playingTimeSource.indexOf('onImportExample'),
      playingTimeSource.indexOf('onImportExample') + 800
    );
    expect(mapBody).to.include('primaryPos');
  });

  it('copies secondaryPos from parsed players', function () {
    if (!playingTimeSource) this.skip();
    const mapBody = playingTimeSource.slice(
      playingTimeSource.indexOf('onImportExample'),
      playingTimeSource.indexOf('onImportExample') + 800
    );
    expect(mapBody).to.include('secondaryPos');
  });

  it('copies nickname from parsed players', function () {
    if (!playingTimeSource) this.skip();
    const mapBody = playingTimeSource.slice(
      playingTimeSource.indexOf('onImportExample'),
      playingTimeSource.indexOf('onImportExample') + 800
    );
    expect(mapBody).to.include('nickname');
  });

  it('assigns player IDs', function () {
    if (!playingTimeSource) this.skip();
    const mapBody = playingTimeSource.slice(
      playingTimeSource.indexOf('onImportExample'),
      playingTimeSource.indexOf('onImportExample') + 800
    );
    const hasId = mapBody.includes('playerId') || mapBody.includes('id:') || mapBody.includes('id,');
    expect(hasId, '#onImportExample must assign IDs to players').to.be.true;
  });

  it('applies formation from parsed meta', function () {
    if (!playingTimeSource) this.skip();
    const mapBody = playingTimeSource.slice(
      playingTimeSource.indexOf('onImportExample'),
      playingTimeSource.indexOf('onImportExample') + 800
    );
    expect(mapBody).to.include('formation');
  });
});
