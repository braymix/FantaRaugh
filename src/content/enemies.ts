/**
 * 8 nemici (incluso un boss). Riusano ruoli e stati: l'IA di targeting e le
 * meccaniche derivano dagli stessi sistemi degli eroi. I loro numeri sono pensati
 * per essere scalati di livello dal generatore di dungeon.
 */

import type { UnitDef } from '@engine/types';

const flatGrowth = (hp: number, atk: number, def: number) => ({
  perLevel: { maxHp: hp, atk, def },
});

const GOBLIN_GRUNT: UnitDef = {
  id: 'enemy_goblin_grunt',
  name: 'Goblin Sgherro',
  role: 'blade',
  rarity: 'common',
  baseStats: { maxHp: 1800, atk: 240, def: 120, speed: 100, critRate: 0.05, critDamage: 1.5, accuracy: 0.95, resistance: 60, energyMax: 100 },
  growth: flatGrowth(120, 18, 8),
  ability: {
    id: 'goblin_slash',
    name: 'Fendente',
    trigger: 'active',
    targeting: 'singleEnemy',
    energyCost: 100,
    actions: [{ kind: 'damage', power: 1.6, damageType: 'physical', tags: ['physical'] }],
  },
  passives: [],
};

const GOBLIN_ARCHER: UnitDef = {
  id: 'enemy_goblin_archer',
  name: 'Goblin Arciere',
  role: 'thief',
  rarity: 'common',
  baseStats: { maxHp: 1400, atk: 260, def: 80, speed: 118, critRate: 0.15, critDamage: 1.5, accuracy: 0.95, resistance: 50, energyMax: 90 },
  growth: flatGrowth(95, 20, 5),
  ability: {
    id: 'goblin_volley',
    name: 'Scarica di Frecce',
    trigger: 'active',
    targeting: 'lowestHpEnemy',
    energyCost: 90,
    actions: [{ kind: 'damage', power: 1.4, damageType: 'physical', tags: ['physical'] }],
  },
  passives: [],
};

const ORC_BRUTE: UnitDef = {
  id: 'enemy_orc_brute',
  name: 'Bruto Orchesco',
  role: 'defender',
  rarity: 'rare',
  baseStats: { maxHp: 3600, atk: 220, def: 260, speed: 78, critRate: 0.05, critDamage: 1.5, accuracy: 0.9, resistance: 120, energyMax: 90 },
  growth: flatGrowth(260, 14, 16),
  ability: {
    id: 'orc_smash',
    name: 'Spaccata',
    trigger: 'active',
    targeting: 'frontRowEnemies',
    energyCost: 90,
    actions: [{ kind: 'damage', power: 1.1, damageType: 'physical', tags: ['physical', 'area'] }],
  },
  passives: [
    {
      id: 'orc_thickhide',
      name: 'Pelle Coriacea',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'def_up', duration: 999, stacks: 2, onSelf: true }],
    },
  ],
};

const DIRE_WOLF: UnitDef = {
  id: 'enemy_dire_wolf',
  name: 'Lupo Selvaggio',
  role: 'blade',
  rarity: 'common',
  baseStats: { maxHp: 1900, atk: 270, def: 90, speed: 128, critRate: 0.12, critDamage: 1.6, accuracy: 0.95, resistance: 50, energyMax: 100 },
  growth: flatGrowth(120, 21, 6),
  ability: {
    id: 'wolf_rend',
    name: 'Squarcio',
    trigger: 'active',
    targeting: 'lowestHpEnemy',
    energyCost: 100,
    actions: [
      { kind: 'damage', power: 1.2, damageType: 'physical', tags: ['physical', 'bleed'] },
      { kind: 'applyStatus', statusId: 'bleed', duration: 3, stacks: 1 },
    ],
  },
  passives: [],
};

const CAVE_BAT: UnitDef = {
  id: 'enemy_cave_bat',
  name: 'Pipistrello Cavernicolo',
  role: 'thief',
  rarity: 'common',
  baseStats: { maxHp: 1100, atk: 200, def: 60, speed: 150, critRate: 0.1, critDamage: 1.5, accuracy: 0.95, resistance: 40, energyMax: 80 },
  growth: flatGrowth(80, 16, 4),
  ability: {
    id: 'bat_drain',
    name: 'Morso Vampirico',
    trigger: 'active',
    targeting: 'singleEnemy',
    energyCost: 80,
    actions: [
      { kind: 'damage', power: 1.1, damageType: 'physical', tags: ['physical'] },
      { kind: 'heal', power: 0.5 },
    ],
  },
  passives: [],
};

const DARK_ACOLYTE: UnitDef = {
  id: 'enemy_dark_acolyte',
  name: 'Accolito Oscuro',
  role: 'caster',
  rarity: 'rare',
  baseStats: { maxHp: 1600, atk: 320, def: 70, speed: 96, critRate: 0.08, critDamage: 1.5, accuracy: 0.95, resistance: 110, energyMax: 110 },
  growth: flatGrowth(100, 24, 5),
  ability: {
    id: 'acolyte_darkbolt',
    name: 'Dardo Oscuro',
    trigger: 'active',
    targeting: 'allEnemies',
    energyCost: 110,
    actions: [{ kind: 'damage', power: 0.9, damageType: 'magical', tags: ['magical', 'area', 'shadow'] }],
  },
  passives: [
    {
      id: 'acolyte_curse',
      name: 'Maledizione',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.3,
      actions: [{ kind: 'applyStatus', statusId: 'atk_down', duration: 2, stacks: 1 }],
    },
  ],
};

const VENOM_SPIDER: UnitDef = {
  id: 'enemy_venom_spider',
  name: 'Ragno Velenoso',
  role: 'blade',
  rarity: 'common',
  baseStats: { maxHp: 2000, atk: 210, def: 110, speed: 104, critRate: 0.05, critDamage: 1.5, accuracy: 0.95, resistance: 70, energyMax: 100 },
  growth: flatGrowth(130, 16, 8),
  ability: {
    id: 'spider_bite',
    name: 'Morso Tossico',
    trigger: 'active',
    targeting: 'singleEnemy',
    energyCost: 100,
    actions: [
      { kind: 'damage', power: 1.0, damageType: 'physical', tags: ['physical', 'poison'] },
      { kind: 'applyStatus', statusId: 'poison', duration: 4, stacks: 2 },
    ],
  },
  passives: [
    {
      id: 'spider_venomous',
      name: 'Zanne Velenose',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.5,
      actions: [{ kind: 'applyStatus', statusId: 'poison', duration: 3, stacks: 1 }],
    },
  ],
};

const SHADOW_LICH: UnitDef = {
  id: 'enemy_shadow_lich',
  name: 'Lich delle Ombre',
  role: 'caster',
  rarity: 'legendary',
  baseStats: { maxHp: 9000, atk: 480, def: 180, speed: 100, critRate: 0.15, critDamage: 1.7, accuracy: 1.0, resistance: 200, energyMax: 120 },
  growth: flatGrowth(600, 34, 14),
  ability: {
    id: 'lich_doom',
    name: 'Ondata di Rovina',
    trigger: 'active',
    targeting: 'allEnemies',
    energyCost: 120,
    actions: [
      { kind: 'damage', power: 1.3, damageType: 'magical', tags: ['magical', 'area', 'shadow'] },
      { kind: 'applyStatus', statusId: 'slow', duration: 2, stacks: 1 },
    ],
  },
  passives: [
    {
      id: 'lich_phylactery',
      name: 'Filatterio',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'regen', duration: 999, stacks: 2, onSelf: true }],
    },
    {
      id: 'lich_soulharvest',
      name: 'Raccolta di Anime',
      trigger: 'onKill',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'atk_up', duration: 999, stacks: 1, onSelf: true }],
    },
    {
      id: 'lich_wither',
      name: 'Appassimento',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.35,
      actions: [{ kind: 'applyStatus', statusId: 'def_down', duration: 3, stacks: 1 }],
    },
  ],
};

export const ENEMIES: UnitDef[] = [
  GOBLIN_GRUNT,
  GOBLIN_ARCHER,
  ORC_BRUTE,
  DIRE_WOLF,
  CAVE_BAT,
  DARK_ACOLYTE,
  VENOM_SPIDER,
  SHADOW_LICH,
];
export const ENEMY_MAP: Record<string, UnitDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
export const BOSS_ID = SHADOW_LICH.id;
