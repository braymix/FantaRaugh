/**
 * Calcolo del danno — puro e deterministico.
 *
 * Ordine dei tiri col PRNG (fisso, per la riproducibilità): PRIMA il colpito/
 * mancato, POI il critico. Formula:
 *   grezzo   = atk * power
 *   mitStat  = fisico ? def : resistance   (ridotta da defIgnorePct)
 *   mit      = mitStat / (mitStat + K)
 *   danno    = grezzo * (1 - mit) * (crit ? critDamage : 1) * bonusTag
 *   danno    = max(minDamage, round(danno))
 */

import type { Rng } from './prng';
import { effectiveStat } from './stats';
import { getStatusTags } from './tags';
import type { DamageType, Registry, Tag, Unit } from './types';

export interface DamageParams {
  power: number;
  damageType: DamageType;
  defIgnorePct?: number;
  bonusVsTag?: { tag: Tag; pct: number };
}

export interface DamageRoll {
  hit: boolean;
  crit: boolean;
  amount: number; // danno pre-scudo, già arrotondato
}

export function computeDamage(
  attacker: Unit,
  target: Unit,
  params: DamageParams,
  rng: Rng,
  registry: Registry,
): DamageRoll {
  const cfg = registry.config;

  const accuracy = effectiveStat(attacker, 'accuracy', registry);
  const hit = rng.chance(accuracy);
  if (!hit) return { hit: false, crit: false, amount: 0 };

  const critRate = effectiveStat(attacker, 'critRate', registry);
  const crit = rng.chance(critRate);

  const atk = effectiveStat(attacker, 'atk', registry);
  const raw = atk * params.power;

  const isPhysical = params.damageType === 'physical';
  const baseMitStat = isPhysical
    ? effectiveStat(target, 'def', registry)
    : effectiveStat(target, 'resistance', registry);
  const ignore = clamp01(params.defIgnorePct ?? 0);
  const mitStat = baseMitStat * (1 - ignore);
  const k = isPhysical ? cfg.defMitigationK : cfg.resMitigationK;
  const mitigation = mitStat / (mitStat + k);

  let dmg = raw * (1 - mitigation);
  if (crit) dmg *= effectiveStat(attacker, 'critDamage', registry);

  if (params.bonusVsTag) {
    const tags = getStatusTags(target, registry);
    if (tags.has(params.bonusVsTag.tag)) dmg *= 1 + params.bonusVsTag.pct;
  }

  const amount = Math.max(cfg.minDamage, Math.round(dmg));
  return { hit: true, crit, amount };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
