/**
 * Tipi di contenuto per il meta-gioco (armi, perk). Gli eroi e i nemici usano
 * direttamente UnitDef dell'engine. Questi tipi descrivono i "cataloghi": le
 * istanze possedute dal giocatore (con livelli propri) vivono nello stato.
 */

import type { Effect, Rarity, Role, StatMod } from '@engine/types';

export type WeaponType = 'sword' | 'staff' | 'dagger' | 'shield' | 'bow' | 'hammer';

export interface WeaponDef {
  id: string;
  name: string;
  type: WeaponType;
  rarity: Rarity;
  /** Modificatori di statistica conferiti dall'arma (scalati dal livello arma). */
  statMods: StatMod[];
  /** Ruoli con affinità: bonus di potenza se equipaggiata dal ruolo giusto. */
  affinityRoles: Role[];
  /** Effetto intrinseco opzionale dell'arma. */
  intrinsic?: Effect;
}

export interface PerkDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** L'effetto è la stessa struttura dati di abilità/passive: piena componibilità. */
  effect: Effect;
}
