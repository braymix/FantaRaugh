/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** URL del progetto Supabase (opzionale: senza, il salvataggio cloud è disattivato). */
  readonly VITE_SUPABASE_URL?: string;
  /** Chiave anonima/pubblica Supabase (opzionale, vedi sopra). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
