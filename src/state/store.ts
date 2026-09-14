/**
 * Store globale (Zustand): profilo, run nel dungeon, battaglia corrente e
 * navigazione UI. È l'unico strato "mutabile" lato client; engine e contenuti
 * restano puri. Ogni mutazione che cambia il profilo lo persiste.
 */

import { create } from 'zustand';
import { BALANCE } from '@content/balance';
import { generateDungeon, type Dungeon } from '@content/dungeon';
import type { BattleResult, Row } from '@engine/types';
import { defaultStorage, type StorageAdapter } from './storage';
import { loadProfile, saveProfile } from './save';
import { createDefaultProfile } from './profile';
import type { PlayerProfile } from './types';
import { grantNodeRewards, runFight, type RewardSummary } from './run';
import { grantXp } from './progression';

export type Screen = 'home' | 'team' | 'dungeon' | 'battle';

interface GameState {
  storage: StorageAdapter;
  profile: PlayerProfile;
  dungeon: Dungeon | null;
  screen: Screen;
  lastBattle: BattleResult | null;
  lastReward: RewardSummary | null;
  toast: string | null;

  init: () => void;
  persist: () => void;
  hardReset: () => void;
  navigate: (screen: Screen) => void;
  setToast: (msg: string | null) => void;

  // Squadra / equipaggiamento
  toggleTeam: (defId: string) => void;
  setRow: (defId: string, row: Row) => void;
  equipWeapon: (defId: string, weaponInstanceId: string | null) => void;
  setPerkSlot: (weaponInstanceId: string, slot: number, perkInstanceId: string | null) => void;
  trainHero: (defId: string) => void;

  // Dungeon / run
  newDungeon: (seed?: number) => boolean;
  abandonRun: () => void;
  enterNode: (nodeId: string) => void;
}

const TRAIN_COST = 60; // oro per sessione di addestramento
const TRAIN_XP = 400;

function refillEnergy(profile: PlayerProfile, now: number): void {
  const { energy } = profile;
  if (energy.current >= energy.max) {
    energy.lastRefillAt = now;
    return;
  }
  const elapsedMin = (now - energy.lastRefillAt) / 60000;
  const gained = Math.floor(elapsedMin / BALANCE.energyRefillMinutes);
  if (gained > 0) {
    energy.current = Math.min(energy.max, energy.current + gained);
    energy.lastRefillAt = now;
  }
}

export const useGame = create<GameState>((set, get) => ({
  storage: defaultStorage(),
  profile: createDefaultProfile(),
  dungeon: null,
  screen: 'home',
  lastBattle: null,
  lastReward: null,
  toast: null,

  init: () => {
    const storage = get().storage;
    const profile = loadProfile(storage);
    refillEnergy(profile, Date.now());
    // Ripristina un dungeon in corso, se la run è attiva.
    const dungeon = profile.run?.active ? generateDungeon(profile.run.dungeonSeed) : null;
    set({ profile, dungeon });
    saveProfile(storage, profile);
  },

  persist: () => saveProfile(get().storage, get().profile),

  hardReset: () => {
    const profile = createDefaultProfile();
    saveProfile(get().storage, profile);
    set({ profile, dungeon: null, lastBattle: null, lastReward: null, screen: 'home', toast: 'Profilo reimpostato.' });
  },

  navigate: (screen) => set({ screen }),
  setToast: (toast) => set({ toast }),

  toggleTeam: (defId) => {
    const profile = structuredClone(get().profile);
    const idx = profile.team.indexOf(defId);
    if (idx >= 0) {
      profile.team.splice(idx, 1);
    } else if (profile.team.length < BALANCE.teamSize) {
      profile.team.push(defId);
    } else {
      set({ toast: `Squadra piena (max ${BALANCE.teamSize}).` });
      return;
    }
    set({ profile });
    get().persist();
  },

  setRow: (defId, row) => {
    const profile = structuredClone(get().profile);
    const h = profile.heroes.find((x) => x.defId === defId);
    if (h) h.row = row;
    set({ profile });
    get().persist();
  },

  equipWeapon: (defId, weaponInstanceId) => {
    const profile = structuredClone(get().profile);
    // Un'arma può stare su un solo eroe: la si toglie a chi la aveva.
    if (weaponInstanceId) {
      for (const other of profile.heroes) {
        if (other.weaponInstanceId === weaponInstanceId) other.weaponInstanceId = null;
      }
    }
    const h = profile.heroes.find((x) => x.defId === defId);
    if (h) h.weaponInstanceId = weaponInstanceId;
    set({ profile });
    get().persist();
  },

  setPerkSlot: (weaponInstanceId, slot, perkInstanceId) => {
    const profile = structuredClone(get().profile);
    const w = profile.weapons.find((x) => x.instanceId === weaponInstanceId);
    if (!w || slot < 0 || slot >= w.perkSlots.length) return;
    // Un perk in un solo slot: rimuovilo da dove fosse.
    if (perkInstanceId) {
      for (const wp of profile.weapons) {
        wp.perkSlots = wp.perkSlots.map((p) => (p === perkInstanceId ? null : p));
      }
    }
    w.perkSlots[slot] = perkInstanceId;
    set({ profile });
    get().persist();
  },

  trainHero: (defId) => {
    const profile = structuredClone(get().profile);
    if (profile.currencies.gold < TRAIN_COST) {
      set({ toast: 'Oro insufficiente.' });
      return;
    }
    const h = profile.heroes.find((x) => x.defId === defId);
    if (!h) return;
    profile.currencies.gold -= TRAIN_COST;
    grantXp(h, TRAIN_XP);
    set({ profile, toast: `${defId} si è addestrato.` });
    get().persist();
  },

  newDungeon: (seed) => {
    const profile = structuredClone(get().profile);
    if (profile.team.length === 0) {
      set({ toast: 'Schiera almeno un eroe.' });
      return false;
    }
    if (profile.energy.current < BALANCE.energyPerRun) {
      set({ toast: 'Energia insufficiente.' });
      return false;
    }
    profile.energy.current -= BALANCE.energyPerRun;
    const actualSeed = seed ?? (Date.now() >>> 0);
    profile.run = {
      dungeonSeed: actualSeed,
      currentNodeId: null,
      clearedNodeIds: [],
      carryHp: {},
      active: true,
    };
    const dungeon = generateDungeon(actualSeed);
    set({ profile, dungeon, screen: 'dungeon', lastBattle: null, lastReward: null });
    get().persist();
    return true;
  },

  abandonRun: () => {
    const profile = structuredClone(get().profile);
    if (profile.run) profile.run.active = false;
    set({ profile, dungeon: null, screen: 'home' });
    get().persist();
  },

  enterNode: (nodeId) => {
    const { dungeon } = get();
    const profile = structuredClone(get().profile);
    if (!dungeon || !profile.run || !profile.run.active) return;
    const node = dungeon.nodes[nodeId];
    if (!node) return;

    if (node.encounter.length > 0) {
      const outcome = runFight(profile, dungeon, node);
      if (outcome.won) {
        const reward = grantNodeRewards(profile, node);
        profile.run.clearedNodeIds.push(nodeId);
        profile.run.currentNodeId = nodeId;
        profile.run.carryHp = outcome.carryHp;
        if (node.type === 'boss') profile.run.active = false;
        set({ profile, lastBattle: outcome.result, lastReward: reward, screen: 'battle' });
      } else {
        profile.run.active = false;
        set({ profile, lastBattle: outcome.result, lastReward: null, screen: 'battle' });
      }
    } else {
      // Nodo non combattivo: si risolve subito.
      if (node.type === 'rest') profile.run.carryHp = {}; // riposo = squadra a piena vita
      const reward = grantNodeRewards(profile, node);
      profile.run.clearedNodeIds.push(nodeId);
      profile.run.currentNodeId = nodeId;
      const msg = node.type === 'rest' ? 'La squadra recupera le forze.' : 'Ricompensa raccolta.';
      set({ profile, lastBattle: null, lastReward: reward, toast: msg, screen: 'dungeon' });
    }
    get().persist();
  },
}));
