import { describe, expect, it } from 'vitest';
import { makeRng } from './prng';
import { applyStatus } from './status';
import { resolveTargets } from './targeting';
import { makeUnit, testRegistry } from './test-helpers';
import type { Unit } from './types';

describe('selezione dei bersagli', () => {
  const registry = testRegistry();
  const rng = makeRng(1);

  function setup(): { all: Unit[]; attacker: Unit } {
    const attacker = makeUnit({ side: 'player', uid: 'P0', slot: 0 });
    const front = makeUnit({ side: 'enemy', uid: 'E0', row: 'front', slot: 0, hp: 500 });
    const back = makeUnit({ side: 'enemy', uid: 'E1', row: 'back', slot: 1, hp: 300 });
    return { all: [attacker, front, back], attacker };
  }

  it('singleEnemy preferisce la prima linea', () => {
    const { all, attacker } = setup();
    const t = resolveTargets('singleEnemy', { source: attacker, other: null }, all, rng, registry);
    expect(t[0]?.uid).toBe('E0');
  });

  it('il taunt redirige gli attacchi singoli sul provocatore, ignorando la prima linea', () => {
    const { all, attacker } = setup();
    const back = all.find((u) => u.uid === 'E1')!;
    applyStatus(back, 'taunt', 3, 1, 'x', registry);
    const t = resolveTargets('singleEnemy', { source: attacker, other: null }, all, rng, registry);
    expect(t[0]?.uid).toBe('E1');
  });

  it('la furtività esclude l\'unità dagli attacchi a bersaglio singolo', () => {
    const { all, attacker } = setup();
    const front = all.find((u) => u.uid === 'E0')!;
    applyStatus(front, 'stealth', 3, 1, 'x', registry);
    const t = resolveTargets('singleEnemy', { source: attacker, other: null }, all, rng, registry);
    // E0 furtivo → salta alla retrovia E1
    expect(t[0]?.uid).toBe('E1');
  });

  it('backRowEnemySingle bypassa la prima linea (assassino)', () => {
    const { all } = setup();
    const assassin = makeUnit({ side: 'player', uid: 'P1', role: 'assassin', slot: 1 });
    all.push(assassin);
    const t = resolveTargets('backRowEnemySingle', { source: assassin, other: null }, all, rng, registry);
    expect(t[0]?.uid).toBe('E1');
  });

  it('lowestHpPctAlly trova l\'alleato proporzionalmente più ferito', () => {
    const a1 = makeUnit({ side: 'player', uid: 'P0', slot: 0, base: { maxHp: 1000 }, hp: 500 }); // 50%
    const a2 = makeUnit({ side: 'player', uid: 'P1', slot: 1, base: { maxHp: 1000 }, hp: 200 }); // 20%
    const enemy = makeUnit({ side: 'enemy', uid: 'E0', slot: 0 });
    const t = resolveTargets('lowestHpPctAlly', { source: a1, other: null }, [a1, a2, enemy], rng, registry);
    expect(t[0]?.uid).toBe('P1');
  });

  it('ignora i morti', () => {
    const { all, attacker } = setup();
    const front = all.find((u) => u.uid === 'E0')!;
    front.alive = false;
    const t = resolveTargets('singleEnemy', { source: attacker, other: null }, all, rng, registry);
    expect(t[0]?.uid).toBe('E1');
  });
});
