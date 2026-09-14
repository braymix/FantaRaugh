/**
 * Salvataggio/caricamento del profilo via StorageAdapter. Versionato: se in
 * futuro cambia lo schema, qui si aggiunge la migrazione senza perdere i dati.
 */

import type { StorageAdapter } from './storage';
import { createDefaultProfile, PROFILE_VERSION } from './profile';
import type { PlayerProfile } from './types';

const SAVE_KEY = 'fantaraugh:profile:v1';

export function loadProfile(storage: StorageAdapter): PlayerProfile {
  const raw = storage.get(SAVE_KEY);
  if (!raw) return createDefaultProfile();
  try {
    const parsed = JSON.parse(raw) as PlayerProfile;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== PROFILE_VERSION) {
      return migrate(parsed);
    }
    return parsed;
  } catch {
    // Salvataggio corrotto: si riparte pulito piuttosto che crashare.
    return createDefaultProfile();
  }
}

export function saveProfile(storage: StorageAdapter, profile: PlayerProfile): void {
  storage.set(SAVE_KEY, JSON.stringify(profile));
}

export function clearProfile(storage: StorageAdapter): void {
  storage.remove(SAVE_KEY);
}

/** Punto d'innesto per future migrazioni di schema. Oggi: reset controllato. */
function migrate(_old: unknown): PlayerProfile {
  return createDefaultProfile();
}
