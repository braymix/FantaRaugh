/**
 * 6 eroi giocabili, uno per ruolo. La meccanica identitaria di ogni ruolo è
 * espressa SOLO con effetti componibili (Effect), stati e regole di targeting —
 * mai con rami "if role" nel motore.
 *
 *  - Curatore  → cura il più ferito, eccesso in scudo, cleanse, rigenerazione.
 *  - Caster    → AoE magica, cariche arcane che potenziano l'ultimate, ustioni.
 *  - Difensore → provocazione permanente, scudi di squadra, rappresaglia, energia dal danno.
 *  - Combattente→ colpi multipli, slancio (momentum) che cresce e cade sotto i critici.
 *  - Ladro     → velocissimo, agisce per primo, ruba buff, giustizia i feriti.
 *  - Nascosto  → furtività, bypassa la prima linea, agguato critico, rientra in stealth uccidendo.
 */

import type { UnitDef } from '@engine/types';

const HEALER: UnitDef = {
  id: 'hero_seraphine',
  name: 'Seraphine',
  role: 'healer',
  rarity: 'epic',
  baseStats: {
    maxHp: 3200,
    atk: 320,
    def: 130,
    speed: 98,
    critRate: 0.05,
    critDamage: 1.5,
    accuracy: 1.0,
    resistance: 150,
    energyMax: 100,
  },
  growth: { perLevel: { maxHp: 190, atk: 19, def: 8, resistance: 6 } },
  basicAttack: {
    id: 'seraphine_mend',
    name: 'Tocco Curativo',
    trigger: 'active',
    targeting: 'lowestHpPctAllyOrSelf',
    actions: [{ kind: 'heal', power: 1.3, overhealToShield: true }],
    tags: ['holy'],
  },
  ability: {
    id: 'seraphine_dawn',
    name: 'Aurora Rinvigorente',
    trigger: 'active',
    targeting: 'allAllies',
    energyCost: 100,
    actions: [
      { kind: 'cleanse', count: 2 },
      { kind: 'heal', power: 1.6, overhealToShield: true },
    ],
    tags: ['holy', 'area'],
  },
  passives: [
    {
      id: 'seraphine_blessing',
      name: 'Benedizione Iniziale',
      trigger: 'onBattleStart',
      targeting: 'allAllies',
      actions: [{ kind: 'applyStatus', statusId: 'regen', duration: 3, stacks: 1 }],
      tags: ['holy'],
    },
    {
      id: 'seraphine_emergency',
      name: 'Intervento d\'Emergenza',
      trigger: 'onAllyDeath',
      targeting: 'allAllies',
      maxTriggersPerBattle: 2,
      actions: [{ kind: 'heal', power: 2.0, overhealToShield: true }],
      tags: ['holy'],
    },
  ],
};

const CASTER: UnitDef = {
  id: 'hero_pyra',
  name: 'Pyra',
  role: 'caster',
  rarity: 'epic',
  baseStats: {
    maxHp: 2800,
    atk: 460,
    def: 90,
    speed: 100,
    critRate: 0.1,
    critDamage: 1.6,
    accuracy: 1.0,
    resistance: 120,
    energyMax: 110,
  },
  growth: { perLevel: { maxHp: 165, atk: 30, def: 6 } },
  basicAttack: {
    id: 'pyra_emberwave',
    name: 'Ondata di Braci',
    trigger: 'active',
    targeting: 'allEnemies',
    actions: [{ kind: 'damage', power: 0.6, damageType: 'magical', tags: ['magical', 'area', 'fire'] }],
    tags: ['area'],
  },
  ability: {
    id: 'pyra_meteor',
    name: 'Meteora',
    trigger: 'active',
    targeting: 'allEnemies',
    energyCost: 110,
    // La Carica Arcana (arcane_charge) potenzia l'atk: la Meteora ne beneficia e
    // poi la consuma, realizzando "le cariche potenziano l'incantesimo successivo".
    actions: [
      { kind: 'damage', power: 1.5, damageType: 'magical', tags: ['magical', 'area', 'fire'] },
      { kind: 'applyStatus', statusId: 'burn', duration: 3, stacks: 2 },
      { kind: 'removeStatus', statusId: 'arcane_charge', onSelf: true },
    ],
    tags: ['area', 'fire'],
  },
  passives: [
    {
      id: 'pyra_charge',
      name: 'Accumulo Arcano',
      trigger: 'onTurnStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'arcane_charge', duration: 99, stacks: 1, onSelf: true }],
      tags: ['magical'],
    },
    {
      id: 'pyra_combustion',
      name: 'Combustione',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.4,
      actions: [{ kind: 'applyStatus', statusId: 'burn', duration: 3, stacks: 1 }],
      tags: ['fire'],
    },
  ],
};

const DEFENDER: UnitDef = {
  id: 'hero_thane',
  name: 'Thane',
  role: 'defender',
  rarity: 'rare',
  baseStats: {
    maxHp: 5200,
    atk: 260,
    def: 320,
    speed: 82,
    critRate: 0.05,
    critDamage: 1.5,
    accuracy: 1.0,
    resistance: 200,
    energyMax: 90,
  },
  growth: { perLevel: { maxHp: 310, atk: 15, def: 20, resistance: 10 } },
  basicAttack: {
    id: 'thane_bash',
    name: 'Scudata',
    trigger: 'active',
    targeting: 'singleEnemy',
    actions: [
      { kind: 'damage', power: 1.0, damageType: 'physical', tags: ['physical'] },
      { kind: 'applyStatus', statusId: 'def_down', duration: 2, stacks: 1 },
    ],
  },
  ability: {
    id: 'thane_bulwark',
    name: 'Fortezza Vivente',
    trigger: 'active',
    targeting: 'allAllies',
    energyCost: 90,
    actions: [
      { kind: 'shield', power: 1.4 },
      { kind: 'applyStatus', statusId: 'fortify', duration: 3, stacks: 1, onSelf: true },
    ],
  },
  passives: [
    {
      id: 'thane_taunt',
      name: 'Provocazione',
      trigger: 'onTurnStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'taunt', duration: 2, stacks: 1, onSelf: true }],
    },
    {
      id: 'thane_guard_start',
      name: 'Postura di Guardia',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'taunt', duration: 2, stacks: 1, onSelf: true }],
    },
    {
      id: 'thane_retribution',
      name: 'Rappresaglia',
      trigger: 'onDamaged',
      targeting: 'triggerSource',
      chance: 0.6,
      actions: [{ kind: 'applyStatus', statusId: 'atk_down', duration: 2, stacks: 1 }],
    },
  ],
};

const BLADE: UnitDef = {
  id: 'hero_kael',
  name: 'Kael',
  role: 'blade',
  rarity: 'rare',
  baseStats: {
    maxHp: 3600,
    atk: 400,
    def: 160,
    speed: 106,
    critRate: 0.15,
    critDamage: 1.6,
    accuracy: 1.0,
    resistance: 120,
    energyMax: 100,
  },
  growth: { perLevel: { maxHp: 215, atk: 27, def: 10 } },
  basicAttack: {
    id: 'kael_flurry',
    name: 'Raffica',
    trigger: 'active',
    targeting: 'singleEnemy',
    actions: [{ kind: 'damage', power: 0.55, damageType: 'physical', hits: 2, tags: ['physical'] }],
  },
  ability: {
    id: 'kael_onslaught',
    name: 'Assalto Inarrestabile',
    trigger: 'active',
    targeting: 'singleEnemy',
    energyCost: 100,
    actions: [{ kind: 'damage', power: 0.7, damageType: 'physical', hits: 3, tags: ['physical'] }],
  },
  passives: [
    {
      id: 'kael_momentum_gain',
      name: 'Slancio',
      trigger: 'onHit',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'momentum', duration: 99, stacks: 1, onSelf: true }],
    },
    {
      id: 'kael_momentum_break',
      name: 'Slancio Spezzato',
      trigger: 'onDamaged',
      targeting: 'self',
      conditions: [{ kind: 'isCrit' }],
      actions: [{ kind: 'removeStatus', statusId: 'momentum', onSelf: true }],
    },
    {
      id: 'kael_bloodrush',
      name: 'Foga',
      trigger: 'onKill',
      targeting: 'self',
      actions: [{ kind: 'pushGauge', amount: 0.5 }],
    },
  ],
};

const THIEF: UnitDef = {
  id: 'hero_vesper',
  name: 'Vesper',
  role: 'thief',
  rarity: 'rare',
  baseStats: {
    maxHp: 3000,
    atk: 360,
    def: 110,
    speed: 138,
    critRate: 0.3,
    critDamage: 1.6,
    accuracy: 1.0,
    resistance: 100,
    energyMax: 90,
  },
  growth: { perLevel: { maxHp: 175, atk: 24, def: 7, speed: 1 } },
  basicAttack: {
    id: 'vesper_cutpurse',
    name: 'Taglioborse',
    trigger: 'active',
    targeting: 'singleEnemy',
    actions: [
      { kind: 'damage', power: 1.1, damageType: 'physical', tags: ['physical'] },
      { kind: 'stealBuff', count: 1 },
    ],
  },
  ability: {
    id: 'vesper_heist',
    name: 'Colpo Grosso',
    trigger: 'active',
    targeting: 'lowestHpEnemy',
    energyCost: 90,
    actions: [
      { kind: 'stealBuff', count: 2 },
      { kind: 'damage', power: 1.7, damageType: 'physical', tags: ['physical'] },
    ],
  },
  passives: [
    {
      id: 'vesper_headstart',
      name: 'Anticipo',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'pushGauge', amount: 0.4 }],
    },
    {
      id: 'vesper_finisher',
      name: 'Giustiziere',
      trigger: 'onHit',
      targeting: 'triggerSource',
      conditions: [{ kind: 'targetHpBelowPct', value: 50 }],
      cooldown: 1,
      actions: [{ kind: 'damage', power: 0.6, damageType: 'physical', tags: ['physical'] }],
    },
  ],
};

const ASSASSIN: UnitDef = {
  id: 'hero_umbra',
  name: 'Umbra',
  role: 'assassin',
  rarity: 'legendary',
  baseStats: {
    maxHp: 2700,
    atk: 500,
    def: 90,
    speed: 122,
    critRate: 0.25,
    critDamage: 1.8,
    accuracy: 1.0,
    resistance: 90,
    energyMax: 100,
  },
  growth: { perLevel: { maxHp: 160, atk: 33, def: 6, speed: 1 } },
  basicAttack: {
    id: 'umbra_shadowstrike',
    name: 'Colpo d\'Ombra',
    trigger: 'active',
    targeting: 'backRowEnemySingle',
    actions: [{ kind: 'damage', power: 1.4, damageType: 'physical', tags: ['physical', 'shadow'] }],
  },
  ability: {
    id: 'umbra_deathmark',
    name: 'Marchio della Morte',
    trigger: 'active',
    targeting: 'backRowEnemySingle',
    energyCost: 100,
    actions: [
      { kind: 'damage', power: 2.4, damageType: 'physical', tags: ['physical', 'shadow'] },
      { kind: 'applyStatus', statusId: 'bleed', duration: 4, stacks: 2 },
    ],
  },
  passives: [
    {
      id: 'umbra_vanish',
      name: 'Dissolvenza',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'stealth', duration: 99, stacks: 1, onSelf: true }],
    },
    {
      id: 'umbra_ambush',
      name: 'Agguato',
      trigger: 'onBeforeAttack',
      targeting: 'self',
      conditions: [{ kind: 'selfHasStatus', statusId: 'stealth' }],
      actions: [{ kind: 'applyStatus', statusId: 'ambush', duration: 1, stacks: 1, onSelf: true }],
    },
    {
      id: 'umbra_reveal',
      name: 'Rivelazione',
      trigger: 'onBeforeAttack',
      targeting: 'self',
      actions: [{ kind: 'removeStatus', statusId: 'stealth', onSelf: true }],
    },
    {
      id: 'umbra_reprise',
      name: 'Ritorno nell\'Ombra',
      trigger: 'onKill',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'stealth', duration: 99, stacks: 1, onSelf: true }],
    },
  ],
};

export const HEROES: UnitDef[] = [HEALER, CASTER, DEFENDER, BLADE, THIEF, ASSASSIN];
export const HERO_MAP: Record<string, UnitDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));
