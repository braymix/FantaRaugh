/**
 * Logica di una run: combattimenti dei nodi, esperienza, evoluzioni e ricompense.
 * Separata dallo store per restare testabile in isolamento.
 */

import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { REGISTRY } from '@content/registry';
import { stageForLevel, type MapNode, type RunMap } from '@content/runmap';
import { simulateBattle } from '@engine/battle';
import { buildBattleState, type Placement } from '@engine/build';
import type { BaseStats, BattleResult, GrowthCurve, UnitDef } from '@engine/types';
import { buildTeamPlacements } from './party';
import { grantXp } from './progression';
import type { LineBuffs, RunMon, RunState } from './types';

/** Hash stabile stringa → intero 32 bit, per derivare i seed dei nodi. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function nodeSeed(runSeed: number, nodeId: string): number {
  return (runSeed ^ hashString(nodeId)) >>> 0;
}

/**
 * I nemici usano lo stesso catalogo del giocatore, ma con il moltiplicatore di
 * potenza globale: è l'unico knob che regola la durezza dell'intero gioco.
 */
function scaleEnemy(def: UnitDef): UnitDef {
  const k = BALANCE.enemyPowerScale;
  const b: BaseStats = {
    ...def.baseStats,
    maxHp: Math.round(def.baseStats.maxHp * k),
    atk: Math.round(def.baseStats.atk * k),
    def: Math.round(def.baseStats.def * k),
    resistance: Math.round(def.baseStats.resistance * k),
  };
  const perLevel: GrowthCurve['perLevel'] = {};
  for (const [key, value] of Object.entries(def.growth.perLevel)) {
    perLevel[key as keyof GrowthCurve['perLevel']] = Math.round((value ?? 0) * k * 10) / 10;
  }
  return { ...def, baseStats: b, growth: { perLevel } };
}

export function enemyPlacements(node: MapNode): Placement[] {
  return node.encounter
    .map((ref) => {
      const def = CREATURE_MAP[ref.defId];
      return def ? { def: scaleEnemy(def), level: ref.level, row: ref.row } : null;
    })
    .filter((p): p is Placement => p !== null);
}

export interface FightOutcome {
  result: BattleResult;
  won: boolean;
  /** HP residui per uid, da riportare nella squadra. */
  hpByUid: Record<string, number>;
  faintedUids: string[];
}

export function runFight(run: RunState, map: RunMap, node: MapNode, lineBuffs: LineBuffs): FightOutcome {
  const alive = run.team.filter((m) => !m.fainted);
  const placements = buildTeamPlacements(run.team, lineBuffs);
  const state = buildBattleState(placements, enemyPlacements(node));

  // Gli HP correnti si trascinano tra i combattimenti (niente cure gratis).
  state.units
    .filter((u) => u.side === 'player')
    .forEach((u, i) => {
      const mon = alive[i];
      if (mon) u.hp = Math.max(1, Math.min(u.base.maxHp, mon.hp));
    });

  const result = simulateBattle(state, nodeSeed(map.seed, node.id), REGISTRY);
  const won = result.winner === 'player';

  const hpByUid: Record<string, number> = {};
  const faintedUids: string[] = [];
  result.finalUnits
    .filter((s) => s.side === 'player')
    .forEach((snap, i) => {
      const mon = alive[i];
      if (!mon) return;
      hpByUid[mon.uid] = snap.alive ? snap.hp : 0;
      if (!snap.alive) faintedUids.push(mon.uid);
    });

  return { result, won, hpByUid, faintedUids };
}

/** Esperienza di un nodo, in funzione della minaccia. */
export function xpForNode(node: MapNode): number {
  return BALANCE.xpPerThreat * Math.max(1, node.preview.threat) * (1 + node.segment * 0.35);
}

/** Essenze (valuta meta) guadagnate ripulendo un nodo. */
export function essenceForNode(node: MapNode): number {
  if (node.kind === 'champion') return BALANCE.essenceOnChampion;
  if (node.kind === 'gym') return BALANCE.essencePerBadge;
  return BALANCE.essencePerNode * Math.max(1, node.preview.threat);
}

/**
 * Applica XP alla squadra e fa evolvere chi ha raggiunto il livello richiesto.
 * Ritorna gli id delle creature evolute (per mostrarlo al giocatore).
 */
export function grantTeamXp(team: RunMon[], xp: number): { uid: string; from: string; to: string }[] {
  const evolved: { uid: string; from: string; to: string }[] = [];
  for (const mon of team) {
    if (mon.fainted) continue;
    grantXp(mon, Math.round(xp));
    // Evoluzioni a catena: un salto di più livelli può attraversare due stadi.
    for (;;) {
      const def = CREATURE_MAP[mon.defId];
      const evo = def?.evolution;
      if (!evo || mon.level < evo.atLevel) break;
      const next = CREATURE_MAP[evo.toId];
      if (!next) break;
      evolved.push({ uid: mon.uid, from: mon.defId, to: evo.toId });
      mon.defId = evo.toId;
      // L'evoluzione alza gli HP massimi: il guadagno va in HP correnti.
      mon.hp = Math.round(mon.hp * 1.2);
    }
  }
  return evolved;
}

let counter = 0;
/** Crea una creatura per la squadra (starter, reclutamento, scambio). */
export function makeRunMon(defId: string, level: number, row?: RunMon['row']): RunMon {
  counter += 1;
  const resolved = stageForLevel(defId, level);
  const def = CREATURE_MAP[resolved] ?? CREATURE_MAP[defId]!;
  const role = def.role;
  return {
    uid: `m${Date.now().toString(36)}_${counter}`,
    defId: def.id,
    level,
    xp: 0,
    hp: 0, // lo store lo porta subito a pieno con healFull()
    itemId: null,
    moveTier: 1,
    row: row ?? (role === 'defender' || role === 'blade' ? 'front' : 'back'),
    fainted: false,
  };
}
