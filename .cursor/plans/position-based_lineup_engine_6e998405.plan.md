---
name: Position-based lineup engine
overview: Refactor the underlying data model to be position-based rather than roster-order-based. Add player positions (Primary/Secondary), nickname field, and make formations include the GK slot explicitly in code while hiding it in the UI label.
todos:
  - id: data-model
    content: "Update types.ts: Position type, player fields (nickname, primaryPos, secondaryPos), LineupSlot, updated StoredHalfPlan"
    status: pending
  - id: formations
    content: "Update formations.ts: GK-inclusive internal keys, keep UI labels unchanged"
    status: pending
  - id: roster-ui-edit
    content: "Update pt-edit-team-view.ts: new table columns, add-player fields, edit-player dialog"
    status: pending
  - id: roster-ui-view
    content: "Update pt-team-view.ts: new table columns with positions"
    status: pending
  - id: lineup-engine
    content: "Refactor playing-time.ts: buildInitialLineup, repositionFieldPlayers, doSubstitution (no roster mutation), GK color by index"
    status: pending
  - id: snapshot-model
    content: Update snapshot save/restore to use LineupSlot[] instead of StoredPosition[]
    status: pending
  - id: migration
    content: Add localStorage migration in storage.ts for existing data
    status: pending
isProject: false
---

# Position-Based Lineup Engine Refactor

This is a foundational refactor that changes how lineups are represented, stored, and manipulated. The roster becomes alphabetically ordered and immutable during gameplay. Formations explicitly include the GK slot. Lineups are ordered arrays of player IDs mapped to formation slot indices.

## Phase 1: Data Model Changes

### types.ts — Add positions and nickname to player data

- Add `Position` type: `'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'LM' | 'RM' | 'CF' | 'ST'`
- Add to `StoredPlayer`: `nickname?: string`, `primaryPos?: Position`, `secondaryPos?: Position`
- Add to `RosterEntry`: same three fields
- Keep roster sorted alphabetically by name (enforced at save/load)

### types.ts — New lineup snapshot model

- New `LineupSlot`: `{ playerId: string }` (the player ID occupying this formation slot index)
- Update `StoredHalfPlan` to: `{ formation: FormationKey, lineup: LineupSlot[] }` (replaces `fieldPositions: StoredPosition[]`)
- The index in `lineup[]` maps 1:1 to `getFormationPositions(formation)[index]` for x/y coordinates. No more storing x/y per player — positions are derived from formation.

### formations.ts — GK-inclusive formation keys

- Internal keys become `'1-4-3-3'`, `'1-4-2-3-1'`, etc. (except 4v4 which has no GK)
- `FORMATIONS_BY_FORMAT` labels stay as `'4-3-3'` etc. in the UI
- `FormationKey` type updated to the new internal keys
- `formation()` function already puts GK at index 0 — this doesn't change, just the key naming
- **GK detection**: player at lineup index 0 (for GK formations) gets the GK color, replacing the y-coordinate hack

## Phase 2: Roster UI Changes

### pt-edit-team-view.ts — Updated roster table and edit dialog

- **Table columns** (view mode within edit): `#`, `Name`, `Nickname`, `Primary`, `Secondary`, edit button
- **Add Player card**: Add `Nickname`, `Primary Pos.`, `Secondary Pos.` fields (selects for positions)
- **Edit Player dialog**: New dialog (replaces inline editing) with fields: `#`, `Player Name`, `Nickname`, `Primary Pos.`, `Secondary Pos.`, plus Save/Cancel/Delete buttons
- Roster always displayed in alphabetical order by name

### pt-team-view.ts — Updated roster table (view mode)

- Table columns: `#`, `Name`, `Nickname`, `Primary`, `Secondary`

## Phase 3: Lineup Engine

### playing-time.ts — New lineup logic

- **`#buildInitialLineup(roster, formation)`**: Auto-fill algorithm:
  1. For each formation slot, find a roster player whose `primaryPos` matches that slot's positional group (GK, DEF, MID, FWD mapped from formation line)
  2. Fill remaining gaps using `secondaryPos` matches from bench players
  3. Fill any still-empty slots with remaining players by roster order
  4. Returns `LineupSlot[]`

- **`#repositionFieldPlayers()`** (already exists, refined): When formation changes, the lineup slot indices stay the same — player at index 0 stays index 0, player at index 3 stays index 3. Only x/y coordinates change (derived from new formation). Subs never move onto field.

- **`#doSubstitution()`** refactored: Does NOT mutate `this.roster` order. Instead, swaps the `playerId` values between the field lineup slot and the sub. Roster array stays alphabetically sorted.

- **Snapshots**: `#currentHalfSnapshot()` returns `{ formation, lineup: LineupSlot[] }`. `#restoreHalfPlan()` sets formation and rebuilds `fieldPlayers` from the lineup + formation positions.

- **GK color**: Based on `index === 0` in the lineup (for GK-having formations), not y-coordinate.

### Field SVG rendering

- Player x/y derived from: `getFormationPositions(formation)[slotIndex]`
- Player name displayed as nickname if set, otherwise truncated first name (existing behavior)
- Dragging a player still works — but only within the field for position swaps, or field-to-bench for substitution

## Phase 4: Match Flow

- **New match with no previous**: Uses `#buildInitialLineup()` to auto-fill
- **New match with previous**: Copy dialog (already exists) copies both `halfPlan1H` and `halfPlan2H` lineup snapshots
- **1H to 2H planning**: Copies 1H lineup snapshot as starting point for 2H (existing behavior, just new format)
- **Plan to Game**: One-way. Game mode starts with the planned lineup. Changes in game don't affect the plan.
- **Formation change in any mode**: `#repositionFieldPlayers()` — same players, new x/y from formation

## Migration

- Existing `StoredTeam` and `StoredGamePlan` data in localStorage needs migration:
  - Players without positions get `primaryPos: undefined`
  - Old `fieldPositions` / `halfPlan1H.fieldPositions` converted to `lineup: LineupSlot[]` using `playerId`
  - Add migration function in `storage.ts` that runs on `loadAppState()`
