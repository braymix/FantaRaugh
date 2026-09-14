/**
 * Profilo iniziale del giocatore. In assenza di backend, si parte con una
 * collezione di base: tutti e 6 gli eroi, le 6 armi, alcuni perk già montati.
 */

import { BALANCE } from '@content/balance';
import { WEAPON_MAP } from '@content/weapons';
import type { OwnedHero, OwnedPerk, OwnedWeapon, PlayerProfile } from './types';

export const PROFILE_VERSION = 2;

function weapon(instanceId: string, defId: string, level: number, perks: (string | null)[]): OwnedWeapon {
  const slots = BALANCE.raritySlots[WEAPON_MAP[defId]!.rarity];
  const perkSlots: (string | null)[] = Array.from({ length: slots }, (_, i) => perks[i] ?? null);
  return { instanceId, defId, level, xp: 0, perkSlots };
}

function perk(instanceId: string, defId: string, level = 1): OwnedPerk {
  return { instanceId, defId, level, xp: 0 };
}

function hero(defId: string, level: number, weaponInstanceId: string | null, row: OwnedHero['row']): OwnedHero {
  return { defId, level, xp: 0, weaponInstanceId, row };
}

export function createDefaultProfile(now: number = Date.now()): PlayerProfile {
  const perks: OwnedPerk[] = [
    perk('pk_whet', 'perk_whetstone', 3),
    perk('pk_life', 'perk_lifesteal', 2),
    perk('pk_wild', 'perk_wildfire', 2),
    perk('pk_venom', 'perk_venomcoat', 2),
    perk('pk_quick', 'perk_quickdraw', 1),
    perk('pk_exec', 'perk_executioner', 1),
    perk('pk_frenzy', 'perk_frenzy', 1),
    perk('pk_reflex', 'perk_reflexes', 1),
  ];

  const weapons: OwnedWeapon[] = [
    weapon('wp_shield', 'wpn_bulwark', 4, ['pk_reflex']),
    weapon('wp_hammer', 'wpn_warhammer', 3, ['pk_whet', 'pk_frenzy']),
    weapon('wp_dagger', 'wpn_shadowfang', 4, ['pk_exec', 'pk_wild']),
    weapon('wp_staff1', 'wpn_oakstaff', 3, ['pk_wild']),
    weapon('wp_staff2', 'wpn_oakstaff', 3, ['pk_life']),
    weapon('wp_bow', 'wpn_longbow', 3, ['pk_venom']),
  ];

  // Livello di partenza basso: c'è margine per crescere run dopo run (roguelite).
  const heroes: OwnedHero[] = [
    hero('hero_thane', 3, 'wp_shield', 'front'),
    hero('hero_kael', 3, 'wp_hammer', 'front'),
    hero('hero_umbra', 3, 'wp_dagger', 'back'),
    hero('hero_pyra', 3, 'wp_staff1', 'back'),
    hero('hero_seraphine', 3, 'wp_staff2', 'back'),
    hero('hero_vesper', 3, 'wp_bow', 'back'),
  ];

  return {
    version: PROFILE_VERSION,
    heroes,
    weapons,
    perks,
    currencies: { gold: 200, gems: 50 },
    energy: { current: BALANCE.energyMax, max: BALANCE.energyMax, lastRefillAt: now },
    team: ['hero_thane', 'hero_kael', 'hero_umbra', 'hero_pyra', 'hero_seraphine'],
    run: null,
    ascension: 0,
    runsAttempted: 0,
    bossKills: 0,
  };
}
