/**
 * Salvataggio/caricamento del profilo meta via StorageAdapter. Versionato: se lo
 * schema cambia, qui si aggiunge la migrazione.
 */

import { createMetaProfile, PROFILE_VERSION } from './meta';
import type { StorageAdapter } from './storage';
import type { MetaProfile } from './types';

const SAVE_KEY = 'fantaraugh:profile';

export function loadProfile(storage: StorageAdapter): MetaProfile {
  const raw = storage.get(SAVE_KEY);
  if (!raw) return createMetaProfile();
  try {
    const parsed = JSON.parse(raw) as MetaProfile;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== PROFILE_VERSION) {
      // Schema precedente: si ricomincia dal meta pulito (i dati vecchi non sono
      // traducibili, la struttura del gioco è cambiata).
      return createMetaProfile();
    }
    return parsed;
  } catch {
    return createMetaProfile();
  }
}

export function saveProfile(storage: StorageAdapter, profile: MetaProfile): void {
  storage.set(SAVE_KEY, JSON.stringify(profile));
}

export function clearProfile(storage: StorageAdapter): void {
  storage.remove(SAVE_KEY);
}
