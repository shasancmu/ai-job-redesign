// Seeded RNG so a challenge is reproducible from its seed. mulberry32 (fast,
// good enough for teaching data) + Box–Muller for standard normals.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private u: () => number;
  private spare: number | null = null;
  constructor(seed: number) {
    this.u = mulberry32(seed);
  }
  uniform(): number {
    return this.u();
  }
  // Standard normal via Box–Muller (caches the spare draw).
  normal(): number {
    if (this.spare !== null) {
      const s = this.spare;
      this.spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = this.u();
    while (v === 0) v = this.u();
    const mag = Math.sqrt(-2 * Math.log(u));
    this.spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  }
}
