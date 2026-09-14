/**
 * Calcolo del danno — puro e deterministico.
 *
 * Due assi indipendenti, per volontà di design:
 *  - fisico/magico → QUALE statistica difensiva mitiga (Difesa o Resistenza);
 *  - tipo elementale → MOLTIPLICATORE di efficacia (debolezza/resistenza/immunità).
 *
 * Ordine dei tiri col PRNG (fisso, per la riproducibilità): PRIMA il colpito/
 * mancato, POI il critico. Formula:
 *   grezzo   = atk * power
 *   mitStat  = fisico ? def : resistance   (ridotta da defIgnorePct)
 *   mit      = mitStat / (mitStat + K)
 *   danno    = grezzo * (1 - mit) * crit * efficaciaTipo * bonusStessoTipo * bonusTag
 *   danno    = max(minDamage, round(danno))   — salvo immunità, che azzera
 */

import type { Rng } from './prng';
import { effectiveStat } from './stats';
import { getStatusTags } from './tags';
import type { DamageType, MonType, Registry, Tag, Unit } from './types';

export interface DamageParams {
  power: number;
  damageType: DamageType;
  element?: MonType;
  defIgnorePct?: number;
  bonusVsTag?: { tag: Tag; pct: number };
  /** Moltiplicatore globale (es. accelerazione anti-stall). */
  globalMult?: number;
}

export interface DamageRoll {
  hit: boolean;
  crit: boolean;
  amount: number; // danno pre-scudo, già arrotondato
  element: MonType;
  effectiveness: number;
}

export function computeDamage(
  attacker: Unit,
  target: Unit,
  params: DamageParams,
  rng: Rng,
  registry: Registry,
): DamageRoll {
  const cfg = registry.config;
  // Se l'azione non dichiara un elemento usa il tipo primario di chi attacca:
  // così lo stesso kit di ruolo resta riusabile da creature di tipi diversi.
  const element = params.element ?? attacker.types[0] ?? 'acciaio';

  const accuracy = effectiveStat(attacker, 'accuracy', registry);
  const hit = rng.chance(accuracy);
  if (!hit) return { hit: false, crit: false, amount: 0, element, effectiveness: 1 };

  const effectiveness = registry.effectiveness(element, target.types);

  const critRate = effectiveStat(attacker, 'critRate', registry);
  const crit = rng.chance(critRate);

  // Immunità: nessun danno, ma il colpo è "andato a segno" (gli eventi lo dicono).
  if (effectiveness === 0) {
    return { hit: true, crit, amount: 0, element, effectiveness: 0 };
  }

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

  dmg *= effectiveness;
  // Bonus "stesso tipo": premia le creature che colpiscono col proprio elemento.
  if (attacker.types.includes(element)) dmg *= cfg.sameTypeBonus;

  if (params.bonusVsTag) {
    const tags = getStatusTags(target, registry);
    if (tags.has(params.bonusVsTag.tag)) dmg *= 1 + params.bonusVsTag.pct;
  }

  if (params.globalMult) dmg *= params.globalMult;

  const amount = Math.max(cfg.minDamage, Math.round(dmg));
  return { hit: true, crit, amount, element, effectiveness };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
