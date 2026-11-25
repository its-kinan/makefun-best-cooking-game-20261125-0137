// The Copper Ladle — orders: the ticket queue on the order board.
// Tickets are born on a fixed schedule (a day's spawn rate), carry the
// recipe they ask for and a patience that drains until the ticket expires.
// All randomness comes from the world's seeded generator.
import { DAYS, MAX_TICKETS, RECIPES } from './config.js';

let nextTicketId = 1;

/** The recipes the board may ask for on a given day. */
export function recipesForDay(day) {
  return Object.entries(RECIPES)
    .filter(([, r]) => r.days.includes(day))
    .map(([id]) => id);
}

/** Make one ticket for a recipe id, patience in seconds. */
export function makeTicket(recipeId, patience) {
  const recipe = RECIPES[recipeId];
  return {
    id: nextTicketId,
    recipe: recipeId,
    name: recipe.name,
    price: recipe.price,
    needs: recipe.needs.map((n) => ({ kind: n.kind, state: n.state })),
    patience,
    maxPatience: patience,
    born: 0,
  };
}

export function resetTicketIds() {
  nextTicketId = 1;
}

/**
 * Advance the order board by `dt` seconds. Returns 'expired' ticket ids
 * whose patience ran out. Spawning follows the day's fixed schedule and
 * stops while the board is full.
 */
export function stepOrders(board, day, dt, rng, now) {
  const cfg = DAYS[day - 1];
  const expired = [];
  for (const t of board.tickets) t.patience -= dt;
  for (let i = board.tickets.length - 1; i >= 0; i -= 1) {
    if (board.tickets[i].patience <= 0) expired.push(board.tickets.splice(i, 1)[0].id);
  }
  board.sinceSpawn += dt;
  const due = board.spawned === 0 ? cfg.firstOrderAt : cfg.spawnEvery;
  if (board.sinceSpawn >= due && board.tickets.length < MAX_TICKETS) {
    board.sinceSpawn = 0;
    board.spawned += 1;
    const ticket = makeTicket(rng.pick(recipesForDay(day)), cfg.patience);
    ticket.born = now;
    board.tickets.push(ticket);
  }
  return expired;
}

export function createBoard() {
  return { tickets: [], sinceSpawn: 0, spawned: 0 };
}
