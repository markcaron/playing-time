---
name: Game in-progress warning
overview: Add a "Game in progress" confirmation dialog when the user taps the back arrow during an active game, with Save/Cancel/Discard options. Also fix game plan selection to resume in game mode instead of always resetting to plan mode.
todos:
  - id: leave-dialog
    content: Add leave-game-dialog template with Save/Cancel/Discard buttons in playing-time.ts
    status: completed
  - id: nav-guard
    content: "Update #onNavigateTeam to show dialog when game is in progress"
    status: completed
  - id: handlers
    content: "Add #leaveGameSave, #leaveGameCancel, #leaveGameDiscard handlers"
    status: completed
  - id: fix-plan-select
    content: "Remove matchPhase='plan' override in #onGamePlanSelected so saved game phase is respected"
    status: completed
isProject: false
---

# Game In-Progress Warning Dialog

## When does it trigger?

Only when the user taps the **back arrow** (`navigate-team` from the toolbar) while `matchPhase === 'game'` AND the game has progress (`half1Started || half2Started`). All other navigation (Settings, Edit Lineup) is unaffected.

## The dialog

A new `<dialog id="leave-game-dialog">` in `playing-time.ts` with three buttons:

- **Save progress** — stops the timer, saves current state, navigates to Team (Matches tab)
- **Cancel** — closes the dialog, user stays in game view, timer keeps running
- **Discard** — resets all clocks/times/events (like `#onResetGame`), saves the reset state, navigates to Team (Matches tab)

## Changes

### 1. `playing-time.ts` — dialog and navigation guard

- Add a `@query('#leave-game-dialog')` accessor
- Add the dialog template (reuse existing confirm-dialog styling)
- Replace `#onNavigateTeam`:
  - If `matchPhase === 'game'` and `(half1Started || half2Started)` → show dialog
  - Otherwise → navigate directly as before
- Add three handlers:
  - `#leaveGameSave()` — `timerBar.stopTimer()`, `#saveState()`, navigate to team
  - `#leaveGameCancel()` — close dialog (no-op)
  - `#leaveGameDiscard()` — reset times/events/halves (same logic as `#onResetGame`), restore 1H plan lineup, `#saveState()`, navigate to team

### 2. `playing-time.ts` — fix game plan selection to respect saved phase

Currently `#onGamePlanSelected` (line 528) unconditionally sets `matchPhase = 'plan'`, overriding whatever phase was stored. Change it to:

```typescript
this.matchPhase = plan.phase ?? 'plan';
```

This way, clicking a match tile that was previously saved in `'game'` phase goes directly to game mode. A match still in `'plan'` phase opens in plan mode as before. The phase is already correctly persisted by `#saveState` and stored in `StoredGamePlan.phase`.

To get the phase, read it from the team's game plan data before navigating:

```typescript
#onGamePlanSelected(e: GamePlanSelectedEvent) {
  this.activeGamePlanId = e.planId;
  localStorage.setItem('pt-active-plan-id', e.planId);
  this.#loadGamePlan(e.planId);
  // matchPhase is now set by #loadGamePlan from plan.phase
  this.#navigateTo('game', 'slide-to-left', 'slide-from-right');
}
```

### 3. Files touched

- [src/components/playing-time.ts](src/components/playing-time.ts) — dialog markup, query, guard logic, three handlers, fix `#onGamePlanSelected`
