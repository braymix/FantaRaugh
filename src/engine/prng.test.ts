import { describe, expect, it } from 'vitest';
import { makeRng } from './prng';

describe('prng (mulberry32)', () => {
  it('è deterministico: stesso seed ⇒ stessa sequenza', () => {
    const a = makeRng(12345);
    const b = makeRng(12345);
    const seqA = Array.from({ length: 50 }, () => a.next());
    const seqB = Array.from({ length: 50 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('seed diversi producono sequenze diverse', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() resta in [0, 1)', () => {
    const r = makeRng(999);
    for (let i = 0; i < 1000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() rispetta i limiti inclusivi', () => {
    const r = makeRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const v = r.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
      seen.add(v);
    }
    expect(seen.size).toBe(6); // copre tutta la faccia del dado
  });

  it('chance() ai limiti è certo', () => {
    const r = makeRng(3);
    expect(r.chance(0)).toBe(false);
    expect(r.chance(1)).toBe(true);
  });
});
