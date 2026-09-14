import { describe, expect, it } from 'vitest';
import { CREATURE_MAP } from '@content/creatures';
import { REGISTRY } from '@content/registry';
import { simulateBattle } from './battle';
import { buildBattleState, type Placement } from './build';
import { makeUnit, testRegistry } from './test-helpers';
import type { BattleState, Effect } from './types';

const at = (id: string, level: number, row: Placement['row']): Placement => ({
  def: CREATURE_MAP[id]!,
  level,
  row,
});

function squad(): BattleState {
  return buildBattleState(
    [at('thane', 25, 'front'), at('kael', 25, 'front'), at('umbra', 25, 'back'), at('pyra', 25, 'back')],
    [at('orc_brute', 18, 'front'), at('goblin_grunt', 18, 'front'), at('dark_acolyte', 18, 'back')],
  );
}

describe('simulateBattle — determinismo', () => {
  it('stesso stato iniziale + stesso seed ⇒ log IDENTICO', () => {
    const a = simulateBattle(squad(), 20260914, REGISTRY);
    const b = simulateBattle(squad(), 20260914, REGISTRY);
    expect(a.winner).toBe(b.winner);
    expect(a.events).toEqual(b.events);
    expect(a.finalUnits).toEqual(b.finalUnits);
  });

  it('produce sempre un esito e chiude con battleEnd', () => {
    const res = simulateBattle(squad(), 7, REGISTRY);
    expect(['player', 'enemy', 'draw']).toContain(res.winner);
    expect(res.events.at(-1)).toMatchObject({ t: 'battleEnd' });
  });

  it('gli eventi di danno riportano elemento ed efficacia', () => {
    const res = simulateBattle(squad(), 3, REGISTRY);
    const dmg = res.events.find((e) => e.t === 'damage');
    expect(dmg).toBeDefined();
    if (dmg && dmg.t === 'damage') {
      expect(typeof dmg.element).toBe('string');
      expect(dmg.effectiveness).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("barra d'azione (ATB)", () => {
  const registry = testRegistry();

  it("l'unità più veloce agisce per prima", () => {
    const p = makeUnit({ side: 'player', uid: 'P0', slot: 0, base: { speed: 200 } });
    const e = makeUnit({ side: 'enemy', uid: 'E0', slot: 0, base: { speed: 50 } });
    const res = simulateBattle({ units: [p, e], turn: 0, tickCount: 0 }, 1, registry);
    const first = res.events.find((ev) => ev.t === 'turnStart');
    expect(first && 'uid' in first ? first.uid : null).toBe('P0');
  });

  it('una spinta al gauge a inizio battaglia anticipa il turno', () => {
    const boost: Effect = {
      id: 'boost',
      name: 'Boost',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'pushGauge', amount: 0.9 }],
    };
    const p = makeUnit({ side: 'player', uid: 'P0', slot: 0, base: { speed: 100 } });
    const e = makeUnit({ side: 'enemy', uid: 'E0', slot: 0, base: { speed: 100 }, passives: [boost] });
    const res = simulateBattle({ units: [p, e], turn: 0, tickCount: 0 }, 1, registry);
    const first = res.events.find((ev) => ev.t === 'turnStart');
    expect(first && 'uid' in first ? first.uid : null).toBe('E0');
  });
});

describe('meccaniche di ruolo (via effetti)', () => {
  it('il Combattente accumula Slancio colpendo', () => {
    const res = simulateBattle(squad(), 11, REGISTRY);
    expect(res.events.some((e) => e.t === 'statusApplied' && e.statusId === 'momentum')).toBe(true);
  });

  it('il Nascosto entra in furtività a inizio battaglia', () => {
    const res = simulateBattle(squad(), 2, REGISTRY);
    expect(res.events.some((e) => e.t === 'statusApplied' && e.statusId === 'stealth')).toBe(true);
  });

  it("il Curatore genera scudo dall'eccesso di cura", () => {
    const state = buildBattleState(
      [at('seraphine', 40, 'back'), at('thane', 1, 'front')],
      [at('cave_bat', 5, 'front')],
    );
    const res = simulateBattle(state, 5, REGISTRY);
    expect(res.events.some((e) => e.t === 'shield')).toBe(true);
  });
});

describe('anti-stall', () => {
  const registry = testRegistry();

  it('un fight impossibile da chiudere finisce comunque (overtime)', () => {
    // Due unità con difese enormi e attacco minimo: senza anti-stall
    // resterebbero in stallo fino al tetto dei turni.
    const tanky = () => ({ maxHp: 200000, atk: 1, def: 100000, resistance: 100000 });
    const p = makeUnit({ side: 'player', uid: 'P0', slot: 0, base: tanky() });
    const e = makeUnit({ side: 'enemy', uid: 'E0', slot: 0, base: tanky() });
    const res = simulateBattle({ units: [p, e], turn: 0, tickCount: 0 }, 1, registry);
    expect(res.events.some((ev) => ev.t === 'overtime')).toBe(true);
    expect(res.events.some((ev) => ev.t === 'death')).toBe(true);
    expect(res.stats.turns).toBeLessThan(registry.config.maxTurns);
  });
});

describe('guardia anti-loop', () => {
  const registry = testRegistry();

  it('effetti che si rimbalzano non causano ricorsione infinita', () => {
    const thorns: Effect = {
      id: 'thorns',
      name: 'Spine',
      trigger: 'onDamaged',
      targeting: 'triggerSource',
      actions: [{ kind: 'damage', power: 0.1, damageType: 'physical' }],
    };
    const p = makeUnit({ side: 'player', uid: 'P0', slot: 0, passives: [thorns] });
    const e = makeUnit({ side: 'enemy', uid: 'E0', slot: 0, passives: [thorns] });
    const res = simulateBattle({ units: [p, e], turn: 0, tickCount: 0 }, 1, registry);
    expect(res.events.length).toBeGreaterThan(0);
    expect(['player', 'enemy', 'draw']).toContain(res.winner);
  });
});
