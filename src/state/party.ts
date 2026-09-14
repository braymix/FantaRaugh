/**
 * Composizione della squadra: da RunMon (dati della run) a Placement per l'engine.
 *
 * Qui confluiscono i tre livelli di potenza:
 *  1. livello ed evoluzione della creatura;
 *  2. oggetto tenuto (statistiche + effetto, con trade-off);
 *  3. bonus permanenti della linea evolutiva e tratti di sinergia di tipo.
 * L'engine riceve solo una UnitDef generica: non sa nulla di "oggetti" o "tratti".
 */

import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { ITEM_MAP } from '@content/items';
import { levelStats, type Placement } from '@engine/build';
import type { Action, BaseStats, Effect, MonType, StatKey, StatMod, UnitDef } from '@engine/types';
import type { LineBuffs, RunMon } from './types';

function applyStatMod(base: BaseStats, mod: StatMod): void {
  if (mod.mode === 'add') base[mod.stat] = base[mod.stat] + mod.value;
  else base[mod.stat] = base[mod.stat] * (1 + mod.value);
}

function scaleAction(action: Action, factor: number): Action {
  switch (action.kind) {
    case 'damage':
    case 'heal':
    case 'shield':
      return { ...action, power: action.power * factor };
    default:
      return action;
  }
}

/** Clona un effetto scalandone la potenza numerica (tier della mossa finale). */
function scaleEffect(effect: Effect, factor: number): Effect {
  if (factor === 1) return effect;
  return { ...effect, actions: effect.actions.map((a) => scaleAction(a, factor)) };
}

/**
 * Tratti di sinergia: più membri condividono un tipo, più quel tipo è "coltivato".
 * Premia la specializzazione — che però resta in tensione con la necessità di
 * copertura contro le palestre a tema.
 */
export function traitTiers(types: MonType[], team: RunMon[]): number {
  let tiers = 0;
  for (const t of types) {
    const count = team.filter((m) => CREATURE_MAP[m.defId]?.types.includes(t)).length;
    for (const threshold of BALANCE.traitThresholds) if (count >= threshold) tiers++;
  }
  return tiers;
}

/** Bonus moltiplicativo derivante dai tratti. */
export function traitMultiplier(types: MonType[], team: RunMon[]): number {
  return 1 + traitTiers(types, team) * BALANCE.traitBonusPerTier;
}

export interface ComposedMon {
  placement: Placement;
  /** Utile alla UI per spiegare da dove viene la potenza. */
  traitTiers: number;
  itemId: string | null;
}

export function composeMon(mon: RunMon, lineBuffs: LineBuffs, team: RunMon[]): ComposedMon | null {
  const def = CREATURE_MAP[mon.defId];
  if (!def) return null;

  const base: BaseStats = { ...def.baseStats };

  // 1. Potenziamenti permanenti della linea (metaprogressione).
  const buffs = lineBuffs[def.line] ?? {};
  for (const [stat, points] of Object.entries(buffs)) {
    if (!points) continue;
    base[stat as StatKey] = base[stat as StatKey] * (1 + points * BALANCE.lineBuffStep);
  }

  // 2. Tratti di sinergia di tipo: agiscono su salute e attacco.
  const mult = traitMultiplier(def.types, team);
  base.maxHp *= mult;
  base.atk *= mult;

  // 3. Oggetto tenuto.
  const passives: Effect[] = [...def.passives];
  const item = mon.itemId ? ITEM_MAP[mon.itemId] : undefined;
  if (item) {
    for (const mod of item.statMods ?? []) applyStatMod(base, mod);
    if (item.effect) passives.push(item.effect);
  }

  for (const key of ['maxHp', 'atk', 'def', 'speed', 'resistance', 'energyMax'] as StatKey[]) {
    base[key] = Math.round(base[key]);
  }

  // Tier della mossa finale: unico canale di crescita separato dal livello.
  const tierFactor = BALANCE.moveTierMult[Math.max(0, Math.min(mon.moveTier - 1, BALANCE.moveTierMult.length - 1))] ?? 1;

  const composed: UnitDef = {
    ...def,
    baseStats: base,
    passives,
    ability: scaleEffect(def.ability, tierFactor),
  };

  return {
    placement: { def: composed, level: mon.level, row: mon.row },
    traitTiers: traitTiers(def.types, team),
    itemId: mon.itemId,
  };
}

/** HP massimi effettivi (livello + oggetto + buff di linea + tratti). */
export function maxHpOf(mon: RunMon, lineBuffs: LineBuffs, team: RunMon[]): number {
  const c = composeMon(mon, lineBuffs, team);
  if (!c) return mon.hp;
  return levelStats(c.placement.def.baseStats, c.placement.def.growth, mon.level).maxHp;
}

/** Riporta a pieno una creatura (nodo Rifugio, nuovo reclutamento). */
export function healFull(mon: RunMon, lineBuffs: LineBuffs, team: RunMon[]): void {
  mon.hp = maxHpOf(mon, lineBuffs, team);
}

/** Placement della squadra, nell'ordine scelto dal giocatore. */
export function buildTeamPlacements(team: RunMon[], lineBuffs: LineBuffs): Placement[] {
  const out: Placement[] = [];
  for (const mon of team) {
    if (mon.fainted) continue;
    const c = composeMon(mon, lineBuffs, team);
    if (c) out.push(c.placement);
  }
  return out;
}
