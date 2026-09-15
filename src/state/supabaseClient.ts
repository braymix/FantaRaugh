/**
 * Client Supabase opzionale: se le env var non sono configurate (nessun
 * progetto Supabase collegato, es. in dev/test/demo statica) l'app resta
 * pienamente funzionante in locale, semplicemente senza sync cloud.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

export function isCloudConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isCloudConfigured()) return null;
  if (!client) {
    client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  }
  return client;
}
