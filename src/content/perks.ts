/**
 * 12 perk, ognuno è un Effect componibile. Dimostrano che il sistema di effetti
 * regge la varietà senza casi speciali nel motore: buff a inizio battaglia,
 * lifesteal, DoT su colpo, esecuzioni condizionali, manipolazione del gauge...
 */

import type { PerkDef } from './types';

export const PERKS: PerkDef[] = [
  {
    id: 'perk_whetstone',
    name: 'Pietra Affilata',
    rarity: 'common',
    effect: {
      id: 'perk_whetstone',
      name: 'Pietra Affilata',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'atk_up', duration: 999, stacks: 1, onSelf: true }],
    },
  },
  {
    id: 'perk_lifesteal',
    name: 'Suggizza-vita',
    rarity: 'rare',
    effect: {
      id: 'perk_lifesteal',
      name: 'Suggizza-vita',
      trigger: 'onHit',
      targeting: 'self',
      actions: [{ kind: 'heal', power: 0.25 }],
    },
  },
  {
    id: 'perk_wildfire',
    name: 'Fuoco Fatuo',
    rarity: 'rare',
    effect: {
      id: 'perk_wildfire',
      name: 'Fuoco Fatuo',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.35,
      actions: [{ kind: 'applyStatus', statusId: 'burn', duration: 3, stacks: 1 }],
      tags: ['fire'],
    },
  },
  {
    id: 'perk_sunder',
    name: 'Rompiscudi',
    rarity: 'common',
    effect: {
      id: 'perk_sunder',
      name: 'Rompiscudi',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.4,
      actions: [{ kind: 'applyStatus', statusId: 'def_down', duration: 2, stacks: 1 }],
    },
  },
  {
    id: 'perk_frenzy',
    name: 'Furia Crescente',
    rarity: 'epic',
    effect: {
      id: 'perk_frenzy',
      name: 'Furia Crescente',
      trigger: 'onCrit',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'atk_up', duration: 3, stacks: 1, onSelf: true }],
    },
  },
  {
    id: 'perk_lastditch',
    name: 'Ancora di Vita',
    rarity: 'epic',
    effect: {
      id: 'perk_lastditch',
      name: 'Ancora di Vita',
      trigger: 'onDamaged',
      targeting: 'self',
      conditions: [{ kind: 'selfHpBelowPct', value: 30 }],
      maxTriggersPerBattle: 1,
      actions: [{ kind: 'shield', power: 3.0 }],
    },
  },
  {
    id: 'perk_venomcoat',
    name: 'Lama Avvelenata',
    rarity: 'rare',
    effect: {
      id: 'perk_venomcoat',
      name: 'Lama Avvelenata',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.5,
      actions: [{ kind: 'applyStatus', statusId: 'poison', duration: 4, stacks: 1 }],
      tags: ['poison'],
    },
  },
  {
    id: 'perk_reflexes',
    name: 'Riflessi Fulminei',
    rarity: 'rare',
    effect: {
      id: 'perk_reflexes',
      name: 'Riflessi Fulminei',
      trigger: 'onDamaged',
      targeting: 'self',
      chance: 0.5,
      actions: [{ kind: 'pushGauge', amount: 0.15 }],
    },
  },
  {
    id: 'perk_quickdraw',
    name: 'Scatto Iniziale',
    rarity: 'common',
    effect: {
      id: 'perk_quickdraw',
      name: 'Scatto Iniziale',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'pushGauge', amount: 0.25 }],
    },
  },
  {
    id: 'perk_lastrites',
    name: 'Estremo Conforto',
    rarity: 'epic',
    effect: {
      id: 'perk_lastrites',
      name: 'Estremo Conforto',
      trigger: 'onKill',
      targeting: 'allAllies',
      actions: [{ kind: 'heal', power: 1.0, overhealToShield: true }],
    },
  },
  {
    id: 'perk_frost',
    name: 'Tocco Gelido',
    rarity: 'rare',
    effect: {
      id: 'perk_frost',
      name: 'Tocco Gelido',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.3,
      actions: [{ kind: 'applyStatus', statusId: 'slow', duration: 2, stacks: 1 }],
      tags: ['control'],
    },
  },
  {
    id: 'perk_executioner',
    name: 'Colpo del Boia',
    rarity: 'legendary',
    effect: {
      id: 'perk_executioner',
      name: 'Colpo del Boia',
      trigger: 'onHit',
      targeting: 'triggerSource',
      conditions: [{ kind: 'targetHpBelowPct', value: 35 }],
      cooldown: 1,
      actions: [{ kind: 'damage', power: 0.8, damageType: 'physical', tags: ['physical'] }],
    },
  },
];

export const PERK_MAP: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));
