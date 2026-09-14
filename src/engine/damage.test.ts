import { describe, expect, it } from 'vitest';
import { computeDamage } from './damage';
import { makeRng } from './prng';
import { makeUnit, testRegistry } from './test-helpers';

describe('calcolo del danno', () => {
  const registry = testRegistry();

  // Attaccante 'luce' che colpisce con elemento 'fuoco': nessun bonus stesso-tipo,
  // e 'fuoco' è neutro contro 'luce' ⇒ moltiplicatori puliti per i test numerici.
  const attacker = () =>
    makeUnit({ side: 'player', types: ['luce'], base: { atk: 300, accuracy: 1, critRate: 0 } });
  const target = () => makeUnit({ side: 'enemy', types: ['luce'], base: { def: 0, resistance: 0 } });
  const params = { power: 1, damageType: 'physical' as const, element: 'fuoco' as const };

  it('è deterministico a parità di seed e input', () => {
    const a = computeDamage(attacker(), target(), params, makeRng(42), registry);
    const b = computeDamage(attacker(), target(), params, makeRng(42), registry);
    expect(a).toEqual(b);
  });

  it('più difesa ⇒ meno danno', () => {
    const soft = makeUnit({ side: 'enemy', types: ['luce'], base: { def: 50 } });
    const hard = makeUnit({ side: 'enemy', types: ['luce'], base: { def: 600 } });
    const dSoft = computeDamage(attacker(), soft, params, makeRng(1), registry);
    const dHard = computeDamage(attacker(), hard, params, makeRng(1), registry);
    expect(dSoft.amount).toBeGreaterThan(dHard.amount);
  });

  it('il danno magico usa la resistance, non la def', () => {
    const t = makeUnit({ side: 'enemy', types: ['luce'], base: { def: 5000, resistance: 0 } });
    const d = computeDamage(attacker(), t, { ...params, damageType: 'magical' }, makeRng(1), registry);
    expect(d.amount).toBe(300); // nessuna mitigazione
  });

  it('applica il moltiplicatore di tipo (superefficace e resistito)', () => {
    const weak = makeUnit({ side: 'enemy', types: ['natura'], base: { def: 0, resistance: 0 } });
    const tough = makeUnit({ side: 'enemy', types: ['acqua'], base: { def: 0, resistance: 0 } });
    expect(computeDamage(attacker(), weak, params, makeRng(1), registry).amount).toBe(600);
    expect(computeDamage(attacker(), tough, params, makeRng(1), registry).amount).toBe(150);
  });

  it('doppia debolezza ⇒ ×4', () => {
    const t = makeUnit({ side: 'enemy', types: ['natura', 'ghiaccio'], base: { def: 0, resistance: 0 } });
    const d = computeDamage(attacker(), t, params, makeRng(1), registry);
    expect(d.effectiveness).toBe(4);
    expect(d.amount).toBe(1200);
  });

  it("l'immunità azzera il danno pur registrando il colpo", () => {
    const steel = makeUnit({ side: 'enemy', types: ['acciaio'], base: { def: 0, resistance: 0 } });
    const d = computeDamage(attacker(), steel, { ...params, element: 'veleno' }, makeRng(1), registry);
    expect(d.hit).toBe(true);
    expect(d.effectiveness).toBe(0);
    expect(d.amount).toBe(0);
  });

  it('bonus stesso tipo quando elemento e tipo coincidono', () => {
    const fireAttacker = makeUnit({
      side: 'player',
      types: ['fuoco'],
      base: { atk: 300, accuracy: 1, critRate: 0 },
    });
    const d = computeDamage(fireAttacker, target(), params, makeRng(1), registry);
    expect(d.amount).toBe(450); // 300 × 1.5
  });

  it("se l'azione non dichiara l'elemento usa il tipo di chi attacca", () => {
    const iceAttacker = makeUnit({
      side: 'player',
      types: ['ghiaccio'],
      base: { atk: 300, accuracy: 1, critRate: 0 },
    });
    const grass = makeUnit({ side: 'enemy', types: ['natura'], base: { def: 0, resistance: 0 } });
    const d = computeDamage(iceAttacker, grass, { power: 1, damageType: 'physical' }, makeRng(1), registry);
    expect(d.element).toBe('ghiaccio');
    expect(d.amount).toBe(900); // 300 × 2 (superefficace) × 1.5 (stesso tipo)
  });

  it('il critico aumenta il danno', () => {
    const critAttacker = makeUnit({
      side: 'player',
      types: ['luce'],
      base: { atk: 300, accuracy: 1, critRate: 1, critDamage: 2 },
    });
    const d = computeDamage(critAttacker, target(), params, makeRng(1), registry);
    expect(d.crit).toBe(true);
    expect(d.amount).toBe(600);
  });

  it('accuracy 0 ⇒ manca sempre', () => {
    const blind = makeUnit({ side: 'player', types: ['luce'], base: { atk: 300, accuracy: 0 } });
    const d = computeDamage(blind, target(), params, makeRng(1), registry);
    expect(d.hit).toBe(false);
  });
});
