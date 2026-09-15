/**
 * Autenticazione minimale via Supabase (email + password): sign up, sign in,
 * sign out, e un listener per i cambi di sessione. Nessun reset password o
 * verifica email custom: quello lo gestisce Supabase stesso lato dashboard.
 */

import type { Session } from '@supabase/supabase-js';
import { getSupabase, isCloudConfigured } from './supabaseClient';

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export function cloudAuthAvailable(): boolean {
  return isCloudConfigured();
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Salvataggio cloud non configurato.' };
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Salvataggio cloud non configurato.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Salvataggio cloud non configurato.' };
  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Chiamato ad ogni cambio di sessione (login/logout/refresh token). */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
