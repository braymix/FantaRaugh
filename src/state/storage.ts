/**
 * Persistenza dietro un'interfaccia astratta. Oggi è localStorage; domani può
 * diventare un backend HTTP senza toccare store, engine o UI: basta un nuovo
 * StorageAdapter. Ogni accesso è protetto (private mode, quota, storage bloccato).
 */

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Quota piena o storage non disponibile: il gioco continua in memoria.
    }
  }

  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* no-op */
    }
  }
}

/** Fallback in memoria (SSR, test, storage disabilitato). */
export class MemoryStorageAdapter implements StorageAdapter {
  private map = new Map<string, string>();
  get(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  set(key: string, value: string): void {
    this.map.set(key, value);
  }
  remove(key: string): void {
    this.map.delete(key);
  }
}

export function defaultStorage(): StorageAdapter {
  return typeof window !== 'undefined' && 'localStorage' in window
    ? new LocalStorageAdapter()
    : new MemoryStorageAdapter();
}
