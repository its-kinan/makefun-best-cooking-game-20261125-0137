// The Copper Ladle — input: keyboard and mouse, one shape.
// The loop reads direction() every frame and takeInteract() once per press.
// A mouse click sets a walk target (click-to-move) or, when the chef already
// stands by that station, interacts with it at once.
import { FIELD } from './config.js';
import { STATIONS, distanceToRect } from './kitchen.js';

export function createInput(canvas) {
  const keys = new Set();
  let interactQueued = false;
  let click = null;

  function key(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = key(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    keys.add(k);
    if (k === 'e' || k === ' ') interactQueued = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(key(e)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * FIELD.width;
    const y = ((e.clientY - rect.top) / rect.height) * FIELD.height;
    click = { x, y };
  });

  return {
    keys,
    takeInteract() {
      const v = interactQueued;
      interactQueued = false;
      return v;
    },
    takeClick() {
      const v = click;
      click = null;
      return v;
    },
    /** -1/0/1 per axis from the held keys. */
    direction() {
      let dx = 0;
      let dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      return { dx, dy };
    },
    isDown(k) {
      return keys.has(k);
    },
  };
}

/**
 * Turn a click into movement: when the click lands on a station the chef
 * already stands beside, it is an interact; otherwise it is a walk target.
 * Returns {interact} or sets state.moveTarget. Pure helper, tested by hand.
 */
export function handleClick(state, point) {
  for (const s of Object.values(STATIONS)) {
    if (s.kind === 'sink') continue;
    const inside =
      point.x >= s.x && point.x <= s.x + s.w && point.y >= s.y && point.y <= s.y + s.h;
    if (inside && distanceToRect(state.chef.x, state.chef.y, s) < 58) return { interact: true };
  }
  state.moveTarget = { x: point.x, y: point.y };
  return { interact: false };
}

/** Steering toward the walk target: null when arrived or none set. */
export function moveTargetDirection(state) {
  const t = state.moveTarget;
  if (!t) return null;
  const dx = t.x - state.chef.x;
  const dy = t.y - state.chef.y;
  if (Math.hypot(dx, dy) < 10) {
    state.moveTarget = null;
    return null;
  }
  return { dx, dy };
}
