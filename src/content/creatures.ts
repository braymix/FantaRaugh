/**
 * Catalogo UNICO delle creature: quelle che affronti sono quelle che puoi
 * reclutare. Niente più liste separate "eroi" e "nemici".
 *
 * Ogni creatura nasce da un descrittore di LINEA EVOLUTIVA: la linea fissa ruolo,
 * statistiche base e crescita; ogni stadio aggiunge nome, tipi, livello di
 * evoluzione e un moltiplicatore di potenza. Il kit di mosse arriva dal ruolo
 * (rolekits.ts), quindi aggiungere una creatura costa poche righe di dati.
 */

import type { BaseStats, GrowthCurve, MonType, Rarity, Role, UnitDef } from '@engine/types';
import { ROLE_KITS } from './rolekits';

/** Statistiche di partenza per ruolo (livello 1, stadio 1). */
const ROLE_BASE: Record<Role, BaseStats> = {
  healer: { maxHp: 3200, atk: 320, def: 130, speed: 98, critRate: 0.05, critDamage: 1.5, accuracy: 1, resistance: 150, energyMax: 100 },
  caster: { maxHp: 2800, atk: 460, def: 90, speed: 100, critRate: 0.1, critDamage: 1.6, accuracy: 1, resistance: 120, energyMax: 110 },
  defender: { maxHp: 5200, atk: 260, def: 320, speed: 82, critRate: 0.05, critDamage: 1.5, accuracy: 1, resistance: 200, energyMax: 90 },
  blade: { maxHp: 3600, atk: 400, def: 160, speed: 106, critRate: 0.15, critDamage: 1.6, accuracy: 1, resistance: 120, energyMax: 100 },
  thief: { maxHp: 3000, atk: 360, def: 110, speed: 138, critRate: 0.3, critDamage: 1.6, accuracy: 1, resistance: 100, energyMax: 90 },
  assassin: { maxHp: 2700, atk: 500, def: 90, speed: 122, critRate: 0.25, critDamage: 1.8, accuracy: 1, resistance: 90, energyMax: 100 },
};

const ROLE_GROWTH: Record<Role, GrowthCurve> = {
  healer: { perLevel: { maxHp: 190, atk: 19, def: 8, resistance: 6 } },
  caster: { perLevel: { maxHp: 165, atk: 30, def: 6 } },
  defender: { perLevel: { maxHp: 310, atk: 15, def: 20, resistance: 10 } },
  blade: { perLevel: { maxHp: 215, atk: 27, def: 10 } },
  thief: { perLevel: { maxHp: 175, atk: 24, def: 7, speed: 1 } },
  assassin: { perLevel: { maxHp: 160, atk: 33, def: 6, speed: 1 } },
};

/** A quale "bacino" appartiene una linea: starter, selvatica o solo boss. */
export type Pool = 'starter' | 'wild' | 'boss';

interface StageSpec {
  id: string;
  name: string;
  types: MonType[];
  /** Livello a cui si evolve IN questo stadio (assente per il primo). */
  atLevel?: number;
  rarity: Rarity;
  /** Moltiplicatore di potenza dello stadio (default: 1 / 1.35 / 1.8). */
  mult?: number;
}

interface LineSpec {
  line: string;
  role: Role;
  pool: Pool;
  /** Scala generale della linea: <1 creature comuni, >1 creature d'élite. */
  scale?: number;
  stages: StageSpec[];
}

const DEFAULT_MULT = [1, 1.35, 1.8];

const LINES: LineSpec[] = [
  // --- Starter (uno per ruolo): scelti a inizio run ---
  {
    line: 'thane',
    role: 'defender',
    pool: 'starter',
    stages: [
      { id: 'thane', name: 'Thane', types: ['acciaio'], rarity: 'rare' },
      { id: 'thanys', name: 'Thanys', types: ['acciaio'], atLevel: 14, rarity: 'epic' },
      { id: 'thanarok', name: 'Thanarok', types: ['acciaio', 'roccia'], atLevel: 30, rarity: 'legendary' },
    ],
  },
  {
    line: 'kael',
    role: 'blade',
    pool: 'starter',
    stages: [
      { id: 'kael', name: 'Kael', types: ['fuoco'], rarity: 'rare' },
      { id: 'kaelor', name: 'Kaelor', types: ['fuoco'], atLevel: 14, rarity: 'epic' },
      { id: 'kaelmir', name: 'Kaelmir', types: ['fuoco', 'acciaio'], atLevel: 30, rarity: 'legendary' },
    ],
  },
  {
    line: 'umbra',
    role: 'assassin',
    pool: 'starter',
    stages: [
      { id: 'umbra', name: 'Umbra', types: ['ombra'], rarity: 'rare' },
      { id: 'umbryx', name: 'Umbryx', types: ['ombra'], atLevel: 14, rarity: 'epic' },
      { id: 'umbrathos', name: 'Umbrathos', types: ['ombra', 'veleno'], atLevel: 30, rarity: 'legendary' },
    ],
  },
  {
    line: 'pyra',
    role: 'caster',
    pool: 'starter',
    stages: [
      { id: 'pyra', name: 'Pyra', types: ['fuoco'], rarity: 'rare' },
      { id: 'pyrelle', name: 'Pyrelle', types: ['fuoco'], atLevel: 14, rarity: 'epic' },
      { id: 'pyrantheon', name: 'Pyrantheon', types: ['fuoco', 'luce'], atLevel: 30, rarity: 'legendary' },
    ],
  },
  {
    line: 'seraphine',
    role: 'healer',
    pool: 'starter',
    stages: [
      { id: 'seraphine', name: 'Seraphine', types: ['luce'], rarity: 'rare' },
      { id: 'seraphel', name: 'Seraphel', types: ['luce'], atLevel: 14, rarity: 'epic' },
      { id: 'seraphyra', name: 'Seraphyra', types: ['luce', 'fulmine'], atLevel: 30, rarity: 'legendary' },
    ],
  },
  {
    line: 'vesper',
    role: 'thief',
    pool: 'starter',
    stages: [
      { id: 'vesper', name: 'Vesper', types: ['natura'], rarity: 'rare' },
      { id: 'vesperia', name: 'Vesperia', types: ['natura'], atLevel: 14, rarity: 'epic' },
      { id: 'vesperoth', name: 'Vesperoth', types: ['natura', 'ombra'], atLevel: 30, rarity: 'legendary' },
    ],
  },

  // --- Selvatiche: si incontrano e si reclutano ---
  {
    line: 'goblin',
    role: 'blade',
    pool: 'wild',
    scale: 0.8,
    stages: [
      { id: 'goblin_grunt', name: 'Goblin Sgherro', types: ['natura'], rarity: 'common' },
      { id: 'goblin_brute', name: 'Goblin Bruto', types: ['natura', 'roccia'], atLevel: 16, rarity: 'rare' },
    ],
  },
  {
    line: 'gobarcher',
    role: 'thief',
    pool: 'wild',
    scale: 0.8,
    stages: [
      { id: 'goblin_archer', name: 'Goblin Arciere', types: ['natura'], rarity: 'common' },
      { id: 'goblin_sniper', name: 'Goblin Cecchino', types: ['natura', 'fulmine'], atLevel: 16, rarity: 'rare' },
    ],
  },
  {
    line: 'orc',
    role: 'defender',
    pool: 'wild',
    scale: 0.95,
    stages: [
      { id: 'orc_brute', name: 'Bruto Orchesco', types: ['roccia'], rarity: 'common' },
      { id: 'orc_warlord', name: 'Signore Orchesco', types: ['roccia', 'acciaio'], atLevel: 20, rarity: 'epic' },
    ],
  },
  {
    line: 'wolf',
    role: 'blade',
    pool: 'wild',
    scale: 0.85,
    stages: [
      { id: 'dire_wolf', name: 'Lupo Selvaggio', types: ['ghiaccio'], rarity: 'common' },
      { id: 'winter_wolf', name: 'Lupo Invernale', types: ['ghiaccio', 'acqua'], atLevel: 18, rarity: 'rare' },
    ],
  },
  {
    line: 'bat',
    role: 'thief',
    pool: 'wild',
    scale: 0.8,
    stages: [
      { id: 'cave_bat', name: 'Pipistrello Cavernicolo', types: ['veleno'], rarity: 'common' },
      { id: 'vampire_bat', name: 'Pipistrello Vampiro', types: ['veleno', 'ombra'], atLevel: 18, rarity: 'rare' },
    ],
  },
  {
    line: 'acolyte',
    role: 'caster',
    pool: 'wild',
    scale: 0.9,
    stages: [
      { id: 'dark_acolyte', name: 'Accolito Oscuro', types: ['ombra'], rarity: 'rare' },
      { id: 'dark_priest', name: 'Sacerdote Oscuro', types: ['ombra', 'veleno'], atLevel: 20, rarity: 'epic' },
    ],
  },
  {
    line: 'spider',
    role: 'blade',
    pool: 'wild',
    scale: 0.85,
    stages: [
      { id: 'venom_spider', name: 'Ragno Velenoso', types: ['veleno'], rarity: 'common' },
      { id: 'abyss_widow', name: 'Vedova Abissale', types: ['veleno', 'ombra'], atLevel: 18, rarity: 'rare' },
    ],
  },
  {
    line: 'undine',
    role: 'caster',
    pool: 'wild',
    scale: 0.9,
    stages: [
      { id: 'undine', name: 'Ondina', types: ['acqua'], rarity: 'common' },
      { id: 'maelstrom', name: 'Maremoto', types: ['acqua', 'fulmine'], atLevel: 18, rarity: 'epic' },
    ],
  },
  {
    line: 'sentinel',
    role: 'defender',
    pool: 'wild',
    scale: 0.95,
    stages: [
      { id: 'iron_sentinel', name: 'Sentinella di Ferro', types: ['acciaio'], rarity: 'rare' },
      { id: 'iron_colossus', name: 'Colosso di Ferro', types: ['acciaio', 'roccia'], atLevel: 22, rarity: 'epic' },
    ],
  },
  {
    line: 'sprite',
    role: 'healer',
    pool: 'wild',
    scale: 0.85,
    stages: [
      { id: 'light_sprite', name: 'Fatalucente', types: ['luce'], rarity: 'common' },
      { id: 'arch_fae', name: 'Arcofata', types: ['luce', 'natura'], atLevel: 18, rarity: 'epic' },
    ],
  },
  {
    line: 'storm',
    role: 'caster',
    pool: 'wild',
    scale: 0.9,
    stages: [
      { id: 'living_spark', name: 'Scintilla Viva', types: ['fulmine'], rarity: 'common' },
      { id: 'living_storm', name: 'Tempesta Viva', types: ['fulmine', 'acqua'], atLevel: 18, rarity: 'epic' },
    ],
  },
  {
    line: 'imp',
    role: 'assassin',
    pool: 'wild',
    scale: 0.85,
    stages: [
      { id: 'fire_imp', name: 'Diavoletto', types: ['fuoco'], rarity: 'common' },
      { id: 'flame_demon', name: 'Demone Igneo', types: ['fuoco', 'ombra'], atLevel: 18, rarity: 'epic' },
    ],
  },

  // --- Solo boss: il Campione ---
  {
    line: 'lich',
    role: 'caster',
    pool: 'boss',
    scale: 1.55,
    stages: [{ id: 'shadow_lich', name: 'Lich delle Ombre', types: ['ombra', 'acciaio'], rarity: 'mythic' }],
  },
];

// --- Costruzione del catalogo ---------------------------------------------

function scaleStats(base: BaseStats, k: number): BaseStats {
  return {
    ...base,
    maxHp: Math.round(base.maxHp * k),
    atk: Math.round(base.atk * k),
    def: Math.round(base.def * k),
    resistance: Math.round(base.resistance * k),
    // Velocità e statistiche di probabilità NON scalano: restano identità del ruolo.
  };
}

function scaleGrowth(g: GrowthCurve, k: number): GrowthCurve {
  const perLevel: GrowthCurve['perLevel'] = {};
  for (const [key, value] of Object.entries(g.perLevel)) {
    perLevel[key as keyof GrowthCurve['perLevel']] = Math.round((value ?? 0) * k * 10) / 10;
  }
  return { perLevel };
}

export interface CreatureMeta {
  line: string;
  pool: Pool;
  stageIndex: number;
  stageCount: number;
}

const creatures: UnitDef[] = [];
const meta: Record<string, CreatureMeta> = {};
const lineStages: Record<string, string[]> = {};

for (const spec of LINES) {
  const kit = ROLE_KITS[spec.role];
  lineStages[spec.line] = spec.stages.map((s) => s.id);
  spec.stages.forEach((stage, i) => {
    const k = (spec.scale ?? 1) * (stage.mult ?? DEFAULT_MULT[i] ?? 1);
    const next = spec.stages[i + 1];
    creatures.push({
      id: stage.id,
      name: stage.name,
      role: spec.role,
      rarity: stage.rarity,
      types: stage.types,
      line: spec.line,
      evolution: next && next.atLevel ? { toId: next.id, atLevel: next.atLevel } : undefined,
      baseStats: scaleStats(ROLE_BASE[spec.role], k),
      growth: scaleGrowth(ROLE_GROWTH[spec.role], k),
      basicAttack: kit.basicAttack,
      ability: kit.ability,
      passives: kit.passives,
    });
    meta[stage.id] = { line: spec.line, pool: spec.pool, stageIndex: i, stageCount: spec.stages.length };
  });
}

export const CREATURES: UnitDef[] = creatures;
export const CREATURE_MAP: Record<string, UnitDef> = Object.fromEntries(creatures.map((c) => [c.id, c]));
export const CREATURE_META: Record<string, CreatureMeta> = meta;
/** Stadi di ogni linea, in ordine evolutivo. */
export const LINE_STAGES: Record<string, string[]> = lineStages;

/** Id dei primi stadi, per bacino: è da qui che si pesca. */
export const STARTER_IDS = LINES.filter((l) => l.pool === 'starter').map((l) => l.stages[0]!.id);
export const WILD_IDS = LINES.filter((l) => l.pool === 'wild').map((l) => l.stages[0]!.id);
export const BOSS_ID = LINES.find((l) => l.pool === 'boss')!.stages[0]!.id;

/** Tutti gli stadi evolutivi di una linea, dato un qualunque suo membro. */
export function stagesOf(defId: string): string[] {
  const m = CREATURE_META[defId];
  return m ? (LINE_STAGES[m.line] ?? [defId]) : [defId];
}
