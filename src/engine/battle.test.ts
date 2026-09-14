import { describe, expect, it } from 'vitest';
import { ENEMY_MAP } from '@content/enemies';
import { HERO_MAP } from '@content/heroes';
import { REGISTRY } from '@content/registry';
import { simulateBattle } from './battle';
import { buildBattleState, type Placement } from './build';
import { makeUnit, testRegistry } from './test-helpers';
import type { BattleState, Effect } from './types';

const hero = (id: string, level = 20, row: Placement['row'] = 'front'): Placement => ({
  def: HERO_MAP[id]!,
  level,
  row,
});
const foe = (id: string, level = 15, row: Placement['row'] = 'front'): Placement => ({
  def: ENEMY_MAP[id]!,
  level,
  row,
});

function fullTeam(): BattleState {
  const player: Placement[] = [
    hero('hero_thane', 20, 'front'),
    hero('hero_kael', 20, 'front'),
    hero('hero_umbra', 20, 'back'),
    hero('hero_pyra', 20, 'back'),
    hero('hero_seraphine', 20, 'back'),
  ];
  const enemy: Placement[] = [
    foe('enemy_orc_brute', 15, 'front'),
    foe('enemy_goblin_grunt', 15, 'front'),
    foe('enemy_goblin_archer', 15, 'back'),
    foe('enemy_dark_acolyte', 15, 'back'),
  ];
  return buildBattleState(player, enemy);
}

describe('simulateBattle — determinismo', () => {
  it('stesso stato iniziale + stesso seed ⇒ log IDENTICO', () => {
    const r1 = simulateBattle(fullTeam(), 20260914, REGISTRY);
    const r2 = simulateBattle(fullTeam(), 20260914, REGISTRY);
    expect(r1.winner).toBe(r2.winner);
    expect(r1.events.length).toBe(r2.events.length);
    expect(r1.events).toEqual(r2.events);
    expect(r1.finalUnits).toEqual(r2.finalUnits);
  });

  it('produce sempre un vincitore (nessun pareggio in un fight sbilanciato)', () => {
    const res = simulateBattle(fullTeam(), 7, REGISTRY);
    expect(res.winner).not.toBe('draw');
    expect(res.events.at(-1)).toMatchObject({ t: 'battleEnd' });
  });

  it('registra le statistiche di danno per ruolo', () => {
    const res = simulateBattle(fullTeam(), 3, REGISTRY);
    const total = Object.values(res.stats.damageByRole).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe('barra d\'azione (ATB)', () => {
  const registry = testRegistry();

  function duel(pSpeed: number, eSpeed: number, pPassives: Effect[] = []): BattleState {
    const p = makeUnit({ side: 'player', uid: 'P0', slot: 0, base: { speed: pSpeed }, passives: pPassives });
    const e = makeUnit({ side: 'enemy', uid: 'E0', slot: 0, base: { speed: eSpeed } });
    return { units: [p, e], turn: 0, tickCount: 0 };
  }

  it('l\'unità più veloce agisce per prima', () => {
    const res = simulateBattle(duel(200, 50), 1, registry);
    const firstTurn = res.events.find((e) => e.t === 'turnStart');
    expect(firstTurn && 'uid' in firstTurn ? firstTurn.uid : null).toBe('P0');
  });

  it('una spinta al gauge a inizio battaglia anticipa il turno', () => {
    const boost: Effect = {
      id: 'boost',
      name: 'Boost',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'pushGauge', amount: 0.9 }],
    };
    // Stessa velocità: senza spinta agirebbe prima P0 (slot minore); con la
    // spinta su E0 l'ordine si inverte.
    const p = makeUnit({ side: 'player', uid: 'P0', slot: 0, base: { speed: 100 } });
    const e = makeUnit({ side: 'enemy', uid: 'E0', slot: 0, base: { speed: 100 }, passives: [boost] });
    const res = simulateBattle({ units: [p, e], turn: 0, tickCount: 0 }, 1, registry);
    const firstTurn = res.events.find((ev) => ev.t === 'turnStart');
    expect(firstTurn && 'uid' in firstTurn ? firstTurn.uid : null).toBe('E0');
  });
});

describe('meccaniche di ruolo (via effetti)', () => {
  it('il Combattente accumula Slancio colpendo', () => {
    const res = simulateBattle(fullTeam(), 11, REGISTRY);
    const momentum = res.events.some((e) => e.t === 'statusApplied' && e.statusId === 'momentum');
    expect(momentum).toBe(true);
  });

  it('il Curatore genera scudo dall\'eccesso di cura (overheal)', () => {
    // Squadra ferita: il curatore cura oltre il massimo → scudo.
    const player: Placement[] = [hero('hero_seraphine', 30, 'back'), hero('hero_thane', 1, 'front')];
    const enemy: Placement[] = [foe('enemy_cave_bat', 5, 'front')];
    const state = buildBattleState(player, enemy);
    const res = simulateBattle(state, 5, REGISTRY);
    const shield = res.events.some((e) => e.t === 'shield');
    expect(shield).toBe(true);
  });

  it('il Nascosto entra in furtività a inizio battaglia', () => {
    const res = simulateBattle(fullTeam(), 2, REGISTRY);
    const stealth = res.events.some((e) => e.t === 'statusApplied' && e.statusId === 'stealth');
    expect(stealth).toBe(true);
  });

  it('gli stati a tempo infliggono danno (veleno/tick)', () => {
    const player: Placement[] = [hero('hero_thane', 25, 'front')];
    const enemy: Placement[] = [foe('enemy_venom_spider', 20, 'front')];
    const res = simulateBattle(buildBattleState(player, enemy), 4, REGISTRY);
    const tick = res.events.some((e) => e.t === 'statusTick');
    expect(tick).toBe(true);
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
    // Deve terminare con un risultato finito.
    expect(res.events.length).toBeGreaterThan(0);
    expect(['player', 'enemy', 'draw']).toContain(res.winner);
  });
});
