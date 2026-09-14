/**
 * PRNG deterministico con seed (mulberry32).
 *
 * Perché mulberry32: veloce, 32-bit, distribuzione più che sufficiente per un
 * gioco, e — soprattutto — banale da riprodurre bit-per-bit. L'intero engine
 * dipende SOLO da questo per ogni scelta casuale: niente Math.random(), così
 * stesso seed + stesso input ⇒ stesso identico risultato, sempre.
 */

export interface Rng {
  /** Prossimo float in [0, 1). */
  next(): number;
  /** Intero in [min, max] inclusi. */
  int(min: number, max: number): number;
  /** true con probabilità p (0..1). */
  chance(p: number): boolean;
  /** Stato interno corrente, per snapshot/serializzazione. */
  state(): number;
}

export function makeRng(seed: number): Rng {
  // Normalizziamo il seed a un intero unsigned a 32 bit.
  let a = seed >>> 0;

  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int(min: number, max: number): number {
      if (max < min) [min, max] = [max, min];
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(p: number): boolean {
      if (p <= 0) return false;
      if (p >= 1) return true;
      return next() < p;
    },
    state(): number {
      return a >>> 0;
    },
  };
}
