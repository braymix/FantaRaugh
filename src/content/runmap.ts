/**
 * Mappa della run, in stile Pokelike: una lunga catena di nodi ramificata con
 * **8 palestre a tema di tipo** come checkpoint, poi i Quattro Supremi e il
 * Campione.
 *
 * Deterministica dal seed: stesso seed ⇒ stessa mappa, stessi incontri, stesse
 * offerte. Ogni scelta di percorso ha un costo-opportunità: un nodo oggetto è un
 * nodo allenatore in meno (e quindi meno livelli).
 */

import { makeRng, type Rng } from '@engine/prng';
import type { MonType, Row } from '@engine/types';
import { BALANCE } from './balance';
import { BOSS_ID, CREATURE_MAP, CREATURE_META, LINE_STAGES, WILD_IDS } from './creatures';
import { ITEMS } from './items';

export type NodeKind =
  | 'wild' // creatura selvatica: vinci e puoi reclutarla
  | 'trainer' // allenatore: più esperienza
  | 'item' // scegli un oggetto tenuto
  | 'trade' // scambia una tua creatura con una di livello superiore
  | 'heal' // cura tutta la squadra
  | 'tutor' // potenzia la mossa finale di una creatura
  | 'event' // evento incerto
  | 'ball' // recluta gratis una creatura tra alcune proposte
  | 'commander' // comandante: medaglia
  | 'elite' // Terzo, Braccio sin/dst
  | 'boss'; // Capo del dungeon

export interface EncounterRef {
  defId: string;
  level: number;
  row: Row;
}

export interface MapNode {
  id: string;
  kind: NodeKind;
  layer: number;
  /** Tratta (0..badgeCount-1); badgeCount = Quattro Supremi/Campione. */
  segment: number;
  next: string[];
  level: number;
  encounter: EncounterRef[];
  /** Tipo tematico della palestra. */
  gymType?: MonType;
  /** Offerte deterministiche del nodo: id oggetti ('item') o creature ('ball'). */
  offers: string[];
  preview: { title: string; description: string; threat: number };
}

export interface RunMap {
  seed: number;
  nodes: Record<string, MapNode>;
  layers: string[][];
  startIds: string[];
}

const KIND_TITLE: Record<NodeKind, string> = {
  wild: 'Creatura selvatica',
  trainer: 'Allenatore',
  item: 'Oggetto',
  trade: 'Scambio',
  heal: 'Rifugio',
  tutor: 'Maestro di Mosse',
  event: 'Evento',
  ball: 'Richiamo',
  commander: 'Comandante',
  elite: 'Elite',
  boss: 'Capo del Dungeon',
};

const KIND_DESC: Record<NodeKind, string> = {
  wild: 'Una creatura sbarra il passo: battila e potrai reclutarla.',
  trainer: 'Uno sfidante addestrato: più duro, più esperienza.',
  item: 'Un oggetto tenuto da scegliere.',
  trade: 'Cedi una creatura, ricevine una di livello superiore.',
  heal: 'La squadra recupera tutte le forze.',
  tutor: 'Potenzia la mossa finale di una creatura.',
  event: 'Un bivio incerto: rischio e opportunità.',
  ball: 'Recluta gratis una creatura tra quelle proposte.',
  commander: 'Un comandante importante: in gioco una medaglia.',
  elite: 'Uno dei leader del dungeon. Nessuna cura prima del prossimo.',
  boss: 'Il capo supremo del dungeon. La fine della prova.',
};

/** Tipi tematici dei 7 comandanti. In futuro customizzabile per avventura. */
export const GYM_TYPES: MonType[] = [
  'natura',
  'acqua',
  'fuoco',
  'fulmine',
  'roccia',
  'veleno',
  'ghiaccio',
];

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Stadio evolutivo adeguato al livello: i nemici di fine run si presentano già
 * evoluti, senza dover duplicare i dati degli incontri.
 */
export function stageForLevel(defId: string, level: number): string {
  const m = CREATURE_META[defId];
  if (!m) return defId;
  const stages = LINE_STAGES[m.line] ?? [defId];
  let chosen = stages[0]!;
  for (const id of stages) {
    const evo = CREATURE_MAP[chosen]?.evolution;
    if (evo && evo.toId === id && level >= evo.atLevel) chosen = id;
  }
  return chosen;
}

function rowFor(defId: string): Row {
  const role = CREATURE_MAP[defId]?.role;
  return role === 'defender' || role === 'blade' ? 'front' : 'back';
}

/** Pesca `count` creature dal bacino selvatico, allo stadio adeguato al livello. */
function pickEncounter(rng: Rng, count: number, level: number, onlyType?: MonType): EncounterRef[] {
  let pool = WILD_IDS;
  if (onlyType) {
    // Palestra a tema: solo linee che possiedono quel tipo in qualche stadio.
    const themed = WILD_IDS.filter((id) => {
      const stages = LINE_STAGES[CREATURE_META[id]!.line] ?? [];
      return stages.some((s) => CREATURE_MAP[s]!.types.includes(onlyType));
    });
    if (themed.length > 0) pool = themed;
  }
  const order = shuffle(pool, rng);
  const out: EncounterRef[] = [];
  for (let i = 0; i < count; i++) {
    const base = order[i % order.length]!;
    const defId = stageForLevel(base, level);
    out.push({ defId, level, row: rowFor(defId) });
  }
  if (!out.some((e) => e.row === 'front') && out[0]) out[0].row = 'front';
  return out;
}

function pickKind(rng: Rng): NodeKind {
  const roll = rng.next();
  if (roll < 0.28) return 'wild';
  if (roll < 0.44) return 'trainer';
  if (roll < 0.56) return 'item';
  if (roll < 0.74) return 'heal';
  if (roll < 0.84) return 'ball';
  if (roll < 0.91) return 'tutor';
  if (roll < 0.96) return 'trade';
  return 'event';
}

function levelFor(kind: NodeKind, segment: number): number {
  const base = BALANCE.wildBaseLevel + segment * BALANCE.levelPerBadge;
  switch (kind) {
    case 'trainer':
      return base + BALANCE.trainerLevelBonus;
    case 'commander':
      return base + BALANCE.gymLevelBonus;
    case 'elite':
      return base + BALANCE.eliteLevelBonus;
    case 'boss':
      return base + BALANCE.championLevelBonus;
    default:
      return base;
  }
}

function threatFor(kind: NodeKind): number {
  switch (kind) {
    case 'boss':
      return 5;
    case 'elite':
      return 5;
    case 'commander':
      return 4;
    case 'trainer':
      return 3;
    case 'wild':
      return 2;
    default:
      return 1;
  }
}

function buildNode(rng: Rng, id: string, kind: NodeKind, layer: number, segment: number): MapNode {
  // `segment` incide sulla dimensione degli incontri: all'inizio la squadra è piccola.
  const level = levelFor(kind, segment);
  let encounter: EncounterRef[] = [];
  let gymType: MonType | undefined;
  let offers: string[] = [];

  switch (kind) {
    case 'wild':
      // Nella prima tratta si è ancora soli: un solo avversario.
      encounter = pickEncounter(rng, segment === 0 ? 1 : rng.int(1, 2), level);
      break;
    case 'trainer':
      encounter = pickEncounter(rng, segment === 0 ? rng.int(1, 2) : rng.int(2, 3), level);
      break;
    case 'commander': {
      gymType = GYM_TYPES[segment % GYM_TYPES.length];
      encounter = pickEncounter(rng, 3, level, gymType);
      break;
    }
    case 'elite':
      encounter = pickEncounter(rng, 4, level);
      break;
    case 'boss':
      encounter = [
        { defId: BOSS_ID, level: level + 2, row: 'back' },
        ...pickEncounter(rng, 3, level),
      ];
      break;
    case 'item':
      offers = shuffle(ITEMS, rng)
        .slice(0, 3)
        .map((i) => i.id);
      break;
    case 'ball': {
      const order = shuffle(WILD_IDS, rng).slice(0, 3);
      offers = order.map((id) => stageForLevel(id, level));
      break;
    }
    case 'trade': {
      // Una sola proposta, di livello superiore: cedi qualcosa per averla.
      const pick = shuffle(WILD_IDS, rng)[0]!;
      offers = [stageForLevel(pick, level + 4)];
      break;
    }
    default:
      break;
  }

  return {
    id,
    kind,
    layer,
    segment,
    next: [],
    level,
    encounter,
    gymType,
    offers,
    preview: {
      title: (() => {
        if (kind === 'commander') return `Comandante ${gymType ?? ''}`.trim();
        if (kind === 'elite') {
          const eliteNames = ['Terzo in comando', 'Braccio sinistro', 'Braccio destro'];
          // segment è BALANCE.badgeCount + indice elite (0, 1, 2)
          const idx = segment - BALANCE.badgeCount;
          return eliteNames[idx] ?? 'Elite';
        }
        return KIND_TITLE[kind];
      })(),
      description: KIND_DESC[kind],
      threat: threatFor(kind),
    },
  };
}

/** Collega ogni layer al successivo garantendo che tutto resti raggiungibile. */
function link(nodes: Record<string, MapNode>, cur: string[], nxt: string[], rng: Rng): void {
  for (let i = 0; i < cur.length; i++) {
    const node = nodes[cur[i]!]!;
    const primary = Math.min(
      nxt.length - 1,
      Math.round((i / Math.max(1, cur.length - 1)) * (nxt.length - 1)),
    );
    const targets = new Set<number>([primary]);
    if (rng.chance(0.5) && primary + 1 < nxt.length) targets.add(primary + 1);
    if (rng.chance(0.4) && primary - 1 >= 0) targets.add(primary - 1);
    node.next = [...targets].sort((a, b) => a - b).map((idx) => nxt[idx]!);
  }
  for (let j = 0; j < nxt.length; j++) {
    const reachable = cur.some((cid) => nodes[cid]!.next.includes(nxt[j]!));
    if (!reachable) {
      const closest = Math.min(
        cur.length - 1,
        Math.round((j / Math.max(1, nxt.length - 1)) * (cur.length - 1)),
      );
      nodes[cur[closest]!]!.next.push(nxt[j]!);
    }
  }
}

export function generateRunMap(seed: number): RunMap {
  const rng = makeRng(seed);
  const nodes: Record<string, MapNode> = {};
  const layers: string[][] = [];

  const pushLayer = (ids: string[]) => layers.push(ids);

  // Sette tratte, ognuna chiusa da un comandante.
  for (let segment = 0; segment < BALANCE.badgeCount; segment++) {
    for (let step = 0; step < BALANCE.nodesPerSegment; step++) {
      const width = rng.int(2, 3);
      const ids: string[] = [];
      for (let i = 0; i < width; i++) {
        const layer = layers.length;
        const id = `s${segment}_l${step}_${i}`;
        // La primissima tappa offre sempre un Richiamo e uno scontro morbido: si
        // parte da soli, e trovare un secondo compagno non può dipendere dai dadi.
        const forced: NodeKind | null =
          segment === 0 && step === 0 ? (i === 0 ? 'ball' : i === 1 ? 'wild' : null) : null;
        nodes[id] = buildNode(rng, id, forced ?? pickKind(rng), layer, segment);
        ids.push(id);
      }
      pushLayer(ids);
    }
    const commanderId = `commander${segment}`;
    nodes[commanderId] = buildNode(rng, commanderId, 'commander', layers.length, segment);
    pushLayer([commanderId]);
  }

  // Tre leader (nessuna cura tra loro) e Capo del Dungeon.
  for (let i = 0; i < 3; i++) {
    const id = `elite${i}`;
    nodes[id] = buildNode(rng, id, 'elite', layers.length, BALANCE.badgeCount + i);
    pushLayer([id]);
  }
  nodes['boss'] = buildNode(rng, 'boss', 'boss', layers.length, BALANCE.badgeCount + 3);
  pushLayer(['boss']);

  for (let l = 0; l < layers.length - 1; l++) link(nodes, layers[l]!, layers[l + 1]!, rng);

  return { seed, nodes, layers, startIds: layers[0]! };
}

/** Quante medaglie si sono conquistate ripulendo questi nodi. */
export function badgesFrom(clearedIds: string[]): number {
  return clearedIds.filter((id) => id.startsWith('gym')).length;
}
