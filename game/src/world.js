// The Copper Ladle — world: the whole game state and its rules.
// Pure logic, no DOM, no clock: step() advances a fixed 1/60 s slice and
// returns an event bitmask. The renderer and the tests both read this state.
//
// Hands hold exactly one thing: an ingredient, a plate (with items inside),
// or nothing. Stations hold their own items. Every action is one press of
// interact at the nearest station in range.
import {
  BURNER_DISHES, CHEF_RADIUS, CHEF_SPEED, CHOPS_NEEDED, DAYS, DAY_SECONDS,
  FIELD, HUD_HEIGHT, INGREDIENTS, INTERACT_RANGE, MAX_HEARTS,
  PATTY_BURN_SECONDS, PATTY_COOK_SECONDS, PLATE_CAPACITY, RECIPES, STEP,
} from './config.js';
import { createRandom } from './random.js';
import { FLOOR, SOLIDS, STATIONS, distanceToRect, nearestBin } from './kitchen.js';
import { createBoard, stepOrders, resetTicketIds } from './orders.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_CHOP = 2;
export const EVENT_COOKED = 4;
export const EVENT_BURNT = 8;
export const EVENT_SERVED = 16;
export const EVENT_FAILED = 32;
export const EVENT_DAY_END = 64;
export const EVENT_OVER = 128;
export const EVENT_WIN = 256;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DAY = 'day';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const START_X = FIELD.width / 2;
const START_Y = 430;

function item(kind, state) {
  return { kind, state };
}

function plateItem(plate, kind, state) {
  return plate && plate.kind === 'plate' && plate.items.some((i) => i.kind === kind && i.state === state);
}

/** True when a plate's contents are exactly a recipe's needs, any order. */
export function plateMatches(plate, recipeId) {
  if (!plate || plate.kind !== 'plate') return false;
  const needs = RECIPES[recipeId].needs;
  if (plate.items.length !== needs.length) return false;
  const have = plate.items.map((i) => `${i.kind}:${i.state}`).sort().join('|');
  const want = needs.map((n) => `${n.kind}:${n.state}`).sort().join('|');
  return have === want;
}

/** The open ticket a plate completes, or null. */
export function matchingTicket(state, plate) {
  for (const t of state.board.tickets) {
    if (plateMatches(plate, t.recipe)) return t;
  }
  return null;
}

/** What a burner pile is cooking: a dish id, 'patty', or null. Only the
 *  uncooked shapes convert: a raw patty, or a pair that names a dish. */
function burnerDish(burner) {
  if (burner.items.length === 1 && burner.items[0].kind === 'patty' && burner.items[0].state === 'raw') return 'patty';
  if (burner.items.length !== 2) return null;
  const key = burner.items.map((i) => i.kind).sort().join('+');
  return BURNER_DISHES[key] ? key : null;
}

/**
 * The cook/burn window for what sits on the burner. A cooked item keeps
 * its window open — leave a finished patty or pot on the heat and it
 * still burns. A lone chopped vegetable or an invalid pair has no window
 * and never cooks.
 */
function burnerTimes(burner) {
  if (burner.items.length === 1) {
    const it = burner.items[0];
    if (it.kind === 'patty' && (it.state === 'raw' || it.state === 'cooked')) {
      return { cook: PATTY_COOK_SECONDS, burn: PATTY_BURN_SECONDS };
    }
    if (it.kind === 'soup' && it.state === 'cooked') return { cook: 6, burn: 11 };
    if (it.kind === 'melt' && it.state === 'cooked') return { cook: 6, burn: 11 };
    return null;
  }
  if (burner.items.length === 2) {
    const key = burner.items.map((i) => i.kind).sort().join('+');
    const dish = BURNER_DISHES[key];
    return dish ? { cook: dish.cookSeconds, burn: dish.burnSeconds } : null;
  }
  return null;
}

function spawnParticle(state, x, y, kind) {
  state.particles.push({ x, y, kind, life: 0.6, age: 0 });
  if (state.particles.length > 90) state.particles.splice(0, state.particles.length - 90);
}

function popup(state, x, y, text, color) {
  state.popups.push({ x, y, text, color, life: 1.1, age: 0 });
  if (state.popups.length > 24) state.popups.shift();
}

export function createWorld(seed) {
  resetTicketIds();
  const rng = createRandom(seed);
  const state = {
    seed,
    rng,
    screen: SCREEN_TITLE,
    time: 0,
    day: 1,
    dayTime: 0,
    coins: 0,
    target: DAYS[0].target,
    hearts: MAX_HEARTS,
    combo: 0,
    served: 0,
    failed: 0,
    earnedToday: 0,
    chef: { x: START_X, y: START_Y, dir: 1, moving: false, holding: null },
    moveTarget: null,
    boards: [{ item: null, chops: 0 }, { item: null, chops: 0 }],
    burners: [{ items: [], progress: 0 }, { items: [], progress: 0 }],
    platesLeft: 6,
    plating: null,
    board: createBoard(),
    particles: [],
    popups: [],
    flash: null,
    dayResult: null,
  };
  return state;
}

export function resetWorld(state) {
  const fresh = createWorld(state.seed);
  for (const k of Object.keys(fresh)) state[k] = fresh[k];
  state.screen = SCREEN_PLAY;
}

/** Push the chef out of solid rectangles and clamp to the floor. */
function collide(state) {
  const c = state.chef;
  c.x = Math.max(FLOOR.x + CHEF_RADIUS, Math.min(FLOOR.x + FLOOR.w - CHEF_RADIUS, c.x));
  c.y = Math.max(FLOOR.y + CHEF_RADIUS, Math.min(FLOOR.y + FLOOR.h - CHEF_RADIUS, c.y));
  for (const s of SOLIDS) {
    const nx = Math.max(s.x, Math.min(c.x, s.x + s.w));
    const ny = Math.max(s.y, Math.min(c.y, s.y + s.h));
    const dx = c.x - nx;
    const dy = c.y - ny;
    const d = Math.hypot(dx, dy);
    if (d < CHEF_RADIUS && d > 0.001) {
      c.x = nx + (dx / d) * CHEF_RADIUS;
      c.y = ny + (dy / d) * CHEF_RADIUS;
    } else if (d <= 0.001) {
      c.y = s.y + s.h + CHEF_RADIUS;
    }
  }
}

function moveChef(state, dx, dy, dt) {
  const c = state.chef;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) {
    c.moving = false;
    return;
  }
  c.moving = true;
  c.x += (dx / len) * CHEF_SPEED * dt;
  c.y += (dy / len) * CHEF_SPEED * dt;
  if (Math.abs(dx) > 0.1) c.dir = dx > 0 ? 1 : -1;
  collide(state);
}

function nearestStation(state) {
  const c = state.chef;
  let best = null;
  let bestD = INTERACT_RANGE;
  for (const [name, s] of Object.entries(STATIONS)) {
    if (name === 'sink') continue;
    const d = distanceToRect(c.x, c.y, s);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function cookableInHand(held) {
  if (!held || held.kind === 'plate') return false;
  const def = INGREDIENTS[held.kind];
  if (!def || !def.cook) return false;
  if (held.kind === 'patty') return held.state === 'raw';
  return held.state === 'chopped' || held.kind === 'cheese';
}

function choppableInHand(held) {
  if (!held || held.kind === 'plate') return false;
  const def = INGREDIENTS[held.kind];
  return !!def && def.chop && held.state === 'raw';
}

function servePlate(state, ticket) {
  const c = state.chef;
  const plate = c.holding;
  const tip = Math.round((ticket.price * 0.5 * ticket.patience) / ticket.maxPatience);
  const comboBonus = Math.min(state.combo * 2, 10);
  const earned = ticket.price + tip + comboBonus;
  state.coins += earned;
  state.earnedToday += earned;
  state.served += 1;
  state.combo += 1;
  state.board.tickets = state.board.tickets.filter((t) => t.id !== ticket.id);
  c.holding = null;
  state.platesLeft += 1;
  popup(state, STATIONS.window.cx - 40, STATIONS.window.y - 14, `+${earned} coins`, '#ffd166');
  spawnParticle(state, STATIONS.window.cx, STATIONS.window.cy, 'ding');
  return EVENT_SERVED;
}

function failOrder(state, ticketId) {
  state.hearts -= 1;
  state.failed += 1;
  state.combo = 0;
  state.flash = { color: '#e5484d', age: 0, life: 0.5 };
  popup(state, FIELD.width / 2 - 60, HUD_HEIGHT + 30, 'Order missed!', '#e5484d');
  if (state.hearts <= 0) {
    state.screen = SCREEN_OVER;
    return EVENT_FAILED | EVENT_OVER;
  }
  return EVENT_FAILED;
}

/**
 * The interact press: use the nearest station in range. Returns events.
 * One press does exactly one thing, so the player plans a route, not a mash.
 */
export function interact(state) {
  const c = state.chef;
  const station = nearestStation(state);
  if (!station) return EVENT_NONE;
  const held = c.holding;

  if (station.kind === 'pantry') {
    const bin = nearestBin(c.x, c.y, INTERACT_RANGE);
    if (bin && !held) {
      c.holding = item(bin.kind, 'raw');
      spawnParticle(state, bin.cx, bin.cy + 20, 'pick');
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }

  if (station.kind === 'board') {
    const board = state.boards[station.index];
    if (!board.item && choppableInHand(held)) {
      board.item = held;
      board.chops = 0;
      c.holding = null;
      return EVENT_PICKUP;
    }
    if (board.item && !held) {
      if (board.item.state === 'raw') {
        board.chops += 1;
        spawnParticle(state, station.cx, station.cy + 10, 'chop');
        if (board.chops >= CHOPS_NEEDED) board.item.state = 'chopped';
        return EVENT_CHOP;
      }
      c.holding = board.item;
      board.item = null;
      board.chops = 0;
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }

  if (station.kind === 'burner') {
    const burner = state.burners[station.index];
    if (held && cookableInHand(held) && burner.items.length < 2 && burner.progress === 0) {
      burner.items.push(held);
      burner.done = false;
      burner.burnt = false;
      c.holding = null;
      return EVENT_PICKUP;
    }
    if (!held && burner.items.length > 0) {
      c.holding = burner.items.pop();
      burner.progress = 0;
      burner.done = false;
      burner.burnt = false;
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }

  if (station.kind === 'plates') {
    if (!held && state.platesLeft > 0) {
      state.platesLeft -= 1;
      c.holding = { kind: 'plate', items: [] };
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }

  if (station.kind === 'plating') {
    if (!state.plating && held && held.kind === 'plate') {
      state.plating = held;
      c.holding = null;
      return EVENT_PICKUP;
    }
    if (state.plating && held && held.kind !== 'plate' && state.plating.items.length < PLATE_CAPACITY) {
      state.plating.items.push(held);
      c.holding = null;
      spawnParticle(state, station.cx, station.cy + 10, 'plate');
      return EVENT_PICKUP;
    }
    if (state.plating && !held) {
      c.holding = state.plating;
      state.plating = null;
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }

  if (station.kind === 'window') {
    if (held && held.kind === 'plate') {
      const ticket = matchingTicket(state, held);
      if (ticket) return servePlate(state, ticket);
      popup(state, STATIONS.window.cx - 70, STATIONS.window.y - 14, 'No order wants this!', '#e5484d');
      return EVENT_FAILED;
    }
    return EVENT_NONE;
  }

  if (station.kind === 'bin') {
    if (held) {
      if (held.kind === 'plate') state.platesLeft += 1;
      c.holding = null;
      spawnParticle(state, station.cx, station.cy, 'bin');
      return EVENT_PICKUP;
    }
    return EVENT_NONE;
  }
  return EVENT_NONE;
}

function stepBurners(state, dt) {
  let events = EVENT_NONE;
  state.burners.forEach((burner, index) => {
    const station = index === 0 ? STATIONS.burnerA : STATIONS.burnerB;
    const times = burnerTimes(burner);
    if (!times) {
      burner.progress = 0;
      burner.done = false;
      return;
    }
    burner.progress += dt;
    if (burner.progress >= times.burn) {
      // Whatever was cooking is ruined: one burnt item, timer reset.
      burner.items = [{ kind: burner.items[0].kind, state: 'burnt' }];
      burner.progress = 0;
      burner.done = false;
      burner.burnt = true;
      events |= EVENT_BURNT;
      popup(state, station.cx - 30, station.y - 16, 'Burnt!', '#e5484d');
    } else if (burner.progress >= times.cook && !burner.done) {
      burner.done = true;
      const dish = burnerDish(burner);
      if (dish === 'patty') burner.items = [item('patty', 'cooked')];
      else burner.items = [item(BURNER_DISHES[dish].kind, 'cooked')];
      events |= EVENT_COOKED;
      spawnParticle(state, station.cx, station.cy, 'steam');
    }
  });
  return events;
}

/**
 * Advance the world one fixed step. `input` is {dx, dy, interact} for this
 * slice; click-to-move targets are resolved by the caller into dx/dy.
 */
export function step(state, input, dt = STEP) {
  let events = EVENT_NONE;
  state.time += dt;
  if (state.screen !== SCREEN_PLAY) return events;
  state.dayTime += dt;

  if (input) {
    moveChef(state, input.dx || 0, input.dy || 0, dt);
    if (input.interact) events |= interact(state);
  }

  events |= stepBurners(state, dt);

  const expired = stepOrders(state.board, state.day, dt, state.rng, state.time);
  for (const id of expired) events |= failOrder(state, id);
  if (state.screen !== SCREEN_PLAY) return events;

  for (const p of state.particles) p.age += dt;
  state.particles = state.particles.filter((p) => p.age < p.life);
  for (const p of state.popups) p.age += dt;
  state.popups = state.popups.filter((p) => p.age < p.life);
  if (state.flash) {
    state.flash.age += dt;
    if (state.flash.age >= state.flash.life) state.flash = null;
  }

  if (state.dayTime >= DAY_SECONDS) {
    const cfg = DAYS[state.day - 1];
    const met = state.coins >= cfg.target;
    state.dayResult = { day: state.day, met, coins: state.coins, target: cfg.target, served: state.served };
    if (!met) {
      state.screen = SCREEN_OVER;
      return events | EVENT_DAY_END | EVENT_OVER;
    }
    if (state.day >= DAYS.length) {
      state.screen = SCREEN_WIN;
      return events | EVENT_DAY_END | EVENT_WIN;
    }
    state.screen = SCREEN_DAY;
    return events | EVENT_DAY_END;
  }
  return events;
}

/** Start the next day after the day-complete screen. */
export function nextDay(state) {
  state.day += 1;
  state.dayTime = 0;
  state.earnedToday = 0;
  state.target = DAYS[state.day - 1].target;
  state.board = createBoard();
  state.boards = [{ item: null, chops: 0 }, { item: null, chops: 0 }];
  state.burners = [{ items: [], progress: 0 }, { items: [], progress: 0 }];
  state.plating = null;
  state.chef.holding = null;
  state.chef.x = START_X;
  state.chef.y = START_Y;
  state.platesLeft = 6;
  state.screen = SCREEN_PLAY;
}

/** Stars for the win screen: 1 per day target beaten by 25 coins. */
export function winStars(state) {
  const over = state.coins - DAYS[DAYS.length - 1].target;
  if (over >= 75) return 3;
  if (over >= 40) return 2;
  return 1;
}
