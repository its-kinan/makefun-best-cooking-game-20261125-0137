// The Copper Ladle — main: boot and the one loop.
// Input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints
// what is there. Screens: title, play, paused, day-complete, over, win.
//
// ?seed=N fixes the order pattern (default 7: the same shift every load).
// ?shot=start|play|rush|win (with &seed=N) stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady.
import { BEST_KEY, DEFAULT_SEED, STEP } from './config.js';
import {
  EVENT_BURNT, EVENT_CHOP, EVENT_COOKED, EVENT_DAY_END, EVENT_FAILED,
  EVENT_OVER, EVENT_SERVED, EVENT_WIN, SCREEN_DAY, SCREEN_OVER, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createWorld, interact, nextDay,
  resetWorld, step,
} from './world.js';
import { createInput, handleClick, moveTargetDirection } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer } from './render.js';
import { createShotWorld, stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : DEFAULT_SEED;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = shot ? createShotWorld(seed) : createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastTickSecond = -1;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetWorld(world);
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing. Three hearts, three days. Fill the tickets!');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.coins > best) {
      best = world.coins;
      saveBest(best);
    }
    announce(won ? `You did it. ${world.coins} coins.` : `Service over. ${world.coins} coins.`);
  }

  function handleEvents(events) {
    if (events & EVENT_CHOP) audio.chop();
    if (events & EVENT_COOKED) audio.cooked();
    if (events & EVENT_SERVED) audio.serve();
    if (events & (EVENT_BURNT | EVENT_FAILED)) audio.fail();
    if (events & EVENT_DAY_END) audio.serve();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_DAY_END) screen = SCREEN_DAY;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const click = input.takeClick();
    if (click) {
      audio.unlock();
      const r = handleClick(world, click);
      if (r.interact) {
        const events = interact(world);
        handleEvents(events);
      }
    }
    if (input.isDown('m')) audio.toggleMute();
    if (input.takeInteract()) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN) startGame();
      else if (screen === SCREEN_DAY) {
        nextDay(world);
        screen = SCREEN_PLAY;
      } else if (screen === SCREEN_PLAY) {
        const events = interact(world);
        handleEvents(events);
      }
    }
    if (input.isDown('p') && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (input.isDown('p') && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    // Clicking the canvas on a title/over screen starts the game too.
    if (click && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    if (click && screen === SCREEN_DAY) {
      nextDay(world);
      screen = SCREEN_PLAY;
    }

    if (screen === SCREEN_PLAY) {
      const keyDir = input.direction();
      const targetDir = moveTargetDirection(world);
      const dir = keyDir.dx || keyDir.dy ? keyDir : targetDir || { dx: 0, dy: 0 };
      const second = Math.floor(world.dayTime);
      if (second !== lastTickSecond) {
        lastTickSecond = second;
        if (world.board.tickets.some((t) => t.patience < 10)) audio.tick();
      }
      const anyBurnerCooking = world.burners.some((b) => b.items.length > 0 && !b.done);
      if (anyBurnerCooking) audio.startSizzle();
      else audio.stopSizzle();
      while (accumulator >= STEP) {
        const events = step(world, { dx: dir.dx, dy: dir.dy, interact: false });
        handleEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
      audio.stopSizzle();
    }
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Copper Ladle. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
