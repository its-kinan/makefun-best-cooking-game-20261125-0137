// The Copper Ladle — random: one small seeded generator.
// Every roll the game makes comes from here, so the same seed always deals
// the same orders in the same order. Nothing in the game calls Math.random.
export function createRandom(seed) {
  let a = seed >>> 0;
  return {
    next() {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) {
      return Math.floor(this.next() * n);
    },
    pick(list) {
      return list[this.int(list.length)];
    },
  };
}
