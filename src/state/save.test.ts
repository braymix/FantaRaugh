import { describe, expect, it } from 'vitest';
import { createMetaProfile, PROFILE_VERSION } from './meta';
import { loadProfile, saveProfile } from './save';
import { MemoryStorageAdapter } from './storage';

describe('salvataggio e migrazioni', () => {
  it('senza salvataggio parte da un profilo pulito', () => {
    const p = loadProfile(new MemoryStorageAdapter());
    expect(p.version).toBe(PROFILE_VERSION);
    expect(p.essence).toBe(0);
  });

  it('rilegge fedelmente un salvataggio della versione corrente', () => {
    const storage = new MemoryStorageAdapter();
    const saved = createMetaProfile();
    saved.essence = 137;
    saved.records.bestBadges = 3;
    saveProfile(storage, saved);
    const loaded = loadProfile(storage);
    expect(loaded.essence).toBe(137);
    expect(loaded.records.bestBadges).toBe(3);
  });

  it('una versione più vecchia ma compatibile NON perde i progressi', () => {
    const storage = new MemoryStorageAdapter();
    // Salvataggio "v4": non conosceva ancora il campo del tutorial.
    const old = { ...createMetaProfile(), version: 4, essence: 999 } as Record<string, unknown>;
    delete old['tutorialSeen'];
    storage.set('fantaraugh:profile', JSON.stringify(old));

    const loaded = loadProfile(storage);
    expect(loaded.version).toBe(PROFILE_VERSION);
    expect(loaded.essence).toBe(999); // progressi salvi
    expect(loaded.tutorialSeen).toBe(false); // campo mancante riempito
  });

  it('uno schema troppo vecchio riparte pulito invece di crashare', () => {
    const storage = new MemoryStorageAdapter();
    storage.set('fantaraugh:profile', JSON.stringify({ version: 1, heroes: [], essence: 50 }));
    expect(loadProfile(storage).essence).toBe(0);
  });

  it('un salvataggio corrotto non blocca il gioco', () => {
    const storage = new MemoryStorageAdapter();
    storage.set('fantaraugh:profile', '{non-json');
    expect(loadProfile(storage).version).toBe(PROFILE_VERSION);
  });

  it('completa un salvataggio corrente a cui mancano dei campi invece di rompersi', () => {
    const storage = new MemoryStorageAdapter();
    storage.set('fantaraugh:profile', JSON.stringify({ version: PROFILE_VERSION, essence: 42 }));
    const p = loadProfile(storage);
    expect(p.essence).toBe(42);
    expect(p.records).toEqual(createMetaProfile().records);
    expect(p.seen).toEqual([]);
  });
});
