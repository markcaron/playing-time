import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';

import './pt-toolbar.js';
import './pt-timer-bar.js';
import { renderField, FIELD, PADDING } from '../lib/field.js';
import { getFormationPositions } from '../lib/formations.js';
import { screenToSVG, uid } from '../lib/svg-utils.js';
import { loadAppState, saveAppState, createNewTeam } from '../lib/storage.js';
import type { RosterEntry, FieldPlayer, FormationKey, GameFormat, StoredTeam, StoredAppState } from '../lib/types.js';
import { PLAYER_RADIUS, PLAYER_HIT_RADIUS, PLAYER_FONT_SIZE, NAME_FONT_SIZE, getPlayerCount, getDefaultFormation } from '../lib/types.js';
import type {
  RosterUpdatedEvent, FormationChangedEvent, SettingsChangedEvent,
  GameFormatChangedEvent, TeamSwitchedEvent, TeamAddedEvent, TeamDeletedEvent,
} from './pt-toolbar.js';
import type { TimerTickEvent, ResetHalfEvent, ResetGameEvent } from './pt-timer-bar.js';

const GOAL_DEPTH = 2;
const SEL_RING_OFFSET = 0.6;
const SWAP_THRESHOLD = PLAYER_RADIUS * 2;
const BENCH_TOP = FIELD.LENGTH + GOAL_DEPTH + PADDING + 2;
const BENCH_LABEL_SIZE = NAME_FONT_SIZE;
const BENCH_ROW_SPACING = PLAYER_RADIUS * 2 + NAME_FONT_SIZE + 3;
const BENCH_COL_SPACING = PLAYER_RADIUS * 2 + 3;

function layoutBench(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  const maxPerRow = Math.floor(FIELD.WIDTH / BENCH_COL_SPACING);
  const positions: { x: number; y: number }[] = [];
  const labelY = BENCH_TOP;
  const startY = labelY + BENCH_LABEL_SIZE + 5.5;

  const startX = PADDING + PLAYER_RADIUS;
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / maxPerRow);
    const col = i % maxPerRow;
    positions.push({
      x: startX + col * BENCH_COL_SPACING,
      y: startY + row * BENCH_ROW_SPACING,
    });
  }
  return positions;
}

function getBenchHeight(subCount: number): number {
  if (subCount === 0) return 0;
  const maxPerRow = Math.floor(FIELD.WIDTH / BENCH_COL_SPACING);
  const rows = Math.ceil(subCount / maxPerRow);
  return BENCH_LABEL_SIZE + 3 + rows * BENCH_ROW_SPACING + 4;
}

@customElement('playing-time')
export class PlayingTime extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: relative;
      height: 100vh;
      overflow: hidden;
      --field-stripe-light: #2d6a4f;
      --field-stripe-dark: #276749;
    }

    .app-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .board {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      min-height: 0;
    }

    .svg-wrap {
      position: relative;
      width: 100%;
      max-width: 768px;
      height: 100%;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      cursor: default;
      user-select: none;
    }

    .empty-state {
      font-size: 0.8rem;
      color: #666;
      text-align: center;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .rotate-overlay {
      display: none;
    }

    @media (max-width: 768px) and (orientation: landscape) {
      .rotate-overlay {
        display: flex;
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.92);
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 16px;
      }

      .rotate-overlay svg {
        width: 50vw;
        max-width: 200px;
        height: auto;
      }
    }
  `;

  @state() accessor teams: StoredTeam[] = [];
  @state() accessor activeTeamId: string | null = null;
  @state() accessor teamName = '';
  @state() accessor roster: RosterEntry[] = [];
  @state() accessor gameFormat: GameFormat = '11v11';
  @state() accessor formation: FormationKey = '4-3-3';
  @state() accessor fieldPlayers: FieldPlayer[] = [];
  @state() accessor subPlayers: FieldPlayer[] = [];
  @state() accessor halfLength = 45;
  @state() accessor selectedId: string | null = null;
  @state() accessor swapTargetId: string | null = null;

  @query('svg.field') accessor svgEl!: SVGSVGElement;
  @query('pt-timer-bar') accessor timerBar!: import('./pt-timer-bar.js').PtTimerBar;

  #dragState: {
    id: string;
    offsetX: number;
    offsetY: number;
    originX: number;
    originY: number;
    moved: boolean;
    source: 'field' | 'sub';
  } | null = null;

  connectedCallback() {
    super.connectedCallback();
    const appState = loadAppState();
    this.teams = appState.teams;

    if (appState.activeTeamId && appState.teams.find(t => t.id === appState.activeTeamId)) {
      this.#loadTeam(appState.activeTeamId);
    } else if (appState.teams.length > 0) {
      this.#loadTeam(appState.teams[0].id);
    }
  }

  #loadTeam(teamId: string) {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return;

    this.activeTeamId = teamId;
    this.teamName = team.teamName;
    this.halfLength = team.halfLength;
    this.gameFormat = team.gameFormat;
    this.formation = team.formation;
    this.roster = team.players.map(p => ({
      id: uid('p'),
      number: p.number,
      name: p.name,
      half1Time: p.half1Time ?? 0,
      half2Time: p.half2Time ?? 0,
    }));

    this.#rebuildFieldPlayers();

    if (team.fieldPositions?.length) {
      this.fieldPlayers = this.fieldPlayers.map(fp => {
        const rosterIdx = this.roster.findIndex(r => r.id === fp.id);
        const saved = team.fieldPositions!.find(sp => sp.rosterIndex === rosterIdx);
        return saved ? { ...fp, x: saved.x, y: saved.y } : fp;
      });
    }

    this.selectedId = null;
    this.swapTargetId = null;
  }

  #rebuildFieldPlayers() {
    const positions = getFormationPositions(this.formation);
    const count = getPlayerCount(this.gameFormat);
    const starters = this.roster.slice(0, count);
    this.fieldPlayers = starters.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: positions[i]?.x ?? FIELD.WIDTH / 2,
      y: positions[i]?.y ?? FIELD.LENGTH / 2,
      number: entry.number,
      name: entry.name,
    }));
    this.#rebuildSubPlayers();
  }

  #rebuildSubPlayers() {
    const count = getPlayerCount(this.gameFormat);
    const subs = this.roster.slice(count);
    const benchPositions = layoutBench(subs.length);
    this.subPlayers = subs.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: benchPositions[i]?.x ?? FIELD.WIDTH / 2,
      y: benchPositions[i]?.y ?? BENCH_TOP + 5,
      number: entry.number,
      name: entry.name,
    }));
  }

  #saveState() {
    if (!this.activeTeamId) return;

    const updatedTeam: StoredTeam = {
      id: this.activeTeamId,
      teamName: this.teamName,
      players: this.roster.map(p => ({
        number: p.number,
        name: p.name,
        half1Time: p.half1Time,
        half2Time: p.half2Time,
      })),
      halfLength: this.halfLength,
      gameFormat: this.gameFormat,
      formation: this.formation,
      fieldPositions: this.fieldPlayers.map(fp => ({
        rosterIndex: this.roster.findIndex(r => r.id === fp.id),
        x: fp.x,
        y: fp.y,
      })),
    };

    this.teams = this.teams.map(t => t.id === this.activeTeamId ? updatedTeam : t);
    saveAppState({ activeTeamId: this.activeTeamId, teams: this.teams });
  }

  // --- Team management ---

  #onTeamSwitched(e: TeamSwitchedEvent) {
    this.timerBar?.stopTimer();
    this.#saveState();
    this.#loadTeam(e.teamId);
    this.#saveState();
  }

  #onTeamAdded(_e: TeamAddedEvent) {
    this.#saveState();
    const newTeam = createNewTeam();
    this.teams = [...this.teams, newTeam];
    this.#loadTeam(newTeam.id);
    this.#saveState();
  }

  #onTeamDeleted(e: TeamDeletedEvent) {
    this.teams = this.teams.filter(t => t.id !== e.teamId);
    if (this.teams.length > 0) {
      this.#loadTeam(this.teams[0].id);
    } else {
      this.activeTeamId = null;
      this.teamName = '';
      this.roster = [];
      this.fieldPlayers = [];
      this.subPlayers = [];
    }
    saveAppState({ activeTeamId: this.activeTeamId, teams: this.teams });
  }

  // --- Roster ---

  #onRosterUpdated(e: RosterUpdatedEvent) {
    this.teamName = e.teamName;
    this.roster = e.roster.map(p => ({
      ...p,
      half1Time: p.half1Time ?? 0,
      half2Time: p.half2Time ?? 0,
    }));
    this.#saveState();
    this.#rebuildFieldPlayers();
    this.selectedId = null;
  }

  #onSettingsChanged(e: SettingsChangedEvent) {
    this.halfLength = e.halfLength;
    this.#saveState();
  }

  #onTimerTick(e: TimerTickEvent) {
    const field = e.half === 1 ? 'half1Time' : 'half2Time';
    const fieldPlayerIds = new Set(this.fieldPlayers.map(fp => fp.id));
    this.roster = this.roster.map(p =>
      fieldPlayerIds.has(p.id) ? { ...p, [field]: p[field] + 1 } : p,
    );
    this.#saveState();
  }

  #onResetHalf(e: ResetHalfEvent) {
    const field = e.half === 1 ? 'half1Time' : 'half2Time';
    this.roster = this.roster.map(p => ({ ...p, [field]: 0 }));
    this.#saveState();
  }

  #onResetGame(_e: ResetGameEvent) {
    this.roster = this.roster.map(p => ({ ...p, half1Time: 0, half2Time: 0 }));
    this.#saveState();
  }

  #onGameFormatChanged(e: GameFormatChangedEvent) {
    this.gameFormat = e.gameFormat;
    this.formation = getDefaultFormation(this.gameFormat);
    this.#rebuildFieldPlayers();
    this.#saveState();
    this.selectedId = null;
  }

  #onFormationChanged(e: FormationChangedEvent) {
    this.formation = e.formation;
    this.#rebuildFieldPlayers();
    this.#saveState();
    this.selectedId = null;
  }

  // --- Selection ---

  #selectPlayer(id: string) {
    if (this.selectedId === id) {
      this.selectedId = null;
    } else {
      this.selectedId = id;
    }
  }

  #clearSelection() {
    this.selectedId = null;
  }

  // --- Swap logic ---

  #swapFieldPositions(draggedId: string, targetId: string, originX: number, originY: number) {
    const target = this.fieldPlayers.find(p => p.id === targetId);
    if (!target) return;

    const targetX = target.x;
    const targetY = target.y;

    this.fieldPlayers = this.fieldPlayers.map(p => {
      if (p.id === draggedId) return { ...p, x: targetX, y: targetY };
      if (p.id === targetId) return { ...p, x: originX, y: originY };
      return p;
    });

    this.selectedId = null;
    this.swapTargetId = null;
    this.#saveState();
  }

  #doSubstitution(fieldId: string, subId: string, restoreX?: number, restoreY?: number) {
    const rosterCopy = [...this.roster];
    const fieldIdx = rosterCopy.findIndex(p => p.id === fieldId);
    const subIdx = rosterCopy.findIndex(p => p.id === subId);
    if (fieldIdx === -1 || subIdx === -1) return;

    const tmp = rosterCopy[fieldIdx];
    rosterCopy[fieldIdx] = rosterCopy[subIdx];
    rosterCopy[subIdx] = tmp;

    const newFieldEntry = rosterCopy[fieldIdx];
    const updatedFieldPlayers = this.fieldPlayers.map(fp => {
      if (fp.id !== fieldId) return fp;
      const restored = { ...fp, id: newFieldEntry.id, rosterId: newFieldEntry.id, number: newFieldEntry.number, name: newFieldEntry.name };
      if (restoreX != null && restoreY != null) {
        restored.x = restoreX;
        restored.y = restoreY;
      }
      return restored;
    });

    const count = getPlayerCount(this.gameFormat);
    const newSubs = rosterCopy.slice(count);
    const benchPositions = layoutBench(newSubs.length);
    const updatedSubPlayers = newSubs.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: benchPositions[i]?.x ?? FIELD.WIDTH / 2,
      y: benchPositions[i]?.y ?? BENCH_TOP + 5,
      number: entry.number,
      name: entry.name,
    }));

    this.roster = rosterCopy;
    this.fieldPlayers = updatedFieldPlayers;
    this.subPlayers = updatedSubPlayers;
    this.selectedId = null;
    this.swapTargetId = null;
    this.#saveState();
  }

  // --- Pointer / drag handling ---

  #onPointerDown(e: PointerEvent) {
    const hit = this.#resolveHit(e.target);

    if (hit?.kind === 'player' || hit?.kind === 'sub') {
      const isField = hit.kind === 'player';
      const allPlayers = isField ? this.fieldPlayers : this.subPlayers;
      const player = allPlayers.find(p => p.id === hit.id);
      if (!player) return;

      const pt = screenToSVG(this.svgEl, e.clientX, e.clientY);
      this.#dragState = {
        id: hit.id,
        offsetX: pt.x - player.x,
        offsetY: pt.y - player.y,
        originX: player.x,
        originY: player.y,
        moved: false,
        source: isField ? 'field' : 'sub',
      };
      this.svgEl.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }

    this.#clearSelection();
  }

  #onPointerMove(e: PointerEvent) {
    if (!this.#dragState) return;
    const pt = screenToSVG(this.svgEl, e.clientX, e.clientY);
    const newX = pt.x - this.#dragState.offsetX;
    const newY = pt.y - this.#dragState.offsetY;

    const isField = this.#dragState.source === 'field';
    const currentList = isField ? this.fieldPlayers : this.subPlayers;
    const currentPlayer = currentList.find(p => p.id === this.#dragState!.id);
    if (currentPlayer) {
      const dx = Math.abs(newX - currentPlayer.x);
      const dy = Math.abs(newY - currentPlayer.y);
      if (dx > 0.3 || dy > 0.3) this.#dragState.moved = true;
    }

    let updatedField = this.fieldPlayers;
    let updatedSubs = this.subPlayers;

    if (isField) {
      updatedField = this.fieldPlayers.map(p =>
        p.id === this.#dragState!.id ? { ...p, x: newX, y: newY } : p,
      );
    } else {
      updatedSubs = this.subPlayers.map(p =>
        p.id === this.#dragState!.id ? { ...p, x: newX, y: newY } : p,
      );
    }

    const allTargets = isField
      ? [...updatedField, ...updatedSubs]
      : [...updatedField];

    let closest: string | null = null;
    for (const other of allTargets) {
      if (other.id === this.#dragState.id) continue;
      const dist = Math.hypot(newX - other.x, newY - other.y);
      if (dist < SWAP_THRESHOLD) {
        closest = other.id;
        break;
      }
    }

    this.fieldPlayers = updatedField;
    this.subPlayers = updatedSubs;
    this.swapTargetId = closest;
  }

  #onPointerUp(_e: PointerEvent) {
    if (this.#dragState) {
      const targetId = this.swapTargetId;
      if (targetId) {
        const dragId = this.#dragState.id;
        const origX = this.#dragState.originX;
        const origY = this.#dragState.originY;
        const dragSource = this.#dragState.source;
        const fieldIds = new Set(this.fieldPlayers.map(p => p.id));
        const subIds = new Set(this.subPlayers.map(p => p.id));

        this.#dragState = null;
        this.swapTargetId = null;

        if (dragSource === 'field' && fieldIds.has(targetId)) {
          this.#swapFieldPositions(dragId, targetId, origX, origY);
        } else if (dragSource === 'field' && subIds.has(targetId)) {
          this.#doSubstitution(dragId, targetId, origX, origY);
        } else if (dragSource === 'sub' && fieldIds.has(targetId)) {
          this.#doSubstitution(targetId, dragId);
        }
        return;
      } else if (!this.#dragState.moved) {
        this.#selectPlayer(this.#dragState.id);
      } else if (this.#dragState.source === 'field') {
        this.#saveState();
      } else {
        this.#rebuildSubPlayers();
      }
      this.#dragState = null;
      this.swapTargetId = null;
    }
  }

  #onPointerLeave(_e: PointerEvent) {
    if (!this.#dragState) {
      this.#clearSelection();
    }
  }

  #resolveHit(target: EventTarget | null): { kind: string; id: string } | null {
    let el = target as SVGElement | null;
    while (el && el instanceof SVGElement) {
      const kind = el.dataset?.kind;
      const id = el.dataset?.id;
      if (kind && id) return { kind, id };
      el = el.parentElement as SVGElement | null;
    }
    return null;
  }

  // --- SVG rendering ---

  #renderDefs() {
    return svg`
      <defs>
        <pattern id="grass-stripes" width="68" height="10"
                 patternUnits="userSpaceOnUse">
          <rect width="68" height="5" fill="var(--field-stripe-light, #2d6a4f)" />
          <rect y="5" width="68" height="5" fill="var(--field-stripe-dark, #276749)" />
        </pattern>

        <filter id="player-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.3" stdDeviation="0.4"
                        flood-color="#000" flood-opacity="0.5" />
        </filter>

        <filter id="text-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="0.15" stdDeviation="0.25"
                        flood-color="#000" flood-opacity="0.35" />
        </filter>

        <pattern id="goal-net" width="0.5" height="0.5"
                 patternUnits="userSpaceOnUse">
          <rect width="0.5" height="0.5" fill="#ddd" fill-opacity="0.15" />
          <line x1="0" y1="0" x2="0.5" y2="0.5"
                stroke="white" stroke-width="0.04" opacity="0.3" />
          <line x1="0.5" y1="0" x2="0" y2="0.5"
                stroke="white" stroke-width="0.04" opacity="0.3" />
        </pattern>
      </defs>
    `;
  }

  #renderPlayerCircle(p: FieldPlayer, kind: string) {
    const selected = p.id === this.selectedId;
    const isSwapTarget = p.id === this.swapTargetId;
    const selR = PLAYER_RADIUS + SEL_RING_OFFSET;
    const fillColor = isSwapTarget ? '#e94560' : '#ffffff';
    const textColor = isSwapTarget ? '#ffffff' : '#151515';

    return svg`
      <g data-id="${p.id}" data-kind="${kind}" style="cursor: grab">
        ${selected ? svg`
          <circle cx="${p.x}" cy="${p.y}" r="${selR}"
                  fill="none" stroke="white" stroke-width="0.2"
                  stroke-dasharray="0.5,0.3" />
        ` : nothing}
        <circle cx="${p.x}" cy="${p.y}" r="${PLAYER_HIT_RADIUS}"
                fill="transparent" />
        <circle cx="${p.x}" cy="${p.y}" r="${PLAYER_RADIUS + 0.2}"
                fill="none" stroke="white" stroke-width="0.25" stroke-opacity="0.8"
                filter="url(#player-shadow)"
                style="pointer-events: none" />
        <circle cx="${p.x}" cy="${p.y}" r="${PLAYER_RADIUS}"
                fill="${fillColor}"
                style="pointer-events: none" />
        ${p.number ? svg`
          <text x="${p.x}" y="${p.y}"
                text-anchor="middle" dominant-baseline="central"
                fill="${textColor}" font-size="${PLAYER_FONT_SIZE}" font-weight="bold"
                font-family="system-ui, sans-serif"
                style="pointer-events: none">
            ${p.number}
          </text>
        ` : nothing}
        <text x="${p.x}" y="${p.y + PLAYER_RADIUS + 2}"
              text-anchor="middle" dominant-baseline="central"
              fill="white" font-size="${NAME_FONT_SIZE}"
              font-family="system-ui, sans-serif"
              filter="url(#text-shadow)"
              style="pointer-events: none">
          ${p.name}
        </text>
      </g>
    `;
  }

  render() {
    const vbX = -PADDING;
    const vbY = -PADDING;
    const vbW = FIELD.WIDTH + PADDING * 2;
    const subCount = this.subPlayers.length;
    const benchH = subCount > 0 ? getBenchHeight(subCount) + 2 : 0;
    const vbH = FIELD.LENGTH + PADDING + GOAL_DEPTH + PADDING + benchH;

    const dragId = this.#dragState?.id;

    return html`
      <div class="rotate-overlay">
        <svg viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="M880.71 163.3V163.32L740.23 163.16L738.09 127.98L882.89 128L880.71 163.3ZM106.9 438.69H106.88L105.81 458.31L105.78 459.55L105.99 479.2C106.11 489.65 114.67 498.03 125.12 497.92C135.5 497.81 143.84 489.35 143.84 479L143.63 459.77L144.64 441.37L146.85 423.11L150.26 405.01L154.85 387.19L160.6 369.72L167.5 352.63L175.49 336.07L184.57 320.03L194.67 304.65L205.76 289.97L217.8 276.04L230.73 262.93L244.27 250.89L258.55 239.75L273.53 229.55L289.13 220.35L305.29 212.18L321.96 205.07L339.06 199.05L356.5 194.15L374.21 190.39L392.15 187.78L409.75 186.38L388.69 203.43C384.01 207.22 381.58 212.76 381.58 218.35C381.58 222.59 382.98 226.86 385.86 230.41C392.52 238.64 404.61 239.91 412.84 233.25L475.4 182.59C479.9 178.95 482.51 173.47 482.53 167.68V167.59C482.53 161.81 479.9 156.42 475.4 152.77L413.16 102.35C404.93 95.68 392.85 96.95 386.18 105.18C383.3 108.73 381.9 113 381.9 117.25C381.9 122.84 384.33 128.38 389.01 132.17L409.17 148.5H409.04L407.82 148.56L388.53 150.1L387.31 150.24L368.17 153.02L366.96 153.24L348.04 157.26L346.85 157.55L328.23 162.78L327.06 163.15L308.81 169.58L307.67 170.03L289.88 177.62L288.77 178.14L271.51 186.87L270.44 187.46L253.78 197.29L252.74 197.95L236.75 208.83L235.76 209.55L220.51 221.45L219.57 222.23L205.11 235.09L204.22 235.94L190.42 249.93L189.58 250.84L176.73 265.71L175.95 266.68L164.1 282.36L163.39 283.38L152.6 299.81L151.95 300.87L142.27 317.97L141.69 319.07L133.15 336.77L132.64 337.91L125.28 356.13L124.85 357.3L118.71 375.97L118.36 377.17L113.45 396.2L113.18 397.41L109.54 416.72L109.35 417.95L106.98 437.46L106.93 438.7H106.88H106.9V438.69ZM1034.12 127.99H1035.01C1048.17 128.42 1058.72 139.24 1058.72 152.52V850.85L562.25 850.87V152.52C562.25 139.24 572.79 128.42 585.96 127.99L699.84 128.01L703.25 183.42C703.87 193.49 712.21 201.33 722.3 201.33L898.64 201.38C908.72 201.36 917.06 193.52 917.69 183.46L921.13 127.99H1034.12ZM165.32 878.25V878.27L130.31 880.29L130.22 735.5L165.38 737.71V737.73L165.32 878.26V878.25ZM810.51 955.19H810.54C821.5 955.19 830.33 964.07 830.33 975.02C830.33 985.97 821.45 994.85 810.5 994.85C799.55 994.85 790.67 985.97 790.67 975.02C790.67 964.07 799.52 955.19 810.47 955.19H810.52H810.51ZM810.5 916.95H810.46C778.39 916.95 752.43 942.95 752.43 975.02C752.43 1007.09 778.42 1033.08 810.49 1033.08C842.56 1033.08 868.56 1007.08 868.56 975.02C868.56 942.96 842.59 916.95 810.52 916.95H810.5ZM1058.75 1031.75V1031.8C1058.75 1045.02 1048.2 1056.26 1035.04 1056.28L585.98 1056.3C572.82 1055.87 562.26 1045.04 562.26 1031.76V889.07L1058.74 889.11V1031.75H1058.75ZM153.36 521.44V521.46C153.47 521.44 153.36 521.44 153.36 521.44C121.46 522.14 95.39 546.56 92.24 577.77V577.84C92.01 580 91.87 1031.59 91.87 1031.59C91.87 1055.47 105.03 1076.19 124.65 1086.81L124.74 1086.86C133.33 1091.56 143.14 1094.56 153.58 1094.56L481.57 1094.36C492.12 1094.36 500.68 1085.81 500.68 1075.26C500.68 1064.71 492.23 1056.26 481.77 1056.16C481.51 1056.16 154.65 1056.16 154.65 1056.16C150.38 1056.16 146.37 1055.07 142.87 1053.15L142.82 1053.12C135.64 1049 130.71 1041.43 130.42 1032.66L130.35 918.55L185.58 915.17C195.64 914.55 203.48 906.22 203.5 896.15C203.5 896.06 203.57 719.78 203.57 719.78C203.57 709.7 195.73 701.35 185.67 700.73L130.22 697.28L130.29 581.75C131.64 569.45 142.04 559.9 154.67 559.89L481.58 559.71C492.13 559.69 500.69 551.14 500.69 540.59C500.69 530.04 492.14 521.48 481.58 521.48H153.36V521.5V521.47V521.44ZM586.84 89.74H586.79C552.59 89.74 524.79 117.08 524.04 151.11V1033.18C524.81 1067.22 552.62 1094.56 586.81 1094.56H1034.2C1068.39 1094.54 1096.21 1067.2 1096.96 1033.17V151.11C1096.19 117.07 1068.38 89.73 1034.19 89.73H586.84V89.74Z" fill="white"/></svg>
      </div>
      <div class="app-container">
        <pt-settings-bar
          .teamName="${this.teamName}"
          .roster="${this.roster}"
          .gameFormat="${this.gameFormat}"
          .formation="${this.formation}"
          .halfLength="${this.halfLength}"
          .teams="${this.teams}"
          .activeTeamId="${this.activeTeamId}"
          .showRosterHint="${this.roster.length === 0 && this.activeTeamId != null}"
          @roster-updated="${this.#onRosterUpdated}"
          @game-format-changed="${this.#onGameFormatChanged}"
          @formation-changed="${this.#onFormationChanged}"
          @settings-changed="${this.#onSettingsChanged}"
          @team-switched="${this.#onTeamSwitched}"
          @team-added="${this.#onTeamAdded}"
          @team-deleted="${this.#onTeamDeleted}">
        </pt-settings-bar>

        <div class="board">
        <div class="svg-wrap">
          <svg
            class="field"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="${vbX} ${vbY} ${vbW} ${vbH}"
            preserveAspectRatio="xMidYMid meet"
            style="touch-action: none"
            @pointerdown="${this.#onPointerDown}"
            @pointermove="${this.#onPointerMove}"
            @pointerup="${this.#onPointerUp}"
            @pointerleave="${this.#onPointerLeave}">

            ${this.#renderDefs()}

            <rect x="${vbX}" y="${vbY}"
                  width="${vbW}" height="${vbH}"
                  fill="#1a1a2e" />

            <rect x="0" y="0"
                  width="${FIELD.WIDTH}" height="${FIELD.LENGTH}"
                  fill="url(#grass-stripes)" rx="0.5" />

            ${renderField()}

            ${this.roster.length === 0 && this.activeTeamId != null ? svg`
              <g style="pointer-events: none">
                <rect x="${FIELD.WIDTH / 2 - 18}" y="${FIELD.LENGTH / 2 - 4.5}"
                      width="36" height="9" rx="1.5"
                      fill="#16213e" fill-opacity="0.9"
                      filter="url(#player-shadow)" />
                <text x="${FIELD.WIDTH / 2 - 1.5}" y="${FIELD.LENGTH / 2}"
                      text-anchor="middle" dominant-baseline="central"
                      fill="#e0e0e0" font-size="${NAME_FONT_SIZE}"
                      font-family="system-ui, sans-serif">
                  Add players to your team.
                </text>
                <svg x="${FIELD.WIDTH / 2 + 11.5}" y="${FIELD.LENGTH / 2 - 2.4}"
                     width="4.8" height="4.8"
                     viewBox="0 0 1600 1600">
                  <path d="M1250.75 484.752L1150 585.501V790.128L1350 650.128L1250.75 484.752Z" fill="#e0e0e0"/>
                  <path d="M450 585.499L349.251 484.75L250 650.123L450 790.123V585.499Z" fill="#e0e0e0"/>
                  <path d="M500 575.125V1275.13H1100V575.125C1100 568.5 1102.63 562.125 1107.31 557.437L1224.25 440.5L1210 416.688C1203.62 406.001 1193.44 398.063 1181.5 394.5L950.059 325.063L947.497 330.125C925.059 375 884.871 410.188 835.871 421.063C761.371 437.625 687.991 400.937 655.311 335.563L650.061 325L418.621 394.437C406.684 398 396.496 405.937 390.121 416.625L375.871 440.437L492.808 557.375C497.495 562.062 500.121 568.437 500.121 575.063L500 575.125ZM950 575.125C977.625 575.125 1000 597.5 1000 625.125C1000 652.751 977.625 675.125 950 675.125C922.375 675.125 900 652.751 900 625.125C900 597.5 922.375 575.125 950 575.125ZM600 1125.13H700V1175.13H600V1125.13Z" fill="#e0e0e0"/>
                </svg>
              </g>
            ` : nothing}

            <g class="players-layer">
              ${this.fieldPlayers
                .filter(p => p.id !== dragId && p.id !== this.selectedId)
                .map(p => this.#renderPlayerCircle(p, 'player'))}
              ${this.fieldPlayers
                .filter(p => p.id === this.selectedId && p.id !== dragId)
                .map(p => this.#renderPlayerCircle(p, 'player'))}
            </g>

            ${subCount > 0 ? svg`
              <text x="${PADDING}" y="${BENCH_TOP}"
                    fill="#aaa" font-size="${NAME_FONT_SIZE}" font-weight="bold"
                    font-family="system-ui, sans-serif"
                    style="pointer-events: none">
                Substitutes
              </text>
              <g class="subs-layer">
                ${this.subPlayers
                  .filter(p => p.id !== dragId && p.id !== this.selectedId)
                  .map(p => this.#renderPlayerCircle(p, 'sub'))}
                ${this.subPlayers
                  .filter(p => p.id === this.selectedId && p.id !== dragId)
                  .map(p => this.#renderPlayerCircle(p, 'sub'))}
              </g>
            ` : this.roster.length === 0 ? svg`
              <text x="${FIELD.WIDTH / 2}" y="${BENCH_TOP + 3}"
                    text-anchor="middle"
                    fill="#666" font-size="${BENCH_LABEL_SIZE}"
                    font-family="system-ui, sans-serif"
                    style="pointer-events: none">
                Open the Roster to add players
              </text>
            ` : nothing}

            ${dragId ? svg`
              <g class="drag-layer">
                ${[...this.fieldPlayers, ...this.subPlayers]
                  .filter(p => p.id === dragId)
                  .map(p => this.#renderPlayerCircle(p, this.#dragState?.source === 'field' ? 'player' : 'sub'))}
              </g>
            ` : nothing}
          </svg>
        </div>
        </div>

        <pt-timer-bar
          .halfLength="${this.halfLength}"
          @timer-tick="${this.#onTimerTick}"
          @reset-half="${this.#onResetHalf}"
          @reset-game="${this.#onResetGame}">
        </pt-timer-bar>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'playing-time': PlayingTime;
  }
}
