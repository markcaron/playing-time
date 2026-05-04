import { expect } from '@open-wc/testing';

/*
 * Specification: Deleting a guest player removes them from the field
 * See: https://github.com/markcaron/playing-time/issues/78
 *
 * When a guest player is on the field and deleted via the attendance
 * dialog, they must be removed from both roster AND fieldPlayers.
 * The code handles this but it's untested.
 */

let playingTimeSource: string;

before(async function () {
  const resp = await fetch('/__raw/src/components/playing-time.ts');
  expect(resp.ok).to.be.true;
  playingTimeSource = await resp.text();
});

describe('playing-time.ts — delete guest removes from field', function () {
  it('confirmDeleteGuest filters fieldPlayers', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('confirmDeleteGuest');
    expect(idx, 'confirmDeleteGuest method should exist').to.be.greaterThan(-1);
    const section = playingTimeSource.slice(idx, idx + 300);
    expect(section).to.include('fieldPlayers');
    expect(section).to.match(/fieldPlayers.*filter|fieldPlayers\s*=\s*this\.fieldPlayers\.filter/);
  });

  it('confirmDeleteGuest filters roster', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('confirmDeleteGuest');
    const section = playingTimeSource.slice(idx, idx + 300);
    expect(section).to.include('roster');
    expect(section).to.match(/roster.*filter|roster\s*=\s*this\.roster\.filter/);
  });

  it('confirmDeleteGuest rebuilds sub players after removal', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('confirmDeleteGuest');
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.include('rebuildSubPlayers');
  });

  it('confirmDeleteGuest saves state after removal', function () {
    if (!playingTimeSource) this.skip();
    const idx = playingTimeSource.indexOf('confirmDeleteGuest');
    const section = playingTimeSource.slice(idx, idx + 500);
    expect(section).to.include('saveState');
  });
});
