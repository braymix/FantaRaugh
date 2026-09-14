/**
 * Gestione degli stati (buff/debuff) su un'unità: aggregazione dei flag,
 * applicazione con stacking, decadimento e rimozione.
 *
 * Gli stati sono l'unico canale per: modifiche di stat duraturi, flag
 * (taunt/stealth/stun), e danni/cure a tempo (tick). Meccaniche di ruolo come
 * "momentum" o "difesa alzata" sono semplici stati: nessun caso speciale.
 */

import type { Registry, StatusFlags, StatusInstance, Unit } from './types';

const EMPTY_FLAGS: StatusFlags = {
  taunt: false,
  stealth: false,
  stunned: false,
  untargetable: false,
};

/** OR di tutti i flag portati dagli stati attivi dell'unità. */
export function getFlags(unit: Unit, registry: Registry): StatusFlags {
  const flags: StatusFlags = { ...EMPTY_FLAGS };
  for (const st of unit.statuses) {
    const def = registry.statuses[st.defId];
    if (!def?.flags) continue;
    if (def.flags.taunt) flags.taunt = true;
    if (def.flags.stealth) flags.stealth = true;
    if (def.flags.stunned) flags.stunned = true;
    if (def.flags.untargetable) flags.untargetable = true;
  }
  return flags;
}

export function hasStatus(unit: Unit, statusId: string): boolean {
  return unit.statuses.some((s) => s.defId === statusId);
}

export function findStatus(unit: Unit, statusId: string): StatusInstance | undefined {
  return unit.statuses.find((s) => s.defId === statusId);
}

/**
 * Applica (o aggiorna) uno stato. Se già presente: aumenta gli stack fino al
 * massimo e rinfresca la durata al valore più lungo tra vecchio e nuovo.
 * Ritorna l'istanza risultante (o null se lo StatusDef non esiste).
 */
export function applyStatus(
  unit: Unit,
  statusId: string,
  duration: number,
  stacks: number,
  sourceUid: string,
  registry: Registry,
): StatusInstance | null {
  const def = registry.statuses[statusId];
  if (!def) return null;
  const existing = findStatus(unit, statusId);
  if (existing) {
    existing.stacks = Math.min(def.maxStacks, existing.stacks + stacks);
    existing.duration = Math.max(existing.duration, duration);
    existing.sourceUid = sourceUid;
    return existing;
  }
  const inst: StatusInstance = {
    defId: statusId,
    duration,
    stacks: Math.min(def.maxStacks, stacks),
    sourceUid,
  };
  unit.statuses.push(inst);
  return inst;
}

export function removeStatus(unit: Unit, statusId: string): void {
  unit.statuses = unit.statuses.filter((s) => s.defId !== statusId);
}

/** Rimuove fino a `count` debuff; ritorna gli id rimossi (ordine stabile). */
export function cleanseDebuffs(unit: Unit, count: number, registry: Registry): string[] {
  const removed: string[] = [];
  const kept: StatusInstance[] = [];
  for (const st of unit.statuses) {
    const def = registry.statuses[st.defId];
    if (def && def.kind === 'debuff' && removed.length < count) {
      removed.push(st.defId);
    } else {
      kept.push(st);
    }
  }
  unit.statuses = kept;
  return removed;
}
