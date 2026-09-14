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
    if (!parsed || typeof parsed !== 'object') return createMetaProfile();
    // Migrazione additiva: le versioni recenti hanno solo AGGIUNTO campi, quindi
    // riempiamo i buchi con i valori di default invece di cancellare i progressi.
    // Vale anche per la versione corrente: un salvataggio troncato a metà
    // scrittura viene completato coi default, non fa schermata bianca.
    if (parsed.version >= 4) {
      return { ...createMetaProfile(), ...parsed, version: PROFILE_VERSION };
    }
    // Più vecchio di così lo schema è incompatibile: si ricomincia pulito.
    return createMetaProfile();
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
