// The Copper Ladle — kitchen: the room's fixed geometry.
// Every station is a rectangle on the 1280x720 floor. The chef collides
// with them and interacts with the nearest one in range; the renderer draws
// them from this same list, so layout and logic can never drift apart.
import { FIELD, HUD_HEIGHT } from './config.js';

// Counter band along the top wall, stove band along the bottom, serving
// window on the right wall, bin bottom-left. The middle stays open floor
// so the chef can plan a route between stations.
const TOP = HUD_HEIGHT + 14;
const COUNTER_H = 56;
const BOTTOM = FIELD.height - 16 - COUNTER_H;

function rect(x, y, w, h) {
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

export const PANTRY_BINS = [
  'tomato', 'lettuce', 'onion', 'mushroom', 'cheese', 'bread', 'patty',
].map((kind, i) => ({ kind, ...rect(24 + i * 78, TOP, 70, COUNTER_H) }));

export const STATIONS = {
  pantry: { kind: 'pantry', label: 'PANTRY', ...rect(24, TOP, 7 * 78 - 8, COUNTER_H) },
  boardA: { kind: 'board', label: 'CHOP', index: 0, ...rect(600, TOP, 118, COUNTER_H) },
  boardB: { kind: 'board', label: 'CHOP', index: 1, ...rect(734, TOP, 118, COUNTER_H) },
  plates: { kind: 'plates', label: 'PLATES', ...rect(888, TOP, 92, COUNTER_H) },
  plating: { kind: 'plating', label: 'PLATE UP', ...rect(996, TOP, 150, COUNTER_H) },
  window: { kind: 'window', label: 'SERVE', ...rect(FIELD.width - 118, 240, 102, 150) },
  burnerA: { kind: 'burner', label: 'STOVE', index: 0, ...rect(700, BOTTOM, 130, COUNTER_H) },
  burnerB: { kind: 'burner', label: 'STOVE', index: 1, ...rect(846, BOTTOM, 130, COUNTER_H) },
  bin: { kind: 'bin', label: 'BIN', ...rect(24, BOTTOM, 110, COUNTER_H) },
  sink: { kind: 'sink', label: 'SINK', ...rect(150, BOTTOM, 150, COUNTER_H) },
};

// Everything solid the chef bumps into: the counters, the window wall and
// the sink. The bin is low enough to lean over, so it is not solid.
export const SOLIDS = [
  STATIONS.pantry, STATIONS.boardA, STATIONS.boardB, STATIONS.plates,
  STATIONS.plating, STATIONS.window, STATIONS.burnerA, STATIONS.burnerB,
  STATIONS.sink,
];

export const FLOOR = {
  x: 16, y: HUD_HEIGHT + 8, w: FIELD.width - 32, h: FIELD.height - HUD_HEIGHT - 24,
};

/** Distance from a point to the closest point of a rectangle (0 inside). */
export function distanceToRect(px, py, r) {
  const dx = Math.max(r.x - px, 0, px - (r.x + r.w));
  const dy = Math.max(r.y - py, 0, py - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** The pantry bin nearest a point, or null when none is in reach. */
export function nearestBin(px, py, range) {
  let best = null;
  let bestD = range;
  for (const bin of PANTRY_BINS) {
    const d = distanceToRect(px, py, bin);
    if (d < bestD) {
      bestD = d;
      best = bin;
    }
  }
  return best;
}
