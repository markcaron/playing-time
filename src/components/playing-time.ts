import { LitElement, html, svg, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';

import './pt-toolbar.js';
import { renderHalfField, FIELD, PADDING } from '../lib/field.js';
import { getFormationPositions } from '../lib/formations.js';
import { screenToSVG, uid } from '../lib/svg-utils.js';
import { loadRoster, saveRoster } from '../lib/storage.js';
import type { RosterEntry, FieldPlayer, FormationKey } from '../lib/types.js';
import { PLAYER_RADIUS, PLAYER_FONT_SIZE, NAME_FONT_SIZE } from '../lib/types.js';
import type { RosterUpdatedEvent } from './pt-toolbar.js';
import type { FormationChangedEvent } from './pt-toolbar.js';

const GOAL_DEPTH = 2;
const SEL_RING_OFFSET = 0.6;
const SWAP_BTN_GAP = 1.5;

@customElement('playing-time')
export class PlayingTime extends LitElement {
  static styles = css`
    :host {
      display: block;
      --field-stripe-light: #2d6a4f;
      --field-stripe-dark: #276749;
    }

    .app-container {
      display: flex;
      flex-direction: column;
    }

    .svg-wrap {
      position: relative;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
      cursor: default;
      user-select: none;
    }

    .subs-section {
      background: #16213e;
      padding: 12px;
      border-radius: 0 0 10px 10px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .subs-heading {
      font-size: 0.8rem;
      color: #aaa;
      margin-bottom: 8px;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .subs-list {
      display: flex;
      gap: 32px;
      overflow-x: auto;
      padding-bottom: 4px;
      -webkit-overflow-scrolling: touch;
    }

    .sub-player {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      position: relative;
    }

    .sub-player .circle-svg {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
    }

    .sub-player.swap-target {
      animation: pulse 0.8s ease-in-out infinite alternate;
    }

    @keyframes pulse {
      from { opacity: 1; }
      to { opacity: 0.5; }
    }

    .sub-swap-btn {
      position: absolute;
      top: 3px;
      left: calc(100% + 4px);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #151515;
      border: 1px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
    }

    .sub-swap-btn.active {
      background: #e94560;
    }

    .sub-swap-btn svg {
      width: 14px;
      height: 14px;
    }

    .sub-name {
      font-size: 0.7rem;
      color: #ccc;
      text-align: center;
      max-width: 56px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: system-ui, -apple-system, sans-serif;
    }

    .empty-state {
      font-size: 0.8rem;
      color: #666;
      text-align: center;
      padding: 16px;
      font-family: system-ui, -apple-system, sans-serif;
    }
  `;

  @state() accessor teamName = '';
  @state() accessor roster: RosterEntry[] = [];
  @state() accessor formation: FormationKey = '4-3-3';
  @state() accessor fieldPlayers: FieldPlayer[] = [];
  @state() accessor selectedId: string | null = null;
  @state() accessor selectedSource: 'field' | 'sub' | null = null;
  @state() accessor swapMode = false;

  @query('svg.field') accessor svgEl!: SVGSVGElement;

  #dragState: { id: string; offsetX: number; offsetY: number; moved: boolean } | null = null;

  connectedCallback() {
    super.connectedCallback();
    const saved = loadRoster();
    this.teamName = saved.teamName;
    this.roster = saved.players.map(p => ({
      id: uid('p'),
      number: p.number,
      name: p.name,
    }));
    this.#rebuildFieldPlayers();
  }

  #rebuildFieldPlayers() {
    const positions = getFormationPositions(this.formation);
    const starters = this.roster.slice(0, 11);
    this.fieldPlayers = starters.map((entry, i) => ({
      id: entry.id,
      rosterId: entry.id,
      x: positions[i]?.x ?? FIELD.WIDTH / 2,
      y: positions[i]?.y ?? FIELD.HALF_LENGTH / 2,
      number: entry.number,
      name: entry.name,
    }));
  }

  get #subs(): RosterEntry[] {
    return this.roster.slice(11);
  }

  #onRosterUpdated(e: RosterUpdatedEvent) {
    this.teamName = e.teamName;
    this.roster = e.roster;
    saveRoster({
      teamName: this.teamName,
      players: this.roster.map(p => ({ number: p.number, name: p.name })),
    });
    this.#rebuildFieldPlayers();
    this.selectedId = null;
    this.swapMode = false;
  }

  #onFormationChanged(e: FormationChangedEvent) {
    this.formation = e.formation;
    this.#rebuildFieldPlayers();
    this.selectedId = null;
    this.swapMode = false;
  }

  // --- Selection ---

  #selectFieldPlayer(id: string) {
    if (this.selectedId === id) {
      this.selectedId = null;
      this.selectedSource = null;
      this.swapMode = false;
    } else {
      this.selectedId = id;
      this.selectedSource = 'field';
      this.swapMode = false;
    }
  }

  #selectSub(id: string) {
    if (this.selectedId === id) {
      this.selectedId = null;
      this.selectedSource = null;
      this.swapMode = false;
    } else {
      this.selectedId = id;
      this.selectedSource = 'sub';
      this.swapMode = false;
    }
  }

  #clearSelection() {
    this.selectedId = null;
    this.selectedSource = null;
    this.swapMode = false;
  }

  #toggleSwapMode() {
    this.swapMode = !this.swapMode;
  }

  // --- Swap logic ---

  #swapFieldPlayers(targetId: string) {
    const srcId = this.selectedId!;
    const srcIdx = this.fieldPlayers.findIndex(p => p.id === srcId);
    const tgtIdx = this.fieldPlayers.findIndex(p => p.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;

    const updated = [...this.fieldPlayers];
    const srcPlayer = updated[srcIdx];
    const tgtPlayer = updated[tgtIdx];
    updated[srcIdx] = { ...tgtPlayer, x: srcPlayer.x, y: srcPlayer.y };
    updated[tgtIdx] = { ...srcPlayer, x: tgtPlayer.x, y: tgtPlayer.y };
    this.fieldPlayers = updated;

    this.selectedId = null;
    this.selectedSource = null;
    this.swapMode = false;
  }

  #doSubstitution(fieldId: string, subId: string) {
    const fieldIdx = this.roster.findIndex(p => p.id === fieldId);
    const subIdx = this.roster.findIndex(p => p.id === subId);
    if (fieldIdx === -1 || subIdx === -1) return;

    const updatedRoster = [...this.roster];
    const tmp = updatedRoster[fieldIdx];
    updatedRoster[fieldIdx] = updatedRoster[subIdx];
    updatedRoster[subIdx] = tmp;
    this.roster = updatedRoster;

    saveRoster({
      teamName: this.teamName,
      players: this.roster.map(p => ({ number: p.number, name: p.name })),
    });

    const subEntry = this.roster[fieldIdx];
    this.fieldPlayers = this.fieldPlayers.map(fp =>
      fp.id === fieldId
        ? { ...fp, id: subEntry.id, rosterId: subEntry.id, number: subEntry.number, name: subEntry.name }
        : fp,
    );

    this.selectedId = null;
    this.selectedSource = null;
    this.swapMode = false;
  }

  // --- Pointer / drag handling ---

  #onPointerDown(e: PointerEvent) {
    const hit = this.#resolveHit(e.target);

    if (hit?.kind === 'swap-btn') {
      this.#toggleSwapMode();
      e.preventDefault();
      return;
    }

    if (hit?.kind === 'player') {
      if (this.swapMode && this.selectedId && hit.id !== this.selectedId) {
        if (this.selectedSource === 'field') {
          this.#swapFieldPlayers(hit.id);
        } else if (this.selectedSource === 'sub') {
          this.#doSubstitution(hit.id, this.selectedId);
        }
        e.preventDefault();
        return;
      }
      if (this.swapMode && this.selectedSource === 'sub') {
        e.preventDefault();
        return;
      }

      const pt = screenToSVG(this.svgEl, e.clientX, e.clientY);
      const player = this.fieldPlayers.find(p => p.id === hit.id);
      if (!player) return;

      this.#dragState = {
        id: hit.id,
        offsetX: pt.x - player.x,
        offsetY: pt.y - player.y,
        moved: false,
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

    const dx = Math.abs(newX - (this.fieldPlayers.find(p => p.id === this.#dragState!.id)?.x ?? 0));
    const dy = Math.abs(newY - (this.fieldPlayers.find(p => p.id === this.#dragState!.id)?.y ?? 0));
    if (dx > 0.3 || dy > 0.3) this.#dragState.moved = true;

    this.fieldPlayers = this.fieldPlayers.map(p =>
      p.id === this.#dragState!.id ? { ...p, x: newX, y: newY } : p,
    );
  }

  #onPointerUp(_e: PointerEvent) {
    if (this.#dragState) {
      if (!this.#dragState.moved) {
        this.#selectFieldPlayer(this.#dragState.id);
      }
      this.#dragState = null;
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

  #renderPlayer(p: FieldPlayer) {
    const selected = p.id === this.selectedId && this.selectedSource === 'field';
    const isSwapTarget = this.swapMode && this.selectedId != null && p.id !== this.selectedId;
    const selR = PLAYER_RADIUS + SEL_RING_OFFSET;
    const bx = p.x + PLAYER_RADIUS + SWAP_BTN_GAP + PLAYER_RADIUS;

    return svg`
      <g class="player" data-id="${p.id}" data-kind="player"
         style="cursor: ${isSwapTarget ? 'pointer' : 'grab'}">
        ${selected ? svg`
          <circle cx="${p.x}" cy="${p.y}" r="${selR}"
                  fill="none" stroke="white" stroke-width="0.2"
                  stroke-dasharray="0.5,0.3" />
        ` : nothing}
        ${isSwapTarget ? svg`
          <circle cx="${p.x}" cy="${p.y}" r="${selR}"
                  fill="none" stroke="white" stroke-width="0.15"
                  stroke-dasharray="0.4,0.3" opacity="0.5" />
        ` : nothing}
        <circle cx="${p.x}" cy="${p.y}" r="${PLAYER_RADIUS}"
                fill="#ffffff" stroke="white" stroke-width="0.15"
                filter="url(#player-shadow)" />
        ${p.number ? svg`
          <text x="${p.x}" y="${p.y}"
                text-anchor="middle" dominant-baseline="central"
                fill="#151515" font-size="${PLAYER_FONT_SIZE}" font-weight="bold"
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
      ${selected ? svg`
        <g data-kind="swap-btn" data-id="${p.id}"
           style="cursor: pointer"
           @pointerdown="${(e: PointerEvent) => { e.stopPropagation(); this.#toggleSwapMode(); }}">
          <circle cx="${bx}" cy="${p.y}" r="${PLAYER_RADIUS}"
                  fill="${this.swapMode ? '#e94560' : '#151515'}"
                  stroke="white" stroke-width="0.15"
                  filter="url(#player-shadow)" />
          <polyline points="${bx - 0.375},${p.y + 0.825} ${bx - 0.375},${p.y - 0.525} ${bx - 0.9},${p.y + 0.075}"
                    fill="none" stroke="${this.swapMode ? 'white' : '#4ade80'}" stroke-width="0.3"
                    stroke-linecap="round" stroke-linejoin="round"
                    style="pointer-events: none" />
          <polyline points="${bx + 0.375},${p.y - 0.825} ${bx + 0.375},${p.y + 0.525} ${bx + 0.9},${p.y - 0.075}"
                    fill="none" stroke="${this.swapMode ? 'white' : '#f87171'}" stroke-width="0.3"
                    stroke-linecap="round" stroke-linejoin="round"
                    style="pointer-events: none" />
        </g>
      ` : nothing}
    `;
  }

  render() {
    const vbX = -PADDING;
    const vbY = -PADDING;
    const vbW = FIELD.WIDTH + PADDING * 2;
    const vbH = FIELD.HALF_LENGTH + PADDING + GOAL_DEPTH + PADDING;

    const subs = this.#subs;

    return html`
      <div class="app-container">
        <pt-toolbar
          .teamName="${this.teamName}"
          .roster="${this.roster}"
          .formation="${this.formation}"
          @roster-updated="${this.#onRosterUpdated}"
          @formation-changed="${this.#onFormationChanged}">
        </pt-toolbar>

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
            @pointerleave="${this.#onPointerUp}">

            ${this.#renderDefs()}

            <rect x="${vbX}" y="${vbY}"
                  width="${vbW}" height="${vbH}"
                  fill="#1a1a2e" />

            <rect x="0" y="0"
                  width="${FIELD.WIDTH}" height="${FIELD.HALF_LENGTH}"
                  fill="url(#grass-stripes)" rx="0.5" />

            ${renderHalfField()}

            <g class="players-layer">
              ${this.fieldPlayers
                .filter(p => p.id !== this.selectedId)
                .map(p => this.#renderPlayer(p))}
              ${this.fieldPlayers
                .filter(p => p.id === this.selectedId)
                .map(p => this.#renderPlayer(p))}
            </g>
          </svg>
        </div>

        ${subs.length > 0 || this.roster.length === 0 ? html`
          <div class="subs-section">
            ${this.roster.length === 0 ? html`
              <div class="empty-state">Open the Roster to add players</div>
            ` : html`
              <div class="subs-heading">Subs</div>
              <div class="subs-list">
                ${subs.map(s => this.#renderSubPlayer(s))}
              </div>
            `}
          </div>
        ` : nothing}
      </div>
    `;
  }

  #renderSubPlayer(entry: RosterEntry) {
    const selected = entry.id === this.selectedId;
    const isSwapTarget = this.swapMode && this.selectedId != null && !selected && this.selectedSource === 'field';

    const arrowUpColor = this.swapMode ? 'white' : '#4ade80';
    const arrowDownColor = this.swapMode ? 'white' : '#f87171';

    return html`
      <div class="sub-player ${isSwapTarget ? 'swap-target' : ''} ${selected ? 'selected' : ''}"
           @click="${() => this.#onSubClick(entry.id)}">
        <svg class="circle-svg" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
          ${selected ? svg`
            <circle cx="5" cy="5" r="4.7"
                    fill="none" stroke="white" stroke-width="0.3"
                    stroke-dasharray="0.8,0.5" />
          ` : nothing}
          ${isSwapTarget ? svg`
            <circle cx="5" cy="5" r="4.7"
                    fill="none" stroke="white" stroke-width="0.25"
                    stroke-dasharray="0.7,0.4" opacity="0.5" />
          ` : nothing}
          <circle cx="5" cy="5" r="4"
                  fill="#ffffff" stroke="white" stroke-width="0.3" />
          ${entry.number ? svg`
            <text x="5" y="5"
                  text-anchor="middle" dominant-baseline="central"
                  fill="#151515" font-size="3.5" font-weight="bold"
                  font-family="system-ui, sans-serif">
              ${entry.number}
            </text>
          ` : nothing}
        </svg>
        ${selected ? html`
          <div class="sub-swap-btn ${this.swapMode ? 'active' : ''}"
               @click="${(e: Event) => { e.stopPropagation(); this.#toggleSwapMode(); }}">
            <svg viewBox="-1.2 -1.2 2.4 2.4" xmlns="http://www.w3.org/2000/svg">
              <polyline points="-0.375,0.825 -0.375,-0.525 -0.9,0.075"
                        fill="none" stroke="${arrowUpColor}" stroke-width="0.3"
                        stroke-linecap="round" stroke-linejoin="round" />
              <polyline points="0.375,-0.825 0.375,0.525 0.9,-0.075"
                        fill="none" stroke="${arrowDownColor}" stroke-width="0.3"
                        stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        ` : nothing}
        <span class="sub-name">${entry.name || entry.number}</span>
      </div>
    `;
  }

  #onSubClick(subId: string) {
    if (this.swapMode && this.selectedId && this.selectedSource === 'field') {
      this.#doSubstitution(this.selectedId, subId);
      return;
    }
    if (this.swapMode && this.selectedId && this.selectedSource === 'sub' && subId !== this.selectedId) {
      // Sub-to-sub swap doesn't make sense for playing time, just select the new one
      this.#selectSub(subId);
      return;
    }
    this.#selectSub(subId);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'playing-time': PlayingTime;
  }
}
