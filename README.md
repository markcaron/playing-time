# PlayingTime

A mobile-first soccer coaching app built with [Lit](https://lit.dev/) Web Components and [Vite](https://vite.dev/). Designed for managing rosters, formations, substitutions, and tracking individual playing time during games.

## Features

- **Vertical half-field** with FIFA-standard markings and grass stripe pattern
- **Multi-team support** — create, switch, and manage multiple teams with isolated data
- **Roster management** — add, edit, reorder, and delete players; View and Edit modes
- **USSF game formats** — 11v11, 9v9, 7v7, and 4v4 with format-specific formations
- **Formation presets** — common formations for each format (e.g. 4-3-3, 3-3-2, 2-3-1, 2-2)
- **Draggable players** — adjust positions on the field with touch and mouse support
- **Player selection & substitutions** — select a player, tap the swap button, then tap a field player or sub to swap
- **Game timer** — Play/Stop clock counting upward with stoppage time indicator
- **Half tracking** — 1H/2H toggle with per-half time accrual and reset
- **Playing time tracking** — per-player time accrual for each half, shown in the roster table
- **Settings** — configurable half length with per-team persistence
- **localStorage** — all team data, rosters, positions, times, and settings persist across sessions
- **Accessible** — aria-labels, keyboard navigation, disclosure patterns, focus management
- **Responsive** — SVG scales to fit any container; mobile-first design

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Tech Stack

- **Lit 3** — lightweight Web Components
- **TypeScript** — type-safe throughout
- **Vite** — fast dev server and bundler

## License

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). You're free to use, modify, and share it — just not for commercial purposes.

---

Designed and coded with my friend, [Claude](https://claude.ai).
