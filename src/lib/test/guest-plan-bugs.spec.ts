import { expect } from '@open-wc/testing';

/*
 * Specification: Guest roster isolation + plan mode event tracking
 *
 * Bug 1: Guest players leak into StoredTeam.players. The #saveState
 *         method maps ALL roster entries without filtering isGuest.
 *         Guests should only exist in the match's roster, not the
 *         persisted team roster.
 *
 * Bug 2: Swaps/subs during Plan mode are tracked as gameEvents
 *         BEFORE the clock starts. Events should only be recorded
 *         when matchPhase === 'game' (after "Start Match").
 */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok).to.be.true;
  playingTimeSource = await resp.text();
});

/* ═══════════════════════════════════════════════════════════════
 * Bug 1: #saveState must filter guest players from team roster
 * ═══════════════════════════════════════════════════════════════ */

describe('playing-time.ts — guest players excluded from saved team roster', function () {
  it('#saveState filters isGuest players from StoredTeam.players', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('#saveState');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 500);
    const hasGuestFilter = section.match(/isGuest|filter.*guest|!.*isGuest/i);
    expect(hasGuestFilter, '#saveState must filter guest players from the players array before saving').to.not.be.null;
  });

  it('players mapping in #saveState excludes guests', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('#saveState');
    const section = playingTimeSource.slice(idx, idx + 300);
    const playersLine = section.match(/players\s*:.*roster.*(?:filter|\.filter)/);
    expect(playersLine, 'players: should use roster.filter (not roster.map) to exclude guests').to.not.be.null;
  });
});

/* ═══════════════════════════════════════════════════════════════
 * Bug 2: Swaps/subs during plan mode should NOT create events
 * ═══════════════════════════════════════════════════════════════ */

describe('playing-time.ts — game events only tracked during game phase', function () {
  it('swap handler checks matchPhase before adding to gameEvents', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('swapFieldPositions');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 800);
    const hasPhaseCheck = section.match(/matchPhase.*game|matchPhase.*===.*['"]game['"]/);
    expect(hasPhaseCheck, 'swap must check matchPhase === "game" before adding gameEvents').to.not.be.null;
  });

  it('substitution handler checks matchPhase before adding to gameEvents', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('doSubstitution');
    expect(idx).to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 800);
    const hasPhaseCheck = section.match(/matchPhase.*game|matchPhase.*===.*['"]game['"]/);
    expect(hasPhaseCheck, 'substitution must check matchPhase === "game" before adding gameEvents').to.not.be.null;
  });

  it('gameEvents array is not modified during plan phase', function () {
    if (!playingTimeSource) this.skip();
    const swapIdx = playingTimeSource.indexOf('swapFieldPositions');
    const swapSection = playingTimeSource.slice(swapIdx, swapIdx + 800);
    const subIdx = playingTimeSource.indexOf('doSubstitution');
    const subSection = playingTimeSource.slice(subIdx, subIdx + 800);

    const swapEventLine = swapSection.match(/gameEvents\s*=\s*\[/);
    const subEventLine = subSection.match(/gameEvents\s*=\s*\[/);

    if (swapEventLine) {
      expect(swapSection.indexOf('matchPhase'), 'swap: matchPhase check must appear before gameEvents assignment').to.be.lessThan(swapSection.indexOf('gameEvents'));
    }
    if (subEventLine) {
      expect(subSection.indexOf('matchPhase'), 'sub: matchPhase check must appear before gameEvents assignment').to.be.lessThan(subSection.indexOf('gameEvents'));
    }
  });
});
