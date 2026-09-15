import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMetaProfile } from './meta';

const maybeSingle = vi.fn();
const upsert = vi.fn();
const eq = vi.fn(() => ({ maybeSingle }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select, upsert }));

vi.mock('./supabaseClient', () => ({
  getSupabase: () => ({ from }),
}));

const { pullCloudProfile, pushCloudProfile, reconcileOnSignIn } = await import('./cloudSync');

describe('cloud sync (Supabase mockato)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('pullCloudProfile ritorna null se non trova la riga', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const result = await pullCloudProfile('user-1');
    expect(result).toBeNull();
    expect(from).toHaveBeenCalledWith('profiles');
  });

  it('pullCloudProfile ritorna il profilo salvato', async () => {
    const saved = createMetaProfile();
    saved.essence = 42;
    maybeSingle.mockResolvedValueOnce({ data: { data: saved }, error: null });
    const result = await pullCloudProfile('user-1');
    expect(result?.essence).toBe(42);
  });

  it('pushCloudProfile fa upsert con user_id e data', async () => {
    upsert.mockResolvedValueOnce({ error: null });
    const profile = createMetaProfile();
    await pushCloudProfile('user-1', profile);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', data: profile }),
    );
  });

  it('reconcileOnSignIn: il cloud vince se esiste già un salvataggio', async () => {
    const cloudProfile = createMetaProfile();
    cloudProfile.essence = 777;
    maybeSingle.mockResolvedValueOnce({ data: { data: cloudProfile }, error: null });
    const local = createMetaProfile();
    local.essence = 1;
    const result = await reconcileOnSignIn('user-1', local);
    expect(result.essence).toBe(777);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('reconcileOnSignIn: senza salvataggio cloud, carica quello locale', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    upsert.mockResolvedValueOnce({ error: null });
    const local = createMetaProfile();
    local.essence = 55;
    const result = await reconcileOnSignIn('user-1', local);
    expect(result.essence).toBe(55);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'user-1' }));
  });
});
