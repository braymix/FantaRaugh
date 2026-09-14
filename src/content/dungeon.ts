/**
 * Generatore di dungeon deterministico (stile Slay the Spire): un grafo a nodi
 * ramificato costruito da un seed. Stesso seed ⇒ stesso identico dungeon.
 *
 * Scelta di design (anteprima PARZIALE): il giocatore vede i RUOLI nemici, il
 * livello di minaccia e il tipo di ricompensa — non le statistiche esatte. Meno
 * "solving" a tavolino, più tensione nella scelta del percorso.
 */

import { makeRng, type Rng } from '@engine/prng';
import type { Role, Row } from '@engine/types';
import type { Placement } from '@engine/build';
import { BOSS_ID, ENEMIES, ENEMY_MAP } from './enemies';

export type NodeType = 'fight' | 'elite' | 'boss' | 'event' | 'reward' | 'rest';
export type RewardKind = 'xp' | 'gold' | 'item' | 'weapon' | 'perk';

export interface EnemyPlacementRef {
  enemyId: string;
  level: number;
  row: Row;
}

export interface NodePreview {
  title: string;
  description: string;
  enemyRoles: Role[]; // solo i ruoli, non le stat (anteprima parziale)
  threat: number; // 1..5
  rewardKind: RewardKind | null;
}

export interface DungeonNode {
  id: string;
  type: NodeType;
  layer: number;
  next: string[];
  encounter: EnemyPlacementRef[];
  threat: number;
  rewardKind: RewardKind | null;
  preview: NodePreview;
}

export interface Dungeon {
  seed: number;
  name: string;
  nodes: Record<string, DungeonNode>;
  layers: string[][];
  startIds: string[];
  bossId: string;
}

const NODE_TITLES: Record<NodeType, string> = {
  fight: 'Scontro',
  elite: 'Élite',
  boss: 'Boss',
  event: 'Evento',
  reward: 'Forziere',
  rest: 'Accampamento',
};

const NON_BOSS = ENEMIES.filter((e) => e.id !== BOSS_ID);

function rowForRole(role: Role): Row {
  return role === 'caster' || role === 'thief' || role === 'healer' ? 'back' : 'front';
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function pickEnemies(rng: Rng, count: number, level: number): EnemyPlacementRef[] {
  const pool = shuffle(NON_BOSS, rng);
  const chosen: EnemyPlacementRef[] = [];
  for (let i = 0; i < count; i++) {
    const def = pool[i % pool.length]!;
    chosen.push({ enemyId: def.id, level, row: rowForRole(def.role) });
  }
  // Garantisce almeno un nemico in prima linea.
  if (!chosen.some((c) => c.row === 'front') && chosen[0]) chosen[0].row = 'front';
  return chosen;
}

function makeEncounter(type: NodeType, rng: Rng, layer: number, baseLevel: number): EnemyPlacementRef[] {
  const level = baseLevel + layer * 2;
  if (type === 'boss') {
    const adds = pickEnemies(rng, 2, level);
    return [{ enemyId: BOSS_ID, level: level + 3, row: 'back' }, ...adds];
  }
  if (type === 'elite') return pickEnemies(rng, rng.int(3, 4), level + 2);
  return pickEnemies(rng, rng.int(2, 3), level);
}

function rewardForType(type: NodeType, rng: Rng): RewardKind | null {
  switch (type) {
    case 'reward':
      return shuffle<RewardKind>(['item', 'weapon', 'perk', 'gold'], rng)[0]!;
    case 'elite':
      return 'weapon';
    case 'boss':
      return 'item';
    case 'fight':
      return rng.chance(0.5) ? 'xp' : 'gold';
    default:
      return null;
  }
}

function preview(type: NodeType, encounter: EnemyPlacementRef[], threat: number, reward: RewardKind | null): NodePreview {
  const roles = encounter.map((e) => ENEMY_MAP[e.enemyId]!.role);
  const descByType: Record<NodeType, string> = {
    fight: 'Un gruppo di nemici sbarra il passaggio.',
    elite: 'Un avversario temibile e i suoi scagnozzi.',
    boss: 'La minaccia finale del dungeon ti attende.',
    event: 'Un bivio incerto: rischio e opportunità.',
    reward: 'Un forziere dimenticato tra le rovine.',
    rest: 'Un momento di quiete per rifiatare.',
  };
  return {
    title: NODE_TITLES[type],
    description: descByType[type],
    enemyRoles: roles,
    threat,
    rewardKind: reward,
  };
}

/** Larghezza di ogni layer del dungeon di prova (start → boss). */
const DEFAULT_LAYER_WIDTHS = [1, 3, 2, 3, 1];

export interface DungeonOptions {
  name?: string;
  baseLevel?: number;
  layerWidths?: number[];
}

export function generateDungeon(seed: number, opts: DungeonOptions = {}): Dungeon {
  const rng = makeRng(seed);
  const widths = opts.layerWidths ?? DEFAULT_LAYER_WIDTHS;
  const baseLevel = opts.baseLevel ?? 8;
  const nodes: Record<string, DungeonNode> = {};
  const layers: string[][] = [];

  widths.forEach((width, layer) => {
    const ids: string[] = [];
    for (let i = 0; i < width; i++) {
      const id = `n${layer}_${i}`;
      const isBossLayer = layer === widths.length - 1;
      const type: NodeType = isBossLayer ? 'boss' : layer === 0 ? 'fight' : pickNodeType(rng);
      const threat =
        type === 'boss' ? 5 : type === 'elite' ? 4 : type === 'fight' ? Math.min(3, 1 + Math.floor(layer / 2) + 1) : 1;
      const encounter = type === 'fight' || type === 'elite' || type === 'boss' ? makeEncounter(type, rng, layer, baseLevel) : [];
      const reward = rewardForType(type, rng);
      nodes[id] = {
        id,
        type,
        layer,
        next: [],
        encounter,
        threat,
        rewardKind: reward,
        preview: preview(type, encounter, threat, reward),
      };
      ids.push(id);
    }
    layers.push(ids);
  });

  // Collega ogni layer al successivo garantendo copertura completa in entrambi i sensi.
  for (let l = 0; l < layers.length - 1; l++) {
    const cur = layers[l]!;
    const nxt = layers[l + 1]!;
    for (let i = 0; i < cur.length; i++) {
      const node = nodes[cur[i]!]!;
      // Ogni nodo punta al "successore proporzionale" e, a volte, a un vicino.
      const primary = Math.min(nxt.length - 1, Math.round((i / Math.max(1, cur.length - 1)) * (nxt.length - 1)));
      const targets = new Set<number>([primary]);
      if (rng.chance(0.5) && primary + 1 < nxt.length) targets.add(primary + 1);
      if (rng.chance(0.4) && primary - 1 >= 0) targets.add(primary - 1);
      node.next = [...targets].sort((a, b) => a - b).map((idx) => nxt[idx]!);
    }
    // Assicura che ogni nodo del layer successivo sia raggiungibile.
    for (let j = 0; j < nxt.length; j++) {
      const reachable = cur.some((cid) => nodes[cid]!.next.includes(nxt[j]!));
      if (!reachable) {
        const closest = Math.min(cur.length - 1, Math.round((j / Math.max(1, nxt.length - 1)) * (cur.length - 1)));
        nodes[cur[closest]!]!.next.push(nxt[j]!);
      }
    }
  }

  return {
    seed,
    name: opts.name ?? 'Cripta di Raugh',
    nodes,
    layers,
    startIds: layers[0]!,
    bossId: layers[layers.length - 1]![0]!,
  };
}

function pickNodeType(rng: Rng): NodeType {
  const roll = rng.next();
  if (roll < 0.5) return 'fight';
  if (roll < 0.68) return 'elite';
  if (roll < 0.82) return 'event';
  if (roll < 0.93) return 'reward';
  return 'rest';
}

/** Converte i riferimenti nemici di un nodo in Placement pronti per la battaglia. */
export function encounterToPlacements(node: DungeonNode): Placement[] {
  return node.encounter.map((ref) => ({ def: ENEMY_MAP[ref.enemyId]!, level: ref.level, row: ref.row }));
}
