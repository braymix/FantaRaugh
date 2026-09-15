/**
 * Sync asincrona del profilo verso/da Supabase, sopra il salvataggio locale
 * sincrono (LocalStorageAdapter resta la cache/fallback offline usata da tutti
 * i call site esistenti — vedi storage.ts). Una riga per utente nella tabella
 * `profiles` (vedi supabase/migrations/0001_profiles.sql), con l'intero
 * MetaProfile come JSON.
 *
 * Regola di riconciliazione al login: il cloud vince se esiste già un
 * salvataggio per quell'utente (altro dispositivo/sessione precedente);
 * altrimenti si carica il profilo locale corrente sul cloud. Non si tenta un
 * merge campo-per-campo: evita conflitti silenziosi tra due run diverse.
 */

import { getSupabase } from './supabaseClient';
import type { MetaProfile } from './types';

const TABLE = 'profiles';

export async function pullCloudProfile(userId: string): Promise<MetaProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return data.data as MetaProfile;
}

export async function pushCloudProfile(userId: string, profile: MetaProfile): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from(TABLE).upsert({
    user_id: userId,
    data: profile,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Da chiamare subito dopo un sign-in riuscito: cloud vince se presente,
 * altrimenti il locale viene caricato sul cloud. Ritorna il profilo da usare
 * (cloud se trovato, altrimenti quello locale passato in input).
 */
export async function reconcileOnSignIn(userId: string, localProfile: MetaProfile): Promise<MetaProfile> {
  const cloudProfile = await pullCloudProfile(userId);
  if (cloudProfile) return cloudProfile;
  await pushCloudProfile(userId, localProfile);
  return localProfile;
}
