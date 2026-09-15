import { describe, expect, it, vi } from 'vitest';

const signUp = vi.fn();
const signInWithPassword = vi.fn();
const signOut = vi.fn();
const getSession = vi.fn();

vi.mock('./supabaseClient', () => ({
  getSupabase: () => ({ auth: { signUp, signInWithPassword, signOut, getSession } }),
  isCloudConfigured: () => true,
}));

const authModule = await import('./auth');

describe('autenticazione (Supabase mockato)', () => {
  it('signUp propaga il messaggio di errore', async () => {
    signUp.mockResolvedValueOnce({ error: { message: 'email già in uso' } });
    const result = await authModule.signUp('a@b.com', 'password123');
    expect(result).toEqual({ ok: false, error: 'email già in uso' });
  });

  it('signIn ok quando Supabase non ritorna errore', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    const result = await authModule.signIn('a@b.com', 'password123');
    expect(result).toEqual({ ok: true });
  });

  it('signOut ok quando Supabase non ritorna errore', async () => {
    signOut.mockResolvedValueOnce({ error: null });
    const result = await authModule.signOut();
    expect(result).toEqual({ ok: true });
  });

  it('getSession ritorna la sessione corrente', async () => {
    getSession.mockResolvedValueOnce({ data: { session: { user: { id: 'u1' } } } });
    const session = await authModule.getSession();
    expect(session?.user.id).toBe('u1');
  });
});
