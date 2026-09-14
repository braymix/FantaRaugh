/**
 * Pipeline delle statistiche.
 *
 * Ordine di applicazione, stabile e documentato (vale per OGNI stat):
 *   finale = (base + Σ additivi) * Π (1 + moltiplicativo)
 *
 * Gli additivi si sommano tra loro sulla base; poi ogni moltiplicativo è un
 * fattore (1 + value). I modificatori arrivano dagli stati attivi (StatusDef.
 * statMods), moltiplicati per il numero di stack dell'istanza.
 */

import type { BaseStats, Registry, StatKey, StatMod, Unit } from './types';

const STAT_KEYS: StatKey[] = [
  'maxHp',
  'atk',
  'def',
  'speed',
  'critRate',
  'critDamage',
  'accuracy',
  'resistance',
  'energyMax',
];

/** Raccoglie tutti gli StatMod attivi su un'unità (stati × stack). */
function collectMods(unit: Unit, registry: Registry): StatMod[] {
  const mods: StatMod[] = [];
  for (const st of unit.statuses) {
    const def = registry.statuses[st.defId];
    if (!def?.statMods) continue;
    for (const m of def.statMods) {
      // Un mod con più stack vale n volte (additivo × n, oppure mul × n).
      for (let i = 0; i < st.stacks; i++) mods.push(m);
    }
  }
  return mods;
}

/** Valore effettivo di una singola statistica dopo i modificatori. */
export function effectiveStat(unit: Unit, stat: StatKey, registry: Registry): number {
  const base = unit.base[stat];
  const mods = collectMods(unit, registry);
  let add = 0;
  let mul = 1;
  for (const m of mods) {
    if (m.stat !== stat) continue;
    if (m.mode === 'add') add += m.value;
    else mul *= 1 + m.value;
  }
  let value = (base + add) * mul;

  // Clamp per le statistiche che rappresentano probabilità/moltiplicatori.
  if (stat === 'critRate' || stat === 'accuracy') value = clamp(value, 0, 1);
  if (stat === 'resistance' || stat === 'def') value = Math.max(0, value);
  if (stat === 'critDamage') value = Math.max(1, value);
  if (stat === 'speed') value = Math.max(0, value);
  return value;
}

/** Snapshot completo delle stat effettive (comodo per l'UI/sim). */
export function effectiveStats(unit: Unit, registry: Registry): BaseStats {
  const out = {} as BaseStats;
  for (const k of STAT_KEYS) out[k] = effectiveStat(unit, k, registry);
  return out;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
