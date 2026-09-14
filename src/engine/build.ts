/**
 * Costruzione dello stato di battaglia a partire dalle definizioni (UnitDef).
 * Puro e deterministico: gli uid sono assegnati per lato+slot (P0..,E0..), così
 * l'ordine e i tie-break sono stabili tra run identiche.
 */

import type { BaseStats, BattleState, Effect, GrowthCurve, Row, Side, Unit, UnitDef } from './types';

/** Attacco base generico, usato se una UnitDef non ne fornisce uno proprio. */
const GENERIC_BASIC: Effect = {
  id: 'basic_generic',
  name: 'Attacco',
  trigger: 'active',
  targeting: 'singleEnemy',
  actions: [{ kind: 'damage', power: 1.0, damageType: 'physical', tags: ['physical'] }],
};

/** Statistiche intere: arrotondate, così non compaiono mai HP frazionari. */
const INTEGER_STATS: (keyof BaseStats)[] = ['maxHp', 'atk', 'def', 'speed', 'resistance', 'energyMax'];

export function levelStats(base: BaseStats, growth: GrowthCurve, level: number): BaseStats {
  const out: BaseStats = { ...base };
  const steps = Math.max(0, level - 1);
  for (const key of Object.keys(growth.perLevel) as (keyof BaseStats)[]) {
    const inc = growth.perLevel[key] ?? 0;
    out[key] = base[key] + inc * steps;
  }
  for (const key of INTEGER_STATS) out[key] = Math.round(out[key]);
  return out;
}

export interface Placement {
  def: UnitDef;
  level: number;
  row: Row;
}

function instantiate(def: UnitDef, side: Side, slot: number, level: number, row: Row): Unit {
  const prefix = side === 'player' ? 'P' : 'E';
  const base = levelStats(def.baseStats, def.growth, level);
  return {
    uid: `${prefix}${slot}`,
    defId: def.id,
    name: def.name,
    role: def.role,
    types: def.types,
    side,
    row,
    slot: side === 'player' ? slot : 100 + slot, // i nemici dopo i giocatori nel tie-break
    level,
    base,
    hp: base.maxHp,
    energy: 0,
    shield: 0,
    gauge: 0,
    alive: true,
    statuses: [],
    stacks: {},
    ability: def.ability,
    basicAttack: def.basicAttack ?? GENERIC_BASIC,
    passives: def.passives,
    cooldowns: {},
    triggerCounts: {},
    lastAttackerUid: null,
  };
}

export function buildBattleState(player: Placement[], enemy: Placement[]): BattleState {
  const units: Unit[] = [];
  player.forEach((p, i) => units.push(instantiate(p.def, 'player', i, p.level, p.row)));
  enemy.forEach((p, i) => units.push(instantiate(p.def, 'enemy', i, p.level, p.row)));
  return { units, turn: 0, tickCount: 0 };
}
