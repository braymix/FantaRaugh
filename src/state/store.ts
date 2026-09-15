/**
 * Store globale (Zustand): profilo meta, run in corso, battaglia e navigazione.
 *
 * Il loop è quello di Pokelike: scegli uno starter, percorri la mappa scegliendo
 * i nodi, recluti e fai evolvere la squadra, conquisti 8 medaglie, affronti i
 * Quattro Supremi e il Campione. Se cadi, restano solo le essenze e i
 * potenziamenti permanenti sulle linee evolutive.
 */

import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { ITEM_MAP } from '@content/items';
import { generateRunMap, type RunMap } from '@content/runmap';
import { makeRng } from '@engine/prng';
import type { BattleResult, Row, StatKey } from '@engine/types';
import { healFull } from './party';
import { loadProfile, saveProfile } from './save';
import { createMetaProfile } from './meta';
import { defaultStorage, type StorageAdapter } from './storage';
import { cloudAuthAvailable, getSession, onAuthStateChange, signIn, signOut, signUp } from './auth';
import { queuePushCloudProfile, reconcileOnSignIn } from './cloudSync';
import {
  essenceForNode,
  grantTeamXp,
  makeRunMon,
  nodeSeed,
  runFight,
  xpForNode,
} from './run';
import type { MetaProfile, RunMon, RunState } from './types';

export type Screen = 'home' | 'starter' | 'map' | 'battle' | 'team' | 'meta';

export interface NodeSummary {
  xp: number;
  essence: number;
  evolved: { uid: string; from: string; to: string }[];
}

interface GameState {
  storage: StorageAdapter;
  profile: MetaProfile;
  map: RunMap | null;
  screen: Screen;
  lastBattle: BattleResult | null;
  lastSummary: NodeSummary | null;
  toast: string | null;

  // Account cloud (Supabase, opzionale)
  cloudAvailable: boolean;
  user: Session['user'] | null;
  reconciledUserId: string | null;
  authBusy: boolean;
  authError: string | null;

  init: () => void;
  persist: () => void;
  hardReset: () => void;
  navigate: (s: Screen) => void;
  setToast: (m: string | null) => void;
  toggleNuzlocke: () => void;
  closeTutorial: () => void;
  replayTutorial: () => void;

  // Account cloud
  authSignUp: (email: string, password: string) => Promise<void>;
  authSignIn: (email: string, password: string) => Promise<void>;
  authSignOut: () => Promise<void>;

  // Run
  startRun: (starterId: string, seed?: number) => void;
  abandonRun: () => void;
  enterNode: (nodeId: string) => void;

  // Scelte in sospeso
  resolveRecruit: (accept: boolean, replaceUid?: string) => void;
  resolveItemPick: (itemId: string) => void;
  resolveBall: (defId: string, replaceUid?: string) => void;
  resolveTutor: (uid: string) => void;
  resolveTrade: (giveUid: string) => void;
  dismissPending: () => void;

  // Squadra
  depositMon: (uid: string) => void;
  withdrawMon: (swapUid?: string) => void;
  moveMon: (uid: string, dir: -1 | 1) => void;
  setRow: (uid: string, row: Row) => void;
  equipItem: (uid: string, itemId: string | null) => void;

  // Meta
  buyLineBuff: (line: string, stat: StatKey) => void;
}

function cloneProfile(p: MetaProfile): MetaProfile {
  return structuredClone(p);
}

/** Aggiunge alla squadra, sostituendo se è piena. Ritorna un messaggio. */
function addToTeam(run: RunState, mon: RunMon, lineBuffs: MetaProfile['lineBuffs'], replaceUid?: string): string {
  if (run.team.length < BALANCE.maxRecruits) {
    run.team.push(mon);
  } else if (replaceUid) {
    const idx = run.team.findIndex((m) => m.uid === replaceUid);
    if (idx < 0) return 'Creatura da sostituire non trovata.';
    // L'oggetto tenuto resta tuo: torna nella borsa, come nello scambio.
    const held = run.team[idx]!.itemId;
    if (held) run.bag.push(held);
    run.team[idx] = mon;
  } else {
    return 'Squadra piena: scegli chi sostituire.';
  }
  healFull(mon, lineBuffs, run.team);
  return `${CREATURE_MAP[mon.defId]?.name ?? 'Creatura'} si unisce alla squadra!`;
}

export const useGame = create<GameState>((set, get) => ({
  storage: defaultStorage(),
  profile: createMetaProfile(),
  map: null,
  screen: 'home',
  lastBattle: null,
  lastSummary: null,
  toast: null,

  cloudAvailable: cloudAuthAvailable(),
  user: null,
  reconciledUserId: null,
  authBusy: false,
  authError: null,

  init: () => {
    const storage = get().storage;
    const profile = loadProfile(storage);
    const map = profile.run?.active ? generateRunMap(profile.run.seed) : null;
    set({ profile, map });
    saveProfile(storage, profile);

    if (!get().cloudAvailable) return;
    // Sessione già presente (refresh pagina): riconcilia subito col cloud.
    getSession().then(async (session) => {
      if (!session) return;
      const preReconcile = get().profile;
      const reconciled = await reconcileOnSignIn(session.user.id, preReconcile);
      if (get().profile !== preReconcile) {
        set({ user: session.user, reconciledUserId: session.user.id });
        return;
      }
      const reconciledMap = reconciled.run?.active ? generateRunMap(reconciled.run.seed) : null;
      saveProfile(get().storage, reconciled);
      set({ user: session.user, reconciledUserId: session.user.id, profile: reconciled, map: reconciledMap });
    });
    onAuthStateChange((session) => {
      set({ user: session?.user ?? null });
    });
  },

  persist: () => {
    const { storage, profile, user, reconciledUserId, cloudAvailable } = get();
    saveProfile(storage, profile);
    // Push cloud "best effort": il salvataggio locale (sincrono, sempre valido)
    // resta la fonte di verità immediata; il cloud insegue in background.
    if (cloudAvailable && user && user.id === reconciledUserId) queuePushCloudProfile(user.id, profile);
  },

  hardReset: () => {
    const profile = createMetaProfile();
    saveProfile(get().storage, profile);
    set({ profile, map: null, lastBattle: null, lastSummary: null, screen: 'home', toast: 'Profilo azzerato.' });
  },

  navigate: (screen) => set({ screen }),
  setToast: (toast) => set({ toast }),

  toggleNuzlocke: () => {
    const profile = cloneProfile(get().profile);
    profile.nuzlocke = !profile.nuzlocke;
    set({ profile, toast: profile.nuzlocke ? 'Nuzlocke attivo: chi cade è perso.' : 'Nuzlocke disattivato.' });
    get().persist();
  },

  closeTutorial: () => {
    const profile = cloneProfile(get().profile);
    profile.tutorialSeen = true;
    set({ profile });
    get().persist();
  },

  replayTutorial: () => {
    const profile = cloneProfile(get().profile);
    profile.tutorialSeen = false;
    set({ profile });
    get().persist();
  },

  startRun: (starterId, seed) => {
    const profile = cloneProfile(get().profile);
    const actualSeed = seed ?? (Date.now() >>> 0);
    const starter = makeRunMon(starterId, BALANCE.starterLevel);
    const run: RunState = {
      seed: actualSeed,
      team: [starter],
      deposit: null,
      bag: [],
      currentNodeId: null,
      clearedNodeIds: [],
      badges: 0,
      nuzlocke: profile.nuzlocke,
      active: true,
      pending: null,
    };
    healFull(starter, profile.lineBuffs, run.team);
    profile.run = run;
    profile.records.runs += 1;
    if (!profile.seen.includes(starter.defId)) profile.seen.push(starter.defId);
    set({ profile, map: generateRunMap(actualSeed), screen: 'map', lastBattle: null, lastSummary: null });
    get().persist();
  },

  abandonRun: () => {
    const profile = cloneProfile(get().profile);
    if (profile.run) profile.run.active = false;
    set({ profile, map: null, screen: 'home' });
    get().persist();
  },

  enterNode: (nodeId) => {
    const { map } = get();
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!map || !run || !run.active || run.pending) return;
    const node = map.nodes[nodeId];
    if (!node) return;

    // Solo nodi raggiungibili dalla posizione corrente.
    const reachable =
      run.currentNodeId === null
        ? map.startIds.includes(nodeId)
        : (map.nodes[run.currentNodeId]?.next ?? []).includes(nodeId);
    if (!reachable) return;

    for (const e of node.encounter) if (!profile.seen.includes(e.defId)) profile.seen.push(e.defId);

    if (node.encounter.length > 0) {
      const outcome = runFight(run, map, node, profile.lineBuffs);
      for (const mon of run.team) {
        const hp = outcome.hpByUid[mon.uid];
        if (hp !== undefined) mon.hp = hp;
      }

      if (!outcome.won) {
        // Sconfitta: la run finisce, ma le essenze guadagnate restano.
        run.active = false;
        const essence = Math.round(essenceForNode(node) / 2);
        profile.essence += essence;
        set({ profile, lastBattle: outcome.result, lastSummary: { xp: 0, essence, evolved: [] }, screen: 'battle' });
        get().persist();
        return;
      }

      // I caduti: persi per sempre in Nuzlocke, altrimenti tornano con 1 HP.
      for (const uid of outcome.faintedUids) {
        const mon = run.team.find((m) => m.uid === uid);
        if (!mon) continue;
        if (run.nuzlocke) mon.fainted = true;
        else {
          mon.fainted = false;
          mon.hp = 1;
        }
      }
      if (run.nuzlocke) run.team = run.team.filter((m) => !m.fainted);

      // Solo dopo aver sconfitto un comandante (mini boss) la squadra recupera
      // tutte le forze. Gli altri scontri lasciano gli HP consumati.
      if (node.kind === 'commander') {
        for (const mon of run.team) {
          if (mon.fainted) continue;
          healFull(mon, profile.lineBuffs, run.team);
        }
      }

      const xp = xpForNode(node);
      const evolved = grantTeamXp(run.team, xp);
      const essence = essenceForNode(node);
      profile.essence += essence;
      run.clearedNodeIds.push(nodeId);
      run.currentNodeId = nodeId;

      if (node.kind === 'commander') run.badges += 1;
      profile.records.bestBadges = Math.max(profile.records.bestBadges, run.badges);
      if (node.kind === 'boss') {
        run.active = false;
        profile.records.championWins += 1;
      }
      // Creatura selvatica battuta: la puoi reclutare.
      if (node.kind === 'wild' && node.encounter[0]) {
        run.pending = {
          kind: 'recruit',
          defId: node.encounter[0].defId,
          level: Math.max(1, node.level - BALANCE.recruitLevelPenalty),
        };
      }

      set({ profile, lastBattle: outcome.result, lastSummary: { xp, essence, evolved }, screen: 'battle' });
      get().persist();
      return;
    }

    // --- Nodi non combattivi ---
    let toast = '';
    switch (node.kind) {
      case 'heal': {
        for (const mon of run.team) {
          if (!run.nuzlocke) mon.fainted = false;
          healFull(mon, profile.lineBuffs, run.team);
        }
        toast = 'La squadra recupera tutte le forze.';
        break;
      }
      case 'item':
        run.pending = { kind: 'item', offers: node.offers };
        break;
      case 'ball':
        run.pending = { kind: 'ball', offers: node.offers, level: node.level };
        break;
      case 'tutor':
        run.pending = { kind: 'tutor' };
        break;
      case 'trade':
        if (node.offers[0]) run.pending = { kind: 'trade', defId: node.offers[0], level: node.level + 4 };
        break;
      case 'event': {
        // Esito deterministico dal seed del nodo: nessun reload-scumming.
        const rng = makeRng(nodeSeed(map.seed, node.id));
        const roll = rng.next();
        if (roll < 0.3) {
          const xp = xpForNode(node) * 2;
          grantTeamXp(run.team, xp);
          toast = `Un vecchio addestratore vi istruisce: +${Math.round(xp)} XP.`;
        } else if (roll < 0.55) {
          profile.essence += BALANCE.essencePerNode * 3;
          toast = 'Trovi un deposito di essenze.';
        } else if (roll < 0.8) {
          for (const mon of run.team) {
            const half = Math.round(mon.hp * 1.5);
            mon.hp = Math.max(mon.hp, half);
          }
          toast = 'Una sorgente vi ristora parzialmente.';
        } else {
          for (const mon of run.team) mon.hp = Math.max(1, Math.round(mon.hp * 0.8));
          toast = 'Unʼimboscata! La squadra ne esce ammaccata.';
        }
        break;
      }
      default:
        break;
    }

    run.clearedNodeIds.push(nodeId);
    run.currentNodeId = nodeId;
    set({ profile, lastBattle: null, lastSummary: null, screen: 'map', toast: toast || null });
    get().persist();
  },

  resolveRecruit: (accept, replaceUid) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run?.pending || run.pending.kind !== 'recruit') return;
    if (!accept) {
      run.pending = null;
      set({ profile, toast: 'Lasci andare la creatura.' });
      get().persist();
      return;
    }
    const mon = makeRunMon(run.pending.defId, run.pending.level);
    const msg = addToTeam(run, mon, profile.lineBuffs, replaceUid);
    if (msg.startsWith('Squadra piena')) {
      set({ toast: msg });
      return;
    }
    run.pending = null;
    set({ profile, toast: msg });
    get().persist();
  },

  resolveItemPick: (itemId) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run?.pending || run.pending.kind !== 'item') return;
    if (!run.pending.offers.includes(itemId)) return;
    run.bag.push(itemId);
    run.pending = null;
    set({ profile, toast: `${ITEM_MAP[itemId]?.name ?? 'Oggetto'} nella borsa.` });
    get().persist();
  },

  resolveBall: (defId, replaceUid) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run?.pending || run.pending.kind !== 'ball') return;
    if (!run.pending.offers.includes(defId)) return;
    const mon = makeRunMon(defId, run.pending.level);
    const msg = addToTeam(run, mon, profile.lineBuffs, replaceUid);
    if (msg.startsWith('Squadra piena')) {
      set({ toast: msg });
      return;
    }
    run.pending = null;
    set({ profile, toast: msg });
    get().persist();
  },

  resolveTutor: (uid) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run?.pending || run.pending.kind !== 'tutor') return;
    const mon = run.team.find((m) => m.uid === uid);
    if (!mon) return;
    if (mon.moveTier >= BALANCE.moveTierMax) {
      set({ toast: 'Mossa già al massimo.' });
      return;
    }
    mon.moveTier += 1;
    run.pending = null;
    set({ profile, toast: `Mossa finale potenziata (tier ${mon.moveTier}).` });
    get().persist();
  },

  resolveTrade: (giveUid) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run?.pending || run.pending.kind !== 'trade') return;
    const idx = run.team.findIndex((m) => m.uid === giveUid);
    if (idx < 0) return;
    const incoming = makeRunMon(run.pending.defId, run.pending.level);
    // L'oggetto tenuto resta a te: torna nella borsa.
    const held = run.team[idx]!.itemId;
    if (held) run.bag.push(held);
    run.team[idx] = incoming;
    healFull(incoming, profile.lineBuffs, run.team);
    run.pending = null;
    set({ profile, toast: `Scambio concluso: arriva ${CREATURE_MAP[incoming.defId]?.name ?? '?'}.` });
    get().persist();
  },

  dismissPending: () => {
    const profile = cloneProfile(get().profile);
    if (!profile.run) return;
    profile.run.pending = null;
    set({ profile });
    get().persist();
  },

  depositMon: (uid) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run?.active) return;
    // Lo schieramento si decide prima del combattimento: mai con una scelta aperta.
    if (run.pending) {
      set({ toast: 'Risolvi prima la scelta in corso.' });
      return;
    }
    if (run.deposit) {
      set({ toast: 'Il deposito è già occupato.' });
      return;
    }
    if (run.team.length <= 1) {
      set({ toast: 'Non puoi restare senza squadra.' });
      return;
    }
    const idx = run.team.findIndex((m) => m.uid === uid);
    if (idx < 0) return;
    const [mon] = run.team.splice(idx, 1);
    run.deposit = mon!;
    set({
      profile,
      toast: `${CREATURE_MAP[mon!.defId]?.name ?? 'Creatura'} va in deposito: riposa, ma non prende esperienza.`,
    });
    get().persist();
  },

  withdrawMon: (swapUid) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run?.active || !run.deposit) return;
    if (run.pending) {
      set({ toast: 'Risolvi prima la scelta in corso.' });
      return;
    }
    const incoming = run.deposit;
    if (run.team.length < BALANCE.maxRecruits) {
      run.team.push(incoming);
      run.deposit = null;
    } else if (swapUid) {
      const idx = run.team.findIndex((m) => m.uid === swapUid);
      if (idx < 0) return;
      const outgoing = run.team[idx]!;
      run.team[idx] = incoming;
      run.deposit = outgoing;
    } else {
      set({ toast: 'Squadra piena: scegli chi mandare in deposito.' });
      return;
    }
    // Ha riposato: rientra in forze.
    healFull(incoming, profile.lineBuffs, run.team);
    set({ profile, toast: `${CREATURE_MAP[incoming.defId]?.name ?? 'Creatura'} rientra in squadra.` });
    get().persist();
  },

  moveMon: (uid, dir) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    if (!run) return;
    const i = run.team.findIndex((m) => m.uid === uid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= run.team.length) return;
    [run.team[i], run.team[j]] = [run.team[j]!, run.team[i]!];
    set({ profile });
    get().persist();
  },

  setRow: (uid, row) => {
    const profile = cloneProfile(get().profile);
    const mon = profile.run?.team.find((m) => m.uid === uid);
    if (!mon) return;
    mon.row = row;
    set({ profile });
    get().persist();
  },

  equipItem: (uid, itemId) => {
    const profile = cloneProfile(get().profile);
    const run = profile.run;
    const mon = run?.team.find((m) => m.uid === uid);
    if (!run || !mon) return;
    if (itemId) {
      const bagIdx = run.bag.indexOf(itemId);
      if (bagIdx < 0) return;
      run.bag.splice(bagIdx, 1);
      if (mon.itemId) run.bag.push(mon.itemId);
      mon.itemId = itemId;
    } else if (mon.itemId) {
      run.bag.push(mon.itemId);
      mon.itemId = null;
    }
    set({ profile });
    get().persist();
  },

  buyLineBuff: (line, stat) => {
    const profile = cloneProfile(get().profile);
    if (profile.essence < BALANCE.lineBuffCost) {
      set({ toast: 'Essenze insufficienti.' });
      return;
    }
    const buffs = (profile.lineBuffs[line] ??= {});
    const current = buffs[stat] ?? 0;
    if (current >= BALANCE.lineBuffMaxPoints) {
      set({ toast: 'Potenziamento già al massimo.' });
      return;
    }
    buffs[stat] = current + 1;
    profile.essence -= BALANCE.lineBuffCost;
    set({ profile, toast: `Potenziamento permanente applicato alla linea.` });
    get().persist();
  },

  authSignUp: async (email, password) => {
    set({ authBusy: true, authError: null });
    const result = await signUp(email, password);
    set({ authBusy: false, authError: result.error ?? null });
    if (result.ok) set({ toast: 'Registrazione avviata: controlla la mail per confermare.' });
  },

  authSignIn: async (email, password) => {
    set({ authBusy: true, authError: null });
    const result = await signIn(email, password);
    if (!result.ok) {
      set({ authBusy: false, authError: result.error ?? null });
      return;
    }
    const session = await getSession();
    if (session) {
      const preReconcile = get().profile;
      const reconciled = await reconcileOnSignIn(session.user.id, preReconcile);
      if (get().profile !== preReconcile) {
        set({ user: session.user, reconciledUserId: session.user.id, toast: 'Accesso effettuato: salvataggio sincronizzato.' });
      } else {
        const reconciledMap = reconciled.run?.active ? generateRunMap(reconciled.run.seed) : null;
        saveProfile(get().storage, reconciled);
        set({
          user: session.user,
          reconciledUserId: session.user.id,
          profile: reconciled,
          map: reconciledMap,
          toast: 'Accesso effettuato: salvataggio sincronizzato.',
        });
      }
    }
    set({ authBusy: false });
  },

  authSignOut: async () => {
    set({ authBusy: true, authError: null });
    await signOut();
    set({ authBusy: false, user: null, reconciledUserId: null, toast: 'Disconnesso: il salvataggio resta locale.' });
  },
}));
