/**
 * Composizione del "loadout": eroe + arma + perk → UnitDef pronto per l'engine.
 *
 * Qui si fondono i tre livelli indipendenti (eroe/arma/perk):
 *  - i modificatori dell'arma scalano col livello arma e con l'affinità di ruolo;
 *  - gli effetti dei perk scalano col livello perk;
 *  - le passive risultanti = passive eroe + intrinseco arma + effetti perk.
 * L'engine riceve solo dati generici: non sa nulla di "armi" o "perk".
 */

import { BALANCE } from '@content/balance';
import { HERO_MAP } from '@content/heroes';
import { PERK_MAP } from '@content/perks';
import { WEAPON_MAP } from '@content/weapons';
import type { WeaponDef } from '@content/types';
import type { Placement } from '@engine/build';
import type { Action, BaseStats, Effect, Role, StatMod, UnitDef } from '@engine/types';
import type { OwnedHero, OwnedWeapon, PlayerProfile } from './types';

function applyStatMod(base: BaseStats, mod: StatMod, scale: number): void {
  const stat = mod.stat;
  if (mod.mode === 'add') base[stat] = base[stat] + mod.value * scale;
  else base[stat] = base[stat] * (1 + mod.value * scale);
}

function weaponScale(weapon: WeaponDef, weaponLevel: number, role: Role): number {
  let scale = 1 + (weaponLevel - 1) * BALANCE.weaponStatPerLevel;
  if (weapon.affinityRoles.includes(role)) scale *= 1 + BALANCE.weaponAffinityBonus;
  return scale;
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

/** Clona un effetto scalandone la potenza numerica (usato per il livello perk). */
function scaleEffect(effect: Effect, factor: number): Effect {
  if (factor === 1) return effect;
  return { ...effect, actions: effect.actions.map((a) => scaleAction(a, factor)) };
}

export interface ComposedHero {
  def: UnitDef;
  level: number;
  row: OwnedHero['row'];
}

export function composeHero(owned: OwnedHero, profile: PlayerProfile): ComposedHero | null {
  const hero = HERO_MAP[owned.defId];
  if (!hero) return null;

  const base: BaseStats = { ...hero.baseStats };
  const passives: Effect[] = [...hero.passives];

  const weapon = findWeapon(owned.weaponInstanceId, profile);
  if (weapon) {
    const def = WEAPON_MAP[weapon.defId];
    if (def) {
      const scale = weaponScale(def, weapon.level, hero.role);
      for (const mod of def.statMods) applyStatMod(base, mod, scale);
      if (def.intrinsic) passives.push(def.intrinsic);
      // Perk equipaggiati negli slot dell'arma.
      for (const perkInstanceId of weapon.perkSlots) {
        if (!perkInstanceId) continue;
        const ownedPerk = profile.perks.find((p) => p.instanceId === perkInstanceId);
        if (!ownedPerk) continue;
        const perkDef = PERK_MAP[ownedPerk.defId];
        if (!perkDef) continue;
        const factor = 1 + (ownedPerk.level - 1) * BALANCE.perkPowerPerLevel;
        passives.push(scaleEffect(perkDef.effect, factor));
      }
    }
  }

  // Arrotonda le stat intere; lascia frazionarie quelle di tipo probabilità.
  for (const key of ['maxHp', 'atk', 'def', 'speed', 'resistance', 'energyMax'] as (keyof BaseStats)[]) {
    base[key] = Math.round(base[key]);
  }

  const def: UnitDef = { ...hero, baseStats: base, passives };
  return { def, level: owned.level, row: owned.row };
}

function findWeapon(instanceId: string | null, profile: PlayerProfile): OwnedWeapon | null {
  if (!instanceId) return null;
  return profile.weapons.find((w) => w.instanceId === instanceId) ?? null;
}

/** Placement della squadra del giocatore, in ordine di team. */
export function buildPlayerPlacements(profile: PlayerProfile): Placement[] {
  const placements: Placement[] = [];
  for (const defId of profile.team) {
    const owned = profile.heroes.find((h) => h.defId === defId);
    if (!owned) continue;
    const composed = composeHero(owned, profile);
    if (composed) placements.push({ def: composed.def, level: composed.level, row: composed.row });
  }
  return placements;
}
