// The Copper Ladle — config: every number the kitchen runs on.
// Recipes, ingredients, day targets and timings live here and nowhere else,
// so tuning the game means editing this one file.
export const FIELD = { width: 1280, height: 720 };
export const HUD_HEIGHT = 76;
export const STEP = 1 / 60;
export const CHEF_SPEED = 235;
export const CHEF_RADIUS = 20;
export const INTERACT_RANGE = 58;
export const MAX_HEARTS = 3;
export const MAX_TICKETS = 4;
export const DAY_SECONDS = 150;
export const PLATE_CAPACITY = 4;
export const CHOPS_NEEDED = 3;

// An ingredient: what it looks like, whether it can be chopped or cooked,
// and what a cooked pile of it becomes. `chop` names the raw vegetables;
// `cook` names what a burner accepts on its own.
export const INGREDIENTS = {
  tomato:   { name: 'Tomato',   color: '#e5484d', dark: '#a92c31', chop: true,  cook: 'pile' },
  lettuce:  { name: 'Lettuce',  color: '#5fbf4d', dark: '#3d8a32', chop: true,  cook: null },
  onion:    { name: 'Onion',    color: '#b678e0', dark: '#7d4aa8', chop: true,  cook: 'pile' },
  mushroom: { name: 'Mushroom', color: '#e8dcc8', dark: '#9a8a70', chop: true,  cook: 'pile' },
  cheese:   { name: 'Cheese',   color: '#f5c542', dark: '#c79a1e', chop: false, cook: 'pile' },
  bread:    { name: 'Bread',    color: '#d9a066', dark: '#a5763f', chop: false, cook: null },
  patty:    { name: 'Patty',    color: '#8a5a3b', dark: '#5f3a24', chop: false, cook: 'solo' },
};

// A recipe is the list of plateable components a finished plate must hold,
// in any order. Cooked components are made on a burner (see burner rules
// in world.js); chopped ones come off a board.
export const RECIPES = {
  salad: {
    name: 'Garden Salad', price: 12,
    needs: [{ kind: 'tomato', state: 'chopped' }, { kind: 'lettuce', state: 'chopped' }],
    days: [1, 2, 3],
  },
  soup: {
    name: 'Tomato Soup', price: 18,
    needs: [{ kind: 'soup', state: 'cooked' }],
    days: [1, 2, 3],
  },
  melt: {
    name: 'Mushroom Melt', price: 20,
    needs: [{ kind: 'melt', state: 'cooked' }],
    days: [2, 3],
  },
  skillet: {
    name: 'Forest Skillet', price: 24,
    needs: [
      { kind: 'patty', state: 'cooked' },
      { kind: 'mushroom', state: 'chopped' },
      { kind: 'onion', state: 'chopped' },
    ],
    days: [2, 3],
  },
  burger: {
    name: 'Ladle Burger', price: 28,
    needs: [
      { kind: 'patty', state: 'cooked' },
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
      { kind: 'bread', state: 'raw' },
    ],
    days: [3],
  },
};

// What a burner pile becomes once its cook timer finishes. The key is the
// sorted kinds on the burner; a pair that is not listed never cooks.
export const BURNER_DISHES = {
  'mushroom+cheese': { kind: 'melt', name: 'Mushroom Melt', cookSeconds: 6, burnSeconds: 11 },
  'onion+tomato': { kind: 'soup', name: 'Tomato Soup', cookSeconds: 6, burnSeconds: 11 },
};
export const PATTY_COOK_SECONDS = 8;
export const PATTY_BURN_SECONDS = 14;

// One day: how fast orders arrive, how long a ticket waits, the coin target
// that opens the next day, and which recipes the board may ask for.
export const DAYS = [
  { day: 1, spawnEvery: 14, patience: 75, target: 60,  firstOrderAt: 2 },
  { day: 2, spawnEvery: 11, patience: 65, target: 140, firstOrderAt: 2 },
  { day: 3, spawnEvery: 9,  patience: 55, target: 240, firstOrderAt: 1 },
];

export const BEST_KEY = 'copper-ladle-best';
export const DEFAULT_SEED = 7;
