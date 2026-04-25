# PlayingTime

A mobile-first soccer coaching app built with [Lit](https://lit.dev/) Web Components and [Vite](https://vite.dev/). Designed for managing rosters, formations, substitutions, and tracking individual playing time during games. Works offline at the field.

## Features

### Teams & Rosters
- **Multi-team support** — create, switch, and manage multiple teams with isolated data
- **Roster management** — add, edit, reorder (drag-to-sort), and delete players
- **Roster import** — drag & drop, browse, or paste a CSV/markdown roster file
- **Roster export** — download the roster as a CSV file
- **Per-team settings** — game format, half length, formation, and display preferences saved per team

### Field & Formations
- **2/3 vertical field** with FIFA-standard markings and grass stripe pattern
- **USSF game formats** — 11v11, 9v9, 7v7, and 4v4 with format-specific formations
- **Formation presets** — common formations for each format (e.g., 4-3-3, 3-3-2, 2-3-1, 2-2)
- **Draggable players** — adjust positions on the field with touch and mouse support
- **Drag-to-swap** — drag a player onto another to swap positions or substitute with a bench player

### Game Timer
- **Play/Stop clock** counting upward with stoppage time indicator (red text past half length)
- **1H/2H toggle** with per-half time accrual and reset options
- **Reset controls** — reset current half or entire game with confirmation dialogs
- **Configurable half length** — auto-populated by format (45/30/25/12 min), adjustable per team

### Time Tracking & Stats
- **Per-player time** — tracks 1st half, 2nd half, and total playing time
- **On-field time** — displayed above players on the field (toggleable)
- **Bench time** — displayed below substitutes (toggleable)
- **Larger time display** — optional setting to increase time text size
- **Times & Stats dialog** — full stats table with player times and substitution/swap history
- **Times/Stats ready!** — pulsing outline on the Times button after 2nd half ends

### Onboarding
- **How-to-use guide** — 6-step onboarding list on the field (when no players) and under Settings
- **Roster hint** — pulsing outline on the Roster button when team is empty
- **Empty state warnings** — inline prompts to edit roster when no players added

### Design & Accessibility
- **CSS custom properties** — full design token system on `:root` for consistent theming
- **Accessible** — labeled inputs, fieldset groupings, aria-labels, title attributes, focus-visible outlines
- **Minimum touch targets** — 44px+ interactive elements for mobile usability
- **Color contrast** — all text passes WCAG AA (4.5:1 minimum)
- **Landscape lock** — portrait-only overlay on mobile (Safari-compatible)
- **Drop shadows** — subtle toolbar shadows for visual depth

### Offline & PWA
- **Service worker** — precaches all assets for full offline functionality
- **Auto-update** — silently updates when new versions deploy
- **Home screen icons** — iOS and Android installable with custom icons
- **Web app manifest** — standalone display mode with themed chrome
- **localStorage** — all data persists locally, zero server dependencies

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Outputs to `dist/` with service worker and precached assets.

## Tech Stack

- **Lit 3** — lightweight Web Components
- **TypeScript** — type-safe throughout
- **Vite** — fast dev server and bundler
- **vite-plugin-pwa** — service worker and offline support
- **Workbox** — caching strategies for the service worker

## Third-party assets

The cog SVG on the timer bar **Clock options** control is derived from [Cog #6304961 on Noun Project](https://thenounproject.com/icon/cog-6304961/). Use of that asset is subject to [Noun Project’s terms](https://thenounproject.com/legal/#!) for your license tier (for example, attribution may be required on the free tier).

## License

This project is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). You're free to use, modify, and share it — just not for commercial purposes.

---

Designed and coded with my friend, [Claude](https://claude.ai).
