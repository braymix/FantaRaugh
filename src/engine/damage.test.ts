import { describe, expect, it } from 'vitest';
import { computeDamage } from './damage';
import { makeRng } from './prng';
import { makeUnit, testRegistry } from './test-helpers';

describe('calcolo del danno', () => {
  const registry = testRegistry();

  it('è deterministico a parità di seed e input', () => {
    const atk = makeUnit({ side: 'player', base: { atk: 300, accuracy: 1, critRate: 0.5 } });
    const def = makeUnit({ side: 'enemy', base: { def: 200 } });
    const a = computeDamage(atk, def, { power: 1, damageType: 'physical' }, makeRng(42), registry);
    const b = computeDamage(atk, def, { power: 1, damageType: 'physical' }, makeRng(42), registry);
    expect(a).toEqual(b);
  });

  it('più difesa ⇒ meno danno', () => {
    const atk = makeUnit({ side: 'player', base: { atk: 300, accuracy: 1, critRate: 0 } });
    const soft = makeUnit({ side: 'enemy', base: { def: 50 } });
    const hard = makeUnit({ side: 'enemy', base: { def: 600 } });
    const dSoft = computeDamage(atk, soft, { power: 1, damageType: 'physical' }, makeRng(1), registry);
    const dHard = computeDamage(atk, hard, { power: 1, damageType: 'physical' }, makeRng(1), registry);
    expect(dSoft.amount).toBeGreaterThan(dHard.amount);
  });

  it('il danno magico usa la resistance, non la def', () => {
    const atk = makeUnit({ side: 'player', base: { atk: 300, accuracy: 1, critRate: 0 } });
    // def enorme ma resistance nulla: il danno magico non deve essere mitigato dalla def
    const target = makeUnit({ side: 'enemy', base: { def: 5000, resistance: 0 } });
    const d = computeDamage(atk, target, { power: 1, damageType: 'magical' }, makeRng(1), registry);
    expect(d.amount).toBe(300); // nessuna mitigazione
  });

  it('il critico aumenta il danno', () => {
    const atk = makeUnit({ side: 'player', base: { atk: 300, accuracy: 1, critRate: 1, critDamage: 2 } });
    const target = makeUnit({ side: 'enemy', base: { def: 0, resistance: 0 } });
    const d = computeDamage(atk, target, { power: 1, damageType: 'physical' }, makeRng(1), registry);
    expect(d.crit).toBe(true);
    expect(d.amount).toBe(600); // 300 * 2
  });

  it('accuracy 0 ⇒ manca sempre', () => {
    const atk = makeUnit({ side: 'player', base: { atk: 300, accuracy: 0 } });
    const target = makeUnit({ side: 'enemy' });
    const d = computeDamage(atk, target, { power: 1, damageType: 'physical' }, makeRng(1), registry);
    expect(d.hit).toBe(false);
    expect(d.amount).toBe(0);
  });

  it('bonusVsTag aumenta il danno se il bersaglio ha il tag', () => {
    const atk = makeUnit({ side: 'player', base: { atk: 300, accuracy: 1, critRate: 0 } });
    const target = makeUnit({ side: 'enemy', base: { def: 0, resistance: 0 } });
    target.statuses.push({ defId: 'bleed', duration: 3, stacks: 1, sourceUid: 'x' });
    const d = computeDamage(
      atk,
      target,
      { power: 1, damageType: 'physical', bonusVsTag: { tag: 'bleed', pct: 0.5 } },
      makeRng(1),
      registry,
    );
    expect(d.amount).toBe(450); // 300 * 1.5
  });
});
