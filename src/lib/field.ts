import { svg } from 'lit';

/**
 * Vertical 2/3 field based on FIFA dimensions (meters → SVG user units).
 * Width = 68m, field length shown = 70m (2/3 of 105m).
 * Origin (0,0) is top-left; cut-off line at y=0, goal at y=70.
 */
const FIELD_W = 68;
const TWO_THIRDS_LENGTH = 70;

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

const HALFWAY_Y = TWO_THIRDS_LENGTH - 52.5;

function penaltyArc() {
  const spotY = TWO_THIRDS_LENGTH - PENALTY_SPOT_DIST;
  const boxEdgeY = TWO_THIRDS_LENGTH - PENALTY_AREA_DEPTH;
  const dy = Math.abs(boxEdgeY - spotY);
  const dx = Math.sqrt(PENALTY_ARC_R ** 2 - dy ** 2);
  const startX = cx - dx;
  const endX   = cx + dx;
  return svg`<path
    d="M ${startX} ${boxEdgeY} A ${PENALTY_ARC_R} ${PENALTY_ARC_R} 0 0 1 ${endX} ${boxEdgeY}"
    fill="none" stroke="white" stroke-width="${LW}" />`;
}

export function renderField() {
  return svg`
    <g class="field-markings">
      <!-- Pitch outline -->
      <rect x="0" y="0"
            width="${FIELD_W}" height="${TWO_THIRDS_LENGTH}"
            fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Halfway line -->
      <line x1="0" y1="${HALFWAY_Y}"
            x2="${FIELD_W}" y2="${HALFWAY_Y}"
            stroke="white" stroke-width="${LW}" />

      <!-- Center circle -->
      <circle cx="${cx}" cy="${HALFWAY_Y}"
              r="${CENTER_CIRCLE_R}"
              fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Center spot -->
      <circle cx="${cx}" cy="${HALFWAY_Y}"
              r="${SPOT_R}" fill="white" />

      <!-- Penalty area -->
      <rect x="${penaltyLeft}" y="${TWO_THIRDS_LENGTH - PENALTY_AREA_DEPTH}"
            width="${PENALTY_AREA_WIDTH}" height="${PENALTY_AREA_DEPTH}"
            fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Goal area -->
      <rect x="${goalAreaLeft}" y="${TWO_THIRDS_LENGTH - GOAL_AREA_DEPTH}"
            width="${GOAL_AREA_WIDTH}" height="${GOAL_AREA_DEPTH}"
            fill="none" stroke="white" stroke-width="${LW}" />

      <!-- Penalty spot -->
      <circle cx="${cx}" cy="${TWO_THIRDS_LENGTH - PENALTY_SPOT_DIST}"
              r="${SPOT_R}" fill="white" />

      <!-- Penalty arc -->
      ${penaltyArc()}

      <!-- Goal -->
      <rect x="${goalLeft}" y="${TWO_THIRDS_LENGTH}"
            width="${GOAL_WIDTH}" height="${GOAL_DEPTH}"
            fill="url(#goal-net)" stroke="white" stroke-width="${LW}" />

      <!-- Corner arcs (bottom two) -->
      <path d="M 0 ${TWO_THIRDS_LENGTH - CORNER_ARC_R}
               A ${CORNER_ARC_R} ${CORNER_ARC_R} 0 0 1 ${CORNER_ARC_R} ${TWO_THIRDS_LENGTH}"
            fill="none" stroke="white" stroke-width="${LW}" />
      <path d="M ${FIELD_W} ${TWO_THIRDS_LENGTH - CORNER_ARC_R}
               A ${CORNER_ARC_R} ${CORNER_ARC_R} 0 0 0 ${FIELD_W - CORNER_ARC_R} ${TWO_THIRDS_LENGTH}"
            fill="none" stroke="white" stroke-width="${LW}" />
    </g>
  `;
}

export const FIELD = { WIDTH: FIELD_W, LENGTH: TWO_THIRDS_LENGTH } as const;
export const PADDING = 3;
