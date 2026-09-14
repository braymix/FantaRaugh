/**
 * Tipi del meta-gioco e dello stato persistito. In questa fase molti sistemi
 * (casse, valute premium, fusione) esistono SOLO come tipi/hook: la loro logica
 * verrà innestata qui senza riscrivere il resto.
 */

import type { Row } from '@engine/types';

export interface OwnedHero {
  defId: string;
  level: number;
  xp: number;
  /** instanceId dell'arma equipaggiata, o null. */
  weaponInstanceId: string | null;
  row: Row;
}

export interface OwnedWeapon {
  instanceId: string;
  defId: string;
  level: number;
  xp: number;
  /** Slot perk: array lungo quanto gli slot dell'arma; null = slot vuoto. */
  perkSlots: (string | null)[]; // valori = instanceId di OwnedPerk
}

export interface OwnedPerk {
  instanceId: string;
  defId: string;
  level: number;
  xp: number;
}

export interface Currencies {
  gold: number; // valuta soft
  gems: number; // valuta premium (NESSUN acquisto reale in questa fase)
}

export interface EnergyState {
  current: number;
  max: number;
  /** Timestamp (ms) dell'ultima rigenerazione calcolata. */
  lastRefillAt: number;
}

/** Progresso di una run nel dungeon corrente. */
export interface RunState {
  dungeonSeed: number;
  currentNodeId: string | null; // null = deve ancora scegliere il primo nodo
  clearedNodeIds: string[];
  /** HP residui degli eroi tra un fight e l'altro (defId -> hp). */
  carryHp: Record<string, number>;
  active: boolean;
}

export interface PlayerProfile {
  version: number;
  heroes: OwnedHero[];
  weapons: OwnedWeapon[];
  perks: OwnedPerk[];
  currencies: Currencies;
  energy: EnergyState;
  /** defId degli eroi schierati, in ordine. */
  team: string[];
  run: RunState | null;
  /**
   * Ascensione roguelite: sale ogni volta che si batte il boss. Aumenta il livello
   * dei dungeon successivi — così "ritenti e cresci" ha sempre una prossima sfida.
   */
  ascension: number;
  /** Statistiche di meta-progressione, per dare senso ai tentativi ripetuti. */
  runsAttempted: number;
  bossKills: number;
}
