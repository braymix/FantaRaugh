/**
 * Utilità condivise dai test dell'engine. Non contiene test: crea unità runtime
 * minime e un registry di prova, così i test unitari possono isolare targeting,
 * stati e danno senza costruire interi eroi.
 */

import { BALANCE } from '@content/balance';
import { STATUS_MAP } from '@content/statuses';
import type { BaseStats, Effect, Registry, Role, Row, Side, Unit } from './types';
import { ENGINE_CONFIG } from '@content/registry';

export function testRegistry(): Registry {
  return { statuses: STATUS_MAP, config: ENGINE_CONFIG };
}

export { BALANCE };

const DEFAULT_STATS: BaseStats = {
  maxHp: 1000,
  atk: 200,
  def: 100,
  speed: 100,
  critRate: 0,
  critDamage: 1.5,
  accuracy: 1,
  resistance: 100,
  energyMax: 100,
};

const NOOP_ATTACK: Effect = {
  id: 'noop',
  name: 'Noop',
  trigger: 'active',
  targeting: 'singleEnemy',
  actions: [{ kind: 'damage', power: 1, damageType: 'physical' }],
};

let counter = 0;

export function makeUnit(
  overrides: Partial<Omit<Unit, 'base'>> & { side: Side; role?: Role; row?: Row; base?: Partial<BaseStats> },
): Unit {
  const base: BaseStats = { ...DEFAULT_STATS, ...(overrides.base ?? {}) };
  const uid = overrides.uid ?? `${overrides.side === 'player' ? 'P' : 'E'}${counter++}`;
  return {
    uid,
    defId: overrides.defId ?? uid,
    name: overrides.name ?? uid,
    role: overrides.role ?? 'blade',
    side: overrides.side,
    row: overrides.row ?? 'front',
    slot: overrides.slot ?? counter,
    level: overrides.level ?? 1,
    base,
    hp: overrides.hp ?? base.maxHp,
    energy: overrides.energy ?? 0,
    shield: overrides.shield ?? 0,
    gauge: overrides.gauge ?? 0,
    alive: overrides.alive ?? true,
    statuses: overrides.statuses ?? [],
    stacks: overrides.stacks ?? {},
    ability: overrides.ability ?? NOOP_ATTACK,
    basicAttack: overrides.basicAttack ?? NOOP_ATTACK,
    passives: overrides.passives ?? [],
    cooldowns: overrides.cooldowns ?? {},
    triggerCounts: overrides.triggerCounts ?? {},
    lastAttackerUid: overrides.lastAttackerUid ?? null,
  };
}
