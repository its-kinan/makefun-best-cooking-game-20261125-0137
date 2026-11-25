// The Copper Ladle — shots: the four staged scenes behind ?shot=.
// Each scene builds a real game state (the same objects step() moves) and
// hands it to the renderer, so a screenshot is the game's own code drawing
// a moment a real shift reaches: title, mid-assembly, service rush, win.
// ?shot=start|play|rush|win (with &seed=N) stages that scene, paints it
// twice and sets window.__shotReady for the screenshot.
import { createWorld, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './world.js';
import { makeTicket } from './orders.js';

function ticket(recipe, patience, maxPatience) {
  const t = makeTicket(recipe, maxPatience);
  t.patience = patience;
  return t;
}

function base(seed) {
  const world = createWorld(seed);
  world.screen = SCREEN_PLAY;
  return world;
}

/** Title: the kitchen at rest, two tickets on the board, chef ready. */
function stageStart(world) {
  world.screen = SCREEN_TITLE;
  world.board.tickets = [ticket('salad', 68, 75), ticket('soup', 55, 75)];
  world.boards[0] = { item: { kind: 'tomato', state: 'chopped' }, chops: 3 };
  world.burners[0] = { items: [{ kind: 'patty', state: 'raw' }], progress: 3, done: false };
  world.chef.x = 640;
  world.chef.y = 430;
  return { screen: SCREEN_TITLE, best: 0 };
}

/** Mid-assembly: a salad coming together, a patty on the stove, board busy. */
function stagePlay(world) {
  world.dayTime = 61;
  world.coins = 34;
  world.combo = 2;
  world.served = 3;
  world.board.tickets = [ticket('salad', 42, 75), ticket('soup', 26, 75), ticket('melt', 51, 65)];
  world.boards[0] = { item: { kind: 'onion', state: 'chopped' }, chops: 3 };
  world.boards[1] = { item: { kind: 'mushroom', state: 'raw' }, chops: 1 };
  world.burners[0] = { items: [{ kind: 'patty', state: 'raw' }], progress: 4, done: false };
  world.plating = { kind: 'plate', items: [{ kind: 'lettuce', state: 'chopped' }] };
  world.chef.x = 1000;
  world.chef.y = 210;
  world.chef.holding = { kind: 'tomato', state: 'chopped' };
  world.chef.dir = 1;
  world.platesLeft = 4;
  return { screen: SCREEN_PLAY, best: 34 };
}

/** Service rush: four tickets, one about to walk out, burger at the window. */
function stageRush(world) {
  world.day = 3;
  world.dayTime = 128;
  world.coins = 198;
  world.target = 240;
  world.combo = 4;
  world.served = 14;
  world.hearts = 2;
  world.board.tickets = [
    ticket('burger', 6, 55),
    ticket('skillet', 31, 55),
    ticket('soup', 18, 55),
    ticket('melt', 44, 55),
  ];
  world.burners[0] = { items: [{ kind: 'melt', state: 'cooked' }], progress: 6, done: true };
  world.burners[1] = { items: [{ kind: 'patty', state: 'raw' }], progress: 6, done: false };
  world.boards[0] = { item: { kind: 'tomato', state: 'chopped' }, chops: 3 };
  world.plating = {
    kind: 'plate',
    items: [
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ],
  };
  world.chef.x = 1120;
  world.chef.y = 320;
  world.chef.holding = {
    kind: 'plate',
    items: [
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'bread', state: 'raw' },
    ],
  };
  world.chef.dir = 1;
  world.platesLeft = 3;
  world.particles.push(
    { x: 760, y: 600, kind: 'steam', life: 0.6, age: 0.2 },
    { x: 1150, y: 300, kind: 'ding', life: 0.6, age: 0.1 },
  );
  world.popups.push({ x: 1080, y: 240, text: '+28 coins', color: '#ffd166', life: 1.1, age: 0.3 });
  return { screen: SCREEN_PLAY, best: 198 };
}

/** Win: three days done, the till full, stars on the board. */
function stageWin(world) {
  world.screen = SCREEN_WIN;
  world.day = 3;
  world.coins = 312;
  world.target = 240;
  world.served = 21;
  world.combo = 3;
  world.board.tickets = [];
  world.dayResult = { day: 3, met: true, coins: 312, target: 240, served: 21 };
  return { screen: SCREEN_WIN, best: 312 };
}

export function stageShot(name, world) {
  const w = world;
  if (name === 'play') return stagePlay(w);
  if (name === 'rush') return stageRush(w);
  if (name === 'win') return stageWin(w);
  return stageStart(w);
}

export function createShotWorld(seed) {
  return base(seed);
}
