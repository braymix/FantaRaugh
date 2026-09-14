/**
 * Catalogo degli stati (buff/debuff). Sono dati puri: l'engine li risolve per id
 * tramite il Registry. Tutte le meccaniche "duraturi" (momentum, taunt, veleno,
 * scudi di difesa, stealth...) passano da qui — niente rami speciali nel motore.
 */

import type { StatusDef } from '@engine/types';

export const STATUSES: StatusDef[] = [
  // --- Flag ---
  {
    id: 'taunt',
    name: 'Provocazione',
    kind: 'buff',
    tags: ['buff'],
    maxStacks: 1,
    flags: { taunt: true },
  },
  {
    id: 'stealth',
    name: 'Furtività',
    kind: 'buff',
    tags: ['buff', 'shadow'],
    maxStacks: 1,
    flags: { stealth: true },
  },
  {
    id: 'stun',
    name: 'Stordimento',
    kind: 'debuff',
    tags: ['debuff', 'control'],
    maxStacks: 1,
    flags: { stunned: true },
  },

  // --- DoT / HoT ---
  {
    id: 'poison',
    name: 'Veleno',
    kind: 'debuff',
    tags: ['debuff', 'poison'],
    maxStacks: 5,
    tick: { damagePctMaxHp: 0.04 },
  },
  {
    id: 'bleed',
    name: 'Sanguinamento',
    kind: 'debuff',
    tags: ['debuff', 'bleed'],
    maxStacks: 5,
    tick: { damagePctMaxHp: 0.05 },
  },
  {
    id: 'burn',
    name: 'Ustione',
    kind: 'debuff',
    tags: ['debuff', 'fire'],
    maxStacks: 3,
    tick: { damagePctMaxHp: 0.06 },
  },
  {
    id: 'regen',
    name: 'Rigenerazione',
    kind: 'buff',
    tags: ['buff', 'holy'],
    maxStacks: 3,
    tick: { healPctMaxHp: 0.06 },
  },

  // --- Modificatori di statistica ---
  {
    id: 'atk_up',
    name: 'Forza',
    kind: 'buff',
    tags: ['buff'],
    maxStacks: 3,
    statMods: [{ stat: 'atk', mode: 'mul', value: 0.15 }],
  },
  {
    id: 'atk_down',
    name: 'Debolezza',
    kind: 'debuff',
    tags: ['debuff'],
    maxStacks: 3,
    statMods: [{ stat: 'atk', mode: 'mul', value: -0.15 }],
  },
  {
    id: 'def_up',
    name: 'Difesa',
    kind: 'buff',
    tags: ['buff'],
    maxStacks: 3,
    statMods: [{ stat: 'def', mode: 'mul', value: 0.25 }],
  },
  {
    id: 'def_down',
    name: 'Armatura Spezzata',
    kind: 'debuff',
    tags: ['debuff'],
    maxStacks: 3,
    statMods: [{ stat: 'def', mode: 'mul', value: -0.25 }],
  },
  {
    id: 'fortify',
    name: 'Baluardo',
    kind: 'buff',
    tags: ['buff'],
    maxStacks: 1,
    statMods: [
      { stat: 'def', mode: 'mul', value: 0.5 },
      { stat: 'resistance', mode: 'mul', value: 0.5 },
    ],
  },
  {
    id: 'slow',
    name: 'Rallentamento',
    kind: 'debuff',
    tags: ['debuff', 'control'],
    maxStacks: 2,
    statMods: [{ stat: 'speed', mode: 'mul', value: -0.2 }],
  },

  // --- Meccaniche di ruolo (come stati) ---
  {
    id: 'momentum',
    name: 'Slancio',
    kind: 'buff',
    tags: ['buff'],
    maxStacks: 6,
    statMods: [{ stat: 'atk', mode: 'mul', value: 0.08 }],
  },
  {
    id: 'arcane_charge',
    name: 'Carica Arcana',
    kind: 'buff',
    tags: ['buff', 'magical'],
    maxStacks: 5,
    statMods: [{ stat: 'atk', mode: 'mul', value: 0.12 }],
  },
  {
    id: 'ambush',
    name: 'Agguato',
    kind: 'buff',
    tags: ['buff', 'shadow'],
    maxStacks: 1,
    statMods: [
      { stat: 'critRate', mode: 'add', value: 0.5 },
      { stat: 'critDamage', mode: 'add', value: 0.5 },
    ],
  },
];

/** Mappa id -> StatusDef, pronta per il Registry dell'engine. */
export const STATUS_MAP: Record<string, StatusDef> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s]),
);
