// The Copper Ladle — render: everything the player sees, drawn on canvas.
// Warm diner palette, chunky readable shapes: every ingredient is a distinct
// silhouette and colour at a glance, tickets carry the recipe's icons and a
// patience bar, the day timer and coin target sit in the top bar. No images,
// no fonts from the network — system fonts and vector food only.
import {
  DAY_SECONDS, FIELD, HUD_HEIGHT, INGREDIENTS, RECIPES,
} from './config.js';
import { PANTRY_BINS, STATIONS } from './kitchen.js';
import {
  SCREEN_DAY, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
  matchingTicket, winStars,
} from './world.js';

export { SCREEN_DAY, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN };

const CREAM = '#f7ead7';
const WOOD = '#8a5a33';
const WOOD_DARK = '#6d4426';
const TILE_A = '#e8d3ae';
const TILE_B = '#dfc294';
const INK = '#2b1d12';
const RED = '#e5484d';
const GREEN = '#4d9e3f';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = '700') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

/** One ingredient drawn at (x, y) with radius r, in its current state. */
export function drawIngredient(ctx, kind, state, x, y, r) {
  const def = INGREDIENTS[kind] || { color: '#ccc', dark: '#999', name: kind };
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.4);
    ctx.lineTo(r * 0.4, r * 0.5);
    ctx.moveTo(r * 0.5, -r * 0.5);
    ctx.lineTo(-r * 0.4, r * 0.4);
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (kind === 'tomato') {
    ctx.fillStyle = state === 'chopped' ? '#f2665e' : def.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d8a32';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.75, r * 0.4, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'chopped') {
      ctx.strokeStyle = '#ffd9d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(r * 0.6, 0);
      ctx.stroke();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = def.color;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#7ed06a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'onion') {
    ctx.fillStyle = '#efe6f7';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2.5;
    for (const rr2 of [0.7, 0.4]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * rr2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (kind === 'mushroom') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, -r * 0.15, r * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.45, r * 0.18, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.6, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e6c8';
    ctx.fillRect(-r * 0.22, -r * 0.1, r * 0.44, r * 0.85);
  } else if (kind === 'cheese') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.lineTo(r, r * 0.6);
    ctx.lineTo(r * 0.2, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.arc(-r * 0.25, r * 0.2, r * 0.14, 0, Math.PI * 2);
    ctx.arc(r * 0.35, r * 0.25, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'bread') {
    ctx.fillStyle = def.color;
    rr(ctx, -r, -r * 0.7, r * 2, r * 1.4, r * 0.5);
    ctx.fill();
    ctx.fillStyle = '#f3d9a8';
    rr(ctx, -r * 0.7, -r * 0.45, r * 1.4, r * 0.9, r * 0.35);
    ctx.fill();
  } else if (kind === 'patty') {
    ctx.fillStyle = state === 'cooked' ? '#6d4426' : def.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state === 'cooked' ? '#4a2c17' : def.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.2);
    ctx.lineTo(r * 0.5, -r * 0.3);
    ctx.moveTo(-r * 0.4, r * 0.35);
    ctx.lineTo(r * 0.6, r * 0.2);
    ctx.stroke();
  } else if (kind === 'soup' || kind === 'melt') {
    // A cooked dish rides in a little copper pot.
    ctx.fillStyle = '#b87333';
    rr(ctx, -r, -r * 0.5, r * 2, r * 1.2, r * 0.3);
    ctx.fill();
    ctx.fillStyle = kind === 'soup' ? '#e5484d' : '#f5c542';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.5, r * 0.85, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2b1d12';
    ctx.font = `700 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(kind === 'soup' ? 'S' : 'M', 0, r * 0.15);
  }
  ctx.restore();
}

function drawPlate(ctx, plate, x, y, r) {
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9bfa8';
  ctx.lineWidth = 2;
  ctx.stroke();
  if (!plate) return;
  const n = plate.items.length;
  plate.items.forEach((it, i) => {
    const ox = n === 1 ? 0 : (i - (n - 1) / 2) * r * 0.55;
    drawIngredient(ctx, it.kind, it.state, x + ox, y - 4, r * 0.42);
  });
}

function drawStation(ctx, s, highlight) {
  ctx.fillStyle = WOOD;
  rr(ctx, s.x, s.y, s.w, s.h, 8);
  ctx.fill();
  ctx.fillStyle = WOOD_DARK;
  rr(ctx, s.x, s.y, s.w, 10, 5);
  ctx.fill();
  if (highlight) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    rr(ctx, s.x - 2, s.y - 2, s.w + 4, s.h + 4, 10);
    ctx.stroke();
  }
  text(ctx, s.label, s.cx, s.y + s.h - 12, 11, '#f7ead7', 'center');
}

function drawBoard(ctx, board, station, highlight) {
  drawStation(ctx, station, highlight);
  ctx.fillStyle = '#f3e6c8';
  rr(ctx, station.x + 10, station.y + 6, station.w - 20, 26, 4);
  ctx.fill();
  if (board.item) {
    drawIngredient(ctx, board.item.kind, board.item.state, station.cx, station.y + 19, 13);
    if (board.item.state === 'raw') {
      ctx.fillStyle = '#2b1d12';
      ctx.fillRect(station.x + 14, station.y + 36, (station.w - 28) * (board.chops / 3), 5);
    }
  }
}

function drawBurner(ctx, burner, station, highlight) {
  drawStation(ctx, station, highlight);
  const cx = station.cx;
  const cy = station.y + 19;
  ctx.fillStyle = '#3a3a3a';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.stroke();
  if (burner.items.length > 0) {
    const it = burner.items[0];
    const done = burner.done;
    if (burner.items.length === 2) {
      drawIngredient(ctx, burner.items[0].kind, burner.items[0].state, cx - 9, cy - 3, 10);
      drawIngredient(ctx, burner.items[1].kind, burner.items[1].state, cx + 9, cy - 3, 10);
    } else {
      drawIngredient(ctx, it.kind, it.state, cx, cy - 3, 12);
    }
    if (it.state !== 'burnt' && !done && burner.progress > 0) {
      ctx.fillStyle = '#2b1d12';
      ctx.fillRect(station.x + 12, station.y + 38, station.w - 24, 5);
      ctx.fillStyle = '#ff9f1c';
      const frac = Math.min(burner.progress / 8, 1);
      ctx.fillRect(station.x + 12, station.y + 38, (station.w - 24) * frac, 5);
    }
    if (done) {
      // A dark chip over the station label so READY stays readable.
      ctx.fillStyle = '#2b1d12';
      rr(ctx, station.x + 28, station.y + 41, station.w - 56, 13, 4);
      ctx.fill();
      ctx.fillStyle = '#7ed06a';
      ctx.font = '700 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('READY', cx, station.y + 48);
    }
  }
}

function drawChef(ctx, chef) {
  const { x, y } = chef;
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body + apron.
  ctx.fillStyle = '#f4f1ea';
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f7d4e';
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.quadraticCurveTo(0, 6, 13, -2);
  ctx.lineTo(13, 14);
  ctx.quadraticCurveTo(0, 20, -13, 14);
  ctx.closePath();
  ctx.fill();
  // Head + hat.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -14, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fdfdf8';
  ctx.beginPath();
  ctx.arc(-7, -24, 7, 0, Math.PI * 2);
  ctx.arc(0, -27, 8, 0, Math.PI * 2);
  ctx.arc(7, -24, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-11, -26, 22, 5);
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#2b1d12';
  ctx.beginPath();
  ctx.arc(chef.dir * 3 - 4, -15, 1.8, 0, Math.PI * 2);
  ctx.arc(chef.dir * 3 + 4, -15, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Held item floats above the hat.
  if (chef.holding) {
    const h = chef.holding;
    if (h.kind === 'plate') drawPlate(ctx, h, x, y - 46, 20);
    else drawIngredient(ctx, h.kind, h.state, x, y - 44, 14);
  }
}

function drawTicket(ctx, t, x, y, w) {
  const frac = Math.max(t.patience / t.maxPatience, 0);
  const urgent = frac < 0.3;
  const nameSize = w <= 150 ? 12 : 13;
  const iconGap = w <= 150 ? 30 : 34;
  const iconR = w <= 150 ? 12 : 13;
  ctx.fillStyle = urgent ? '#ffe1de' : '#fff8e7';
  rr(ctx, x, y, w, 62, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? RED : '#d9c49a';
  ctx.lineWidth = urgent ? 3 : 2;
  rr(ctx, x, y, w, 62, 8);
  ctx.stroke();
  text(ctx, t.name, x + 10, y + 14, nameSize, INK);
  text(ctx, `$${t.price}`, x + w - 10, y + 14, nameSize, '#8a5a33', 'right');
  t.needs.forEach((n, i) => {
    drawIngredient(ctx, n.kind, n.state, x + 24 + i * iconGap, y + 40, iconR);
  });
  ctx.fillStyle = '#e5d5b3';
  ctx.fillRect(x + 10, y + 54, w - 20, 5);
  ctx.fillStyle = urgent ? RED : '#ff9f1c';
  ctx.fillRect(x + 10, y + 54, (w - 20) * frac, 5);
}

function drawHUD(ctx, state, best) {
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(0, 0, FIELD.width, HUD_HEIGHT);
  text(ctx, 'THE COPPER LADLE', 20, 22, 22, '#ffd166');
  text(ctx, `Day ${state.day} / 3`, 20, 50, 14, CREAM);
  const dayFrac = Math.min(state.dayTime / DAY_SECONDS, 1);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(110, 42, 120, 10);
  ctx.fillStyle = dayFrac > 0.85 ? RED : '#ffd166';
  ctx.fillRect(110, 42, 120 * (1 - dayFrac), 10);
  text(ctx, `Shift ${Math.max(0, Math.ceil(DAY_SECONDS - state.dayTime))}s`, 240, 48, 13, CREAM);
  // Coins + target.
  text(ctx, `Coins ${state.coins}`, 340, 26, 18, '#ffd166');
  const tFrac = Math.min(state.coins / state.target, 1);
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(340, 38, 120, 10);
  ctx.fillStyle = GREEN;
  ctx.fillRect(340, 38, 120 * tFrac, 10);
  text(ctx, `Target ${state.target}`, 468, 44, 13, CREAM);
  // Hearts.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < state.hearts ? RED : '#5a4632';
    ctx.beginPath();
    ctx.arc(566 + i * 28, 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, `Combo x${state.combo}`, 340, 64, 13, state.combo > 1 ? '#ffd166' : '#c9bfa8');
  text(ctx, `Best ${best}`, 470, 64, 13, '#c9bfa8');
}

function drawTickets(ctx, state) {
  const n = state.board.tickets.length;
  if (n === 0) {
    text(ctx, 'No orders yet — the board fills up fast!', 900, 38, 14, '#c9bfa8');
    return;
  }
  // Tickets shrink to fit the top-right: wide for one or two, narrow for
  // three or four, always ending 16px from the right edge and never
  // covering the HUD text, which ends at x=640.
  const w = n <= 2 ? 190 : 150;
  const gap = 8;
  const total = n * w + (n - 1) * gap;
  let x = Math.max(FIELD.width - 16 - total, 640);
  state.board.tickets.forEach((t) => {
    drawTicket(ctx, t, x, 6, w);
    x += w + gap;
  });
}

function drawFloor(ctx) {
  for (let ty = 0; ty < 9; ty += 1) {
    for (let tx = 0; tx < 16; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? TILE_A : TILE_B;
      ctx.fillRect(16 + tx * 80, HUD_HEIGHT + 8 + ty * 66, 80, 66);
    }
  }
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const a = 1 - p.age / p.life;
    ctx.globalAlpha = a;
    if (p.kind === 'chop') {
      ctx.fillStyle = '#7ed06a';
      ctx.beginPath();
      ctx.arc(p.x + (p.age * 40 - 12), p.y - p.age * 30, 4, 0, Math.PI * 2);
      ctx.arc(p.x - (p.age * 40 - 12), p.y - p.age * 30, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'steam') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.age * 40, 6 + p.age * 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'ding') {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 10 + p.age * 30, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(p.x, p.y - p.age * 24, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawPopups(ctx, state) {
  for (const p of state.popups) {
    ctx.globalAlpha = Math.max(1 - p.age / p.life, 0);
    text(ctx, p.text, p.x, p.y - p.age * 30, 20, p.color);
  }
  ctx.globalAlpha = 1;
}

function overlay(ctx, title, lines, accent) {
  const h = 186 + (lines.length - 1) * 36;
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.fillStyle = '#fff8e7';
  rr(ctx, FIELD.width / 2 - 330, 150, 660, h, 16);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  rr(ctx, FIELD.width / 2 - 330, 150, 660, h, 16);
  ctx.stroke();
  text(ctx, title, FIELD.width / 2, 205, 40, INK, 'center');
  lines.forEach((l, i) => {
    text(ctx, l, FIELD.width / 2, 260 + i * 36, 19, '#5a4632', 'center', '600');
  });
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawFloor(ctx);
    // Counters and stations.
    for (const bin of PANTRY_BINS) {
      ctx.fillStyle = '#a5763f';
      rr(ctx, bin.x, bin.y, bin.w, bin.h, 8);
      ctx.fill();
      drawIngredient(ctx, bin.kind, 'raw', bin.cx, bin.y + 20, 14);
      text(ctx, INGREDIENTS[bin.kind].name, bin.cx, bin.y + bin.h - 11, 10, '#fff8e7', 'center');
    }
    drawBoard(ctx, state.boards[0], STATIONS.boardA, false);
    drawBoard(ctx, state.boards[1], STATIONS.boardB, false);
    // Plate stack.
    drawStation(ctx, STATIONS.plates, false);
    for (let i = 0; i < Math.min(state.platesLeft, 5); i += 1) {
      ctx.fillStyle = '#fdfdf8';
      ctx.beginPath();
      ctx.ellipse(STATIONS.plates.cx, STATIONS.plates.y + 18 - i * 3, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9bfa8';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    text(ctx, `x${state.platesLeft}`, STATIONS.plates.cx, STATIONS.plates.y + 34, 11, '#fff8e7', 'center');
    // Plating counter with its plate.
    drawStation(ctx, STATIONS.plating, false);
    if (state.plating) drawPlate(ctx, state.plating, STATIONS.plating.cx, STATIONS.plating.y + 22, 30);
    drawBurner(ctx, state.burners[0], STATIONS.burnerA, false);
    drawBurner(ctx, state.burners[1], STATIONS.burnerB, false);
    // Serving window.
    drawStation(ctx, STATIONS.window, false);
    ctx.fillStyle = '#2b1d12';
    ctx.beginPath();
    ctx.arc(STATIONS.window.cx, STATIONS.window.cy - 18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(STATIONS.window.cx, STATIONS.window.cy - 18, 10, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, 'RING', STATIONS.window.cx, STATIONS.window.cy + 22, 12, '#fff8e7', 'center');
    // Bin + sink (decor).
    drawStation(ctx, STATIONS.bin, false);
    ctx.fillStyle = '#3a3a3a';
    rr(ctx, STATIONS.bin.x + 12, STATIONS.bin.y + 8, STATIONS.bin.w - 24, 30, 4);
    ctx.fill();
    drawStation(ctx, STATIONS.sink, false);
    ctx.fillStyle = '#9ecfe8';
    rr(ctx, STATIONS.sink.x + 12, STATIONS.sink.y + 8, STATIONS.sink.w - 24, 30, 6);
    ctx.fill();

    drawChef(ctx, state.chef);
    drawParticles(ctx, state);
    drawPopups(ctx, state);
    drawHUD(ctx, state, best);
    drawTickets(ctx, state);

    if (state.flash) {
      ctx.globalAlpha = Math.max(0.35 * (1 - state.flash.age / state.flash.life), 0);
      ctx.fillStyle = state.flash.color;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.globalAlpha = 1;
    }

    if (screen === SCREEN_TITLE) {
      overlay(ctx, 'THE COPPER LADLE', [
        'A tiny kitchen. A full board. No mercy.',
        'WASD / arrows to move — E or click to grab, chop, cook, plate, serve.',
        'Fill every ticket before its patience runs out.',
        'Three days. Reach the coin target each day to stay open.',
        'Press SPACE or click to start cooking.',
      ], '#ffd166');
    } else if (screen === SCREEN_PAUSED) {
      overlay(ctx, 'PAUSED', ['The tickets wait for no one. Well — right now they do.', 'Press P or SPACE to get back to the pass.'], '#9ecfe8');
    } else if (screen === SCREEN_DAY) {
      const r = state.dayResult;
      overlay(ctx, `DAY ${r.day} COMPLETE`, [
        `Coins banked: ${r.coins} (target was ${r.target})`,
        `Orders served: ${r.served} — the board gets busier tomorrow.`,
        'Press SPACE for the next shift.',
      ], GREEN);
    } else if (screen === SCREEN_OVER) {
      overlay(ctx, 'SERVICE OVER', [
        `Day ${state.day} — ${state.coins} coins, ${state.served} orders served.`,
        state.hearts <= 0 ? 'Too many tickets walked out the door.' : 'The day target slipped away.',
        'Press SPACE to try the shift again.',
      ], RED);
    } else if (screen === SCREEN_WIN) {
      const stars = winStars(state);
      overlay(ctx, 'THREE DAYS DONE!', [
        `Final till: ${state.coins} coins over ${state.served} orders served.`,
        `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  The Copper Ladle stays open — you ran it.`,
        'Press SPACE to cook it all again.',
      ], '#ffd166');
    }
  }

  return { draw };
}
