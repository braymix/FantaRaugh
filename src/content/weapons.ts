/**
 * 6 armi. Ogni arma dà modificatori di statistica, ha affinità con certi ruoli e
 * un numero di slot perk derivato dalla rarità. Alcune hanno un effetto
 * intrinseco (a sua volta un Effect componibile).
 */

import type { WeaponDef } from './types';

export const WEAPONS: WeaponDef[] = [
  {
    id: 'wpn_ironsword',
    name: 'Spada di Ferro',
    type: 'sword',
    rarity: 'rare',
    statMods: [
      { stat: 'atk', mode: 'add', value: 40 },
      { stat: 'critRate', mode: 'add', value: 0.05 },
    ],
    affinityRoles: ['blade', 'defender'],
  },
  {
    id: 'wpn_oakstaff',
    name: 'Bastone di Quercia',
    type: 'staff',
    rarity: 'rare',
    statMods: [
      { stat: 'atk', mode: 'add', value: 50 },
      { stat: 'energyMax', mode: 'add', value: -10 },
    ],
    affinityRoles: ['caster', 'healer'],
    intrinsic: {
      id: 'wpn_oakstaff_intrinsic',
      name: 'Eco Arcana',
      trigger: 'onTurnStart',
      targeting: 'self',
      actions: [{ kind: 'gainEnergy', amount: 8 }],
    },
  },
  {
    id: 'wpn_shadowfang',
    name: 'Zanna d\'Ombra',
    type: 'dagger',
    rarity: 'epic',
    statMods: [
      { stat: 'atk', mode: 'add', value: 35 },
      { stat: 'critRate', mode: 'add', value: 0.12 },
      { stat: 'speed', mode: 'add', value: 15 },
    ],
    affinityRoles: ['thief', 'assassin'],
    intrinsic: {
      id: 'wpn_shadowfang_intrinsic',
      name: 'Sete di Sangue',
      trigger: 'onKill',
      targeting: 'self',
      actions: [{ kind: 'gainEnergy', amount: 30 }],
    },
  },
  {
    id: 'wpn_bulwark',
    name: 'Egida del Guardiano',
    type: 'shield',
    rarity: 'epic',
    statMods: [
      { stat: 'def', mode: 'add', value: 80 },
      { stat: 'maxHp', mode: 'add', value: 300 },
      { stat: 'resistance', mode: 'add', value: 40 },
    ],
    affinityRoles: ['defender'],
    intrinsic: {
      id: 'wpn_bulwark_intrinsic',
      name: 'Contraccolpo',
      trigger: 'onDamaged',
      targeting: 'triggerSource',
      chance: 0.5,
      actions: [{ kind: 'damage', power: 0.4, damageType: 'physical', tags: ['physical'] }],
    },
  },
  {
    id: 'wpn_longbow',
    name: 'Arco Lungo',
    type: 'bow',
    rarity: 'rare',
    statMods: [
      { stat: 'atk', mode: 'add', value: 45 },
      { stat: 'accuracy', mode: 'add', value: 0.05 },
    ],
    affinityRoles: ['thief', 'assassin'],
  },
  {
    id: 'wpn_warhammer',
    name: 'Maglio da Guerra',
    type: 'hammer',
    rarity: 'legendary',
    statMods: [
      { stat: 'atk', mode: 'add', value: 70 },
      { stat: 'critDamage', mode: 'add', value: 0.3 },
      { stat: 'speed', mode: 'add', value: -10 },
    ],
    affinityRoles: ['blade', 'defender'],
    intrinsic: {
      id: 'wpn_warhammer_intrinsic',
      name: 'Onda d\'Urto',
      trigger: 'onCrit',
      targeting: 'triggerSource',
      actions: [{ kind: 'applyStatus', statusId: 'stun', duration: 1, stacks: 1 }],
      chance: 0.25,
      cooldown: 2,
    },
  },
];

export const WEAPON_MAP: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
