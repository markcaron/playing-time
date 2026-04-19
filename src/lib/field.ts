import { svg } from 'lit';

/**
 * Vertical half-field based on FIFA dimensions (meters → SVG user units).
 * Width = 68m, half-length = 52.5m.
 * Origin (0,0) is top-left; halfway line at y=0, goal at y=52.5.
 */
const FIELD_W = 68;
const HALF_LENGTH = 52.5;

const CENTER_CIRCLE_R = 9.15;
const PENALTY_AREA_DEPTH = 16.5;
const PENALTY_AREA_WIDTH = 40.32;
const GOAL_AREA_DEPTH = 5.5;
const GOAL_AREA_WIDTH = 18.32;
const PENALTY_SPOT_DIST = 11;
const PENALTY_ARC_R = 9.15;
const CORNER_ARC_R = 1;
const GOAL_WIDTH = 7.32;
const GOAL_DEPTH = 2;
const SPOT_R = 0.25;
const LW = 0.18;

const cx = FIELD_W / 2;
const penaltyLeft  = (FIELD_W - PENALTY_AREA_WIDTH) / 2;
const goalAreaLeft  = (FIELD_W - GOAL_AREA_WIDTH) / 2;
const goalLeft      = (FIELD_W - GOAL_WIDTH) / 2;

function penaltyArc() {
  const spotY = HALF_LENGTH - PENALTY_SPOT_DIST;
  const boxEdgeY = HALF_LENGTH - PENALTY_AREA_DEPTH;
  const dy = Math.abs(boxEdgeY - spotY);
  const dx = Math.sqrt(PENALTY_ARC_R ** 2 - dy ** 2);
  const startX = cx - dx;
  const endX   = cx + dx;
  return svg`<path
    d="M ${startX} ${boxEdgeY} A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 1 ${endX} ${boxEdgeY}"
    fill="none" stroke="white" stroke-width="${LW}" />`;
}

export function renderHalfField() {
  return svg`
    <g class="field-markings">
      <!-- Pitch outline (half) -->
      <rect x="0" y="0"
            width="${FIELD_W}" height="${HALF_LENGTH}"
            fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Center circle: bottom half-arc, curving into the defensive half -->
      <path d="M ${cx - CENTER_CIRCLE_R} 0
               A ${CENTER_CIRCLE_R} ${CENTER_CIRCLE_R} 0 0 0 ${cx + CENTER_CIRCLE_R} 0"
            fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Center spot (on the line) -->
      <circle cx="${cx}" cy="0" r="${SPOT_R}" fill="white" />

      <!-- Penalty area -->
      <rect x="${penaltyLeft}" y="${HALF_LENGTH - PENALTY_AREA_DEPTH}"
            width="${PENALTY_AREA_WIDTH}" height="${PENALTY_AREA_DEPTH}"
            fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Goal area -->
      <rect x="${goalAreaLeft}" y="${HALF_LENGTH - GOAL_AREA_DEPTH}"
            width="${GOAL_AREA_WIDTH}" height="${GOAL_AREA_DEPTH}"
            fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Penalty spot -->
      <circle cx="${cx}" cy="${HALF_LENGTH - PENALTY_SPOT_DIST}"
              r="${SPOT_R}" fill="white" />

      <!-- Penalty arc -->
      ${penaltyArc()}

      <!-- Goal -->
      <rect x="${goalLeft}" y="${HALF_LENGTH}"
            width="${GOAL_WIDTH}" height="${GOAL_DEPTH}"
            fill="url(#goal-net)" stroke="white" stroke-width="${LW}" />

      <!-- Corner arcs (bottom two) -->
      <path d="M 0 ${HALF_LENGTH - CORNER_ARC_R}
               A ${CORNER_ARC_R} ${CORNER_ARC_R} 0 0 0 ${CORNER_ARC_R} ${HALF_LENGTH}"
            fill="none" stroke="white" stroke-width="${LW}" />
      <path d="M ${FIELD_W} ${HALF_LENGTH - CORNER_ARC_R}
               A ${CORNER_ARC_R} ${CORNER_ARC_R} 0 0 1 ${FIELD_W - CORNER_ARC_R} ${HALF_LENGTH}"
            fill="none" stroke="white" stroke-width="${LW}" />
    </g>
  `;
}

export const FIELD = { WIDTH: FIELD_W, HALF_LENGTH } as const;
export const PADDING = 3;
