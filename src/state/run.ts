/**
 * Logica di una run nel dungeon: costruzione della battaglia da un nodo,
 * applicazione di HP di trascinamento tra i fight, e calcolo delle ricompense.
 * Separata dallo store per essere testabile in isolamento.
 */

import { BALANCE } from '@content/balance';
import { encounterToPlacements, type Dungeon, type DungeonNode } from '@content/dungeon';
import { PERKS } from '@content/perks';
import { WEAPONS } from '@content/weapons';
import { buildBattleState } from '@engine/build';
import { simulateBattle } from '@engine/battle';
import { REGISTRY } from '@content/registry';
import type { BattleResult } from '@engine/types';
import { buildPlayerPlacements } from './loadout';
import { grantXp } from './progression';
import type { OwnedPerk, OwnedWeapon, PlayerProfile } from './types';

/** Hash stabile stringa → intero 32 bit, per derivare seed dei nodi. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function nodeSeed(dungeonSeed: number, nodeId: string): number {
  return (dungeonSeed ^ hashString(nodeId)) >>> 0;
}

export interface FightOutcome {
  result: BattleResult;
  won: boolean;
  carryHp: Record<string, number>;
}

/** Simula il fight di un nodo, applicando gli HP di trascinamento correnti. */
export function runFight(profile: PlayerProfile, dungeon: Dungeon, node: DungeonNode): FightOutcome {
  const playerPlacements = buildPlayerPlacements(profile);
  const enemyPlacements = encounterToPlacements(node);
  const state = buildBattleState(playerPlacements, enemyPlacements);

  // Applica gli HP residui della run (i fight non curano da soli).
  const carry = profile.run?.carryHp ?? {};
  for (const u of state.units) {
    if (u.side !== 'player') continue;
    const hp = carry[u.defId];
    if (hp !== undefined) u.hp = Math.max(1, Math.min(u.base.maxHp, hp));
  }

  const result = simulateBattle(state, nodeSeed(dungeon.seed, node.id), REGISTRY);
  const won = result.winner === 'player';

  const carryHp: Record<string, number> = { ...carry };
  for (const snap of result.finalUnits) {
    if (snap.side !== 'player') continue;
    carryHp[snap.defId] = snap.alive ? snap.hp : 1; // i caduti tornano a 1 HP dopo la vittoria
  }

  return { result, won, carryHp };
}

let instanceCounter = 0;
function newInstanceId(prefix: string): string {
  instanceCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${instanceCounter}`;
}

export interface RewardSummary {
  gold: number;
  gems: number;
  xp: number;
  newWeapon?: string;
  newPerk?: string;
}

/**
 * Applica le ricompense di un nodo al profilo (muta). XP va a eroi in squadra e
 * alle rispettive armi/perk equipaggiati. Nessun oggetto finto: le ricompense
 * "arma/perk" creano istanze reali dal catalogo.
 */
export function grantNodeRewards(profile: PlayerProfile, node: DungeonNode): RewardSummary {
  const summary: RewardSummary = { gold: 0, gems: 0, xp: 0 };
  const threat = Math.max(1, node.threat);

  // XP di base per aver completato il nodo (se combattimento).
  if (node.encounter.length > 0) {
    const xp = BALANCE.xpPerThreat * threat;
    summary.xp = xp;
    grantTeamXp(profile, xp);
  }

  switch (node.rewardKind) {
    case 'gold': {
      const gold = BALANCE.goldPerThreat * threat;
      profile.currencies.gold += gold;
      summary.gold += gold;
      break;
    }
    case 'item': {
      profile.currencies.gems += 10;
      summary.gems += 10;
      break;
    }
    case 'xp': {
      const bonus = BALANCE.xpPerThreat * threat;
      summary.xp += bonus;
      grantTeamXp(profile, bonus);
      break;
    }
    case 'weapon': {
      const def = WEAPONS[hashString(node.id) % WEAPONS.length]!;
      const w: OwnedWeapon = {
        instanceId: newInstanceId('wp'),
        defId: def.id,
        level: 1,
        xp: 0,
        perkSlots: Array.from({ length: BALANCE.raritySlots[def.rarity] }, () => null),
      };
      profile.weapons.push(w);
      summary.newWeapon = def.name;
      break;
    }
    case 'perk': {
      const def = PERKS[hashString(node.id) % PERKS.length]!;
      const p: OwnedPerk = { instanceId: newInstanceId('pk'), defId: def.id, level: 1, xp: 0 };
      profile.perks.push(p);
      summary.newPerk = def.name;
      break;
    }
    default:
      break;
  }

  return summary;
}

function grantTeamXp(profile: PlayerProfile, xp: number): void {
  for (const defId of profile.team) {
    const h = profile.heroes.find((x) => x.defId === defId);
    if (!h) continue;
    grantXp(h, xp);
    const w = profile.weapons.find((x) => x.instanceId === h.weaponInstanceId);
    if (w) {
      grantXp(w, Math.round(xp * 0.6));
      for (const slot of w.perkSlots) {
        if (!slot) continue;
        const p = profile.perks.find((x) => x.instanceId === slot);
        if (p) grantXp(p, Math.round(xp * 0.4));
      }
    }
  }
}
