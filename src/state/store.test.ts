import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateRunMap, type RunMap } from '@content/runmap';
import { createMetaProfile } from './meta';
import type { MetaProfile, RunState } from './types';

const signIn = vi.fn();
const getSession = vi.fn();
const reconcileOnSignIn = vi.fn();
const queuePushCloudProfile = vi.fn();

vi.mock('./auth', () => ({
  cloudAuthAvailable: () => true,
  signUp: vi.fn(),
  signIn: (email: string, password: string) => signIn(email, password),
  signOut: vi.fn(),
  getSession: () => getSession(),
  onAuthStateChange: () => () => {},
}));

vi.mock('./cloudSync', () => ({
  reconcileOnSignIn: (userId: string, profile: MetaProfile) => reconcileOnSignIn(userId, profile),
  queuePushCloudProfile: (userId: string, profile: MetaProfile) => queuePushCloudProfile(userId, profile),
}));

const { useGame } = await import('./store');

function makeRun(seed: number, currentNodeId: string | null, clearedNodeIds: string[]): RunState {
  return {
    seed,
    team: [],
    deposit: null,
    bag: [],
    currentNodeId,
    clearedNodeIds,
    badges: 0,
    nuzlocke: false,
    active: true,
    pending: null,
  };
}

/** Trova un arco (nodo -> successivo) che non porta a uno scontro, per testare
 * la navigazione senza dover simulare una battaglia. */
function findNonCombatEdge(map: RunMap): { from: string; to: string } {
  for (const from of Object.keys(map.nodes)) {
    for (const to of map.nodes[from]!.next) {
      if (map.nodes[to]!.encounter.length === 0) return { from, to };
    }
  }
  throw new Error('nessun arco senza scontro trovato nella mappa generata');
}

describe('store: riconciliazione al login e mappa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authSignIn rigenera la mappa in base alla run riconciliata, cosi la navigazione resta possibile', async () => {
    // Dispositivo locale: run attiva con un proprio seed/mappa.
    const localSeed = 111;
    const localProfile: MetaProfile = { ...createMetaProfile(), run: makeRun(localSeed, null, []) };
    useGame.setState({
      profile: localProfile,
      map: generateRunMap(localSeed),
      user: null,
      reconciledUserId: null,
    });

    // Cloud (altro dispositivo): run attiva con un seed diverso, già a metà percorso.
    const cloudSeed = 222;
    const cloudMap = generateRunMap(cloudSeed);
    const edge = findNonCombatEdge(cloudMap);
    const cloudProfile: MetaProfile = {
      ...createMetaProfile(),
      run: makeRun(cloudSeed, edge.from, [edge.from]),
    };

    signIn.mockResolvedValueOnce({ ok: true });
    getSession.mockResolvedValueOnce({ user: { id: 'user-1' } });
    reconcileOnSignIn.mockResolvedValueOnce(cloudProfile);

    await useGame.getState().authSignIn('a@b.com', 'password123');

    expect(useGame.getState().profile.run?.seed).toBe(cloudSeed);
    expect(useGame.getState().map?.seed).toBe(cloudSeed);

    // Prova end-to-end: il nodo raggiungibile secondo la run riconciliata deve
    // davvero risultare raggiungibile nella mappa in memoria (non quella stale
    // del seed locale, che avrebbe una topologia diversa a quell'id).
    useGame.getState().enterNode(edge.to);
    expect(useGame.getState().profile.run?.currentNodeId).toBe(edge.to);
    expect(useGame.getState().profile.run?.clearedNodeIds).toContain(edge.to);
  });
});
