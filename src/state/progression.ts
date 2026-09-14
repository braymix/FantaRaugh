/**
 * Curve di progressione: XP necessaria per livello e applicazione dell'XP a
 * un'entità con livello proprio (eroe, arma, perk hanno livelli indipendenti).
 */

import { BALANCE } from '@content/balance';

export interface Levelable {
  level: number;
  xp: number;
}

/** XP totale per passare DAL livello dato al successivo. */
export function xpForNextLevel(level: number): number {
  return Math.round(BALANCE.xpBase * Math.pow(level, BALANCE.xpExponent));
}

/**
 * Aggiunge XP e fa salire di livello finché possibile. Muta e ritorna l'entità
 * (comodo con Immer/Zustand). Rispetta il livello massimo.
 */
export function grantXp<T extends Levelable>(entity: T, amount: number): T {
  entity.xp += Math.max(0, amount);
  while (entity.level < BALANCE.maxLevel) {
    const need = xpForNextLevel(entity.level);
    if (entity.xp < need) break;
    entity.xp -= need;
    entity.level += 1;
  }
  if (entity.level >= BALANCE.maxLevel) entity.xp = 0;
  return entity;
}
