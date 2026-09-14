/**
 * I kit dei sei ruoli: attacco base, ultimate e passive.
 *
 * Estratti una volta sola e condivisi da TUTTE le creature di quel ruolo: una
 * creatura è "statistiche + tipi + kit di ruolo + linea evolutiva". Le mosse non
 * dichiarano un elemento, quindi prendono automaticamente il tipo di chi le usa
 * (e con esso il bonus stesso-tipo): lo stesso kit funziona per una creatura di
 * fuoco o di ghiaccio senza duplicare nulla.
 */

import type { Effect, Role } from '@engine/types';

export interface RoleKit {
  basicAttack: Effect;
  ability: Effect;
  passives: Effect[];
  /** Descrizione del ruolo, mostrata nella UI. */
  blurb: string;
}

const HEALER: RoleKit = {
  blurb: 'Cura il più ferito; la cura in eccesso diventa scudo.',
  basicAttack: {
    id: 'kit_healer_basic',
    name: 'Tocco Curativo',
    trigger: 'active',
    targeting: 'lowestHpPctAllyOrSelf',
    actions: [{ kind: 'heal', power: 1.3, overhealToShield: true }],
    tags: ['holy'],
  },
  ability: {
    id: 'kit_healer_ult',
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
      id: 'kit_healer_blessing',
      name: 'Benedizione Iniziale',
      trigger: 'onBattleStart',
      targeting: 'allAllies',
      actions: [{ kind: 'applyStatus', statusId: 'regen', duration: 3, stacks: 1 }],
      tags: ['holy'],
    },
    {
      id: 'kit_healer_judgement',
      name: 'Giudizio Luminoso',
      trigger: 'onTurnEnd',
      targeting: 'lowestHpEnemy',
      // Il Curatore resta un curatore, ma deve poter CHIUDERE un combattimento:
      // senza pressione offensiva sarebbe una scelta-trappola e premierebbe lo stallo.
      actions: [{ kind: 'damage', power: 0.55, damageType: 'magical', tags: ['magical', 'holy'] }],
      tags: ['holy'],
    },
    {
      id: 'kit_healer_emergency',
      name: "Intervento d'Emergenza",
      trigger: 'onAllyDeath',
      targeting: 'allAllies',
      maxTriggersPerBattle: 2,
      actions: [{ kind: 'heal', power: 2.0, overhealToShield: true }],
      tags: ['holy'],
    },
  ],
};

const CASTER: RoleKit = {
  blurb: 'Danno ad area: lo contrasta la Resistenza, non la Difesa. Accumula cariche.',
  basicAttack: {
    id: 'kit_caster_basic',
    name: 'Ondata Arcana',
    trigger: 'active',
    targeting: 'allEnemies',
    actions: [{ kind: 'damage', power: 0.6, damageType: 'magical', tags: ['magical', 'area'] }],
    tags: ['area'],
  },
  ability: {
    id: 'kit_caster_ult',
    name: 'Cataclisma',
    trigger: 'active',
    targeting: 'allEnemies',
    energyCost: 110,
    // La Carica Arcana potenzia l'attacco: il Cataclisma ne beneficia e poi la consuma.
    actions: [
      { kind: 'damage', power: 1.5, damageType: 'magical', tags: ['magical', 'area'] },
      { kind: 'applyStatus', statusId: 'burn', duration: 3, stacks: 2 },
      { kind: 'removeStatus', statusId: 'arcane_charge', onSelf: true },
    ],
    tags: ['area'],
  },
  passives: [
    {
      id: 'kit_caster_charge',
      name: 'Accumulo Arcano',
      trigger: 'onTurnStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'arcane_charge', duration: 99, stacks: 1, onSelf: true }],
      tags: ['magical'],
    },
    {
      id: 'kit_caster_scorch',
      name: 'Marchio Bruciante',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.4,
      actions: [{ kind: 'applyStatus', statusId: 'burn', duration: 3, stacks: 1 }],
      tags: ['fire'],
    },
  ],
};

const DEFENDER: RoleKit = {
  blurb: 'Provoca: gli attacchi singoli vanno su di lui. Guadagna energia subendo danno.',
  basicAttack: {
    id: 'kit_defender_basic',
    name: 'Scudata',
    trigger: 'active',
    targeting: 'singleEnemy',
    actions: [
      { kind: 'damage', power: 1.0, damageType: 'physical', tags: ['physical'] },
      { kind: 'applyStatus', statusId: 'def_down', duration: 2, stacks: 1 },
    ],
  },
  ability: {
    id: 'kit_defender_ult',
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
      id: 'kit_defender_taunt',
      name: 'Provocazione',
      trigger: 'onTurnStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'taunt', duration: 2, stacks: 1, onSelf: true }],
    },
    {
      id: 'kit_defender_guard',
      name: 'Postura di Guardia',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'taunt', duration: 2, stacks: 1, onSelf: true }],
    },
    {
      id: 'kit_defender_retribution',
      name: 'Rappresaglia',
      trigger: 'onDamaged',
      targeting: 'triggerSource',
      chance: 0.6,
      actions: [{ kind: 'applyStatus', statusId: 'atk_down', duration: 2, stacks: 1 }],
    },
  ],
};

const BLADE: RoleKit = {
  blurb: 'Colpi multipli; accumula Slancio, che perde se subisce un critico.',
  basicAttack: {
    id: 'kit_blade_basic',
    name: 'Raffica',
    trigger: 'active',
    targeting: 'singleEnemy',
    actions: [{ kind: 'damage', power: 0.55, damageType: 'physical', hits: 2, tags: ['physical'] }],
  },
  ability: {
    id: 'kit_blade_ult',
    name: 'Assalto Inarrestabile',
    trigger: 'active',
    targeting: 'singleEnemy',
    energyCost: 100,
    actions: [{ kind: 'damage', power: 0.7, damageType: 'physical', hits: 3, tags: ['physical'] }],
  },
  passives: [
    {
      id: 'kit_blade_momentum',
      name: 'Slancio',
      trigger: 'onHit',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'momentum', duration: 99, stacks: 1, onSelf: true }],
    },
    {
      id: 'kit_blade_break',
      name: 'Slancio Spezzato',
      trigger: 'onDamaged',
      targeting: 'self',
      conditions: [{ kind: 'isCrit' }],
      actions: [{ kind: 'removeStatus', statusId: 'momentum', onSelf: true }],
    },
    {
      id: 'kit_blade_rush',
      name: 'Foga',
      trigger: 'onKill',
      targeting: 'self',
      actions: [{ kind: 'pushGauge', amount: 0.5 }],
    },
  ],
};

const THIEF: RoleKit = {
  blurb: 'Velocissimo, agisce per primo, ruba buff e finisce i feriti.',
  basicAttack: {
    id: 'kit_thief_basic',
    name: 'Taglioborse',
    trigger: 'active',
    targeting: 'singleEnemy',
    actions: [
      { kind: 'damage', power: 1.1, damageType: 'physical', tags: ['physical'] },
      { kind: 'stealBuff', count: 1 },
    ],
  },
  ability: {
    id: 'kit_thief_ult',
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
      id: 'kit_thief_headstart',
      name: 'Anticipo',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'pushGauge', amount: 0.4 }],
    },
    {
      id: 'kit_thief_finisher',
      name: 'Giustiziere',
      trigger: 'onHit',
      targeting: 'triggerSource',
      conditions: [{ kind: 'targetHpBelowPct', value: 50 }],
      cooldown: 1,
      actions: [{ kind: 'damage', power: 0.6, damageType: 'physical', tags: ['physical'] }],
    },
  ],
};

const ASSASSIN: RoleKit = {
  blurb: 'Furtivo: non bersagliabile finché non attacca. Colpisce la retrovia.',
  basicAttack: {
    id: 'kit_assassin_basic',
    name: "Colpo d'Ombra",
    trigger: 'active',
    targeting: 'backRowEnemySingle',
    actions: [{ kind: 'damage', power: 1.4, damageType: 'physical', tags: ['physical', 'shadow'] }],
  },
  ability: {
    id: 'kit_assassin_ult',
    name: 'Marchio della Morte',
    trigger: 'active',
    targeting: 'backRowEnemySingle',
    energyCost: 100,
    actions: [
      { kind: 'damage', power: 1.9, damageType: 'physical', tags: ['physical', 'shadow'] },
      { kind: 'applyStatus', statusId: 'bleed', duration: 4, stacks: 2 },
    ],
  },
  passives: [
    {
      id: 'kit_assassin_vanish',
      name: 'Dissolvenza',
      trigger: 'onBattleStart',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'stealth', duration: 99, stacks: 1, onSelf: true }],
    },
    {
      id: 'kit_assassin_ambush',
      name: 'Agguato',
      trigger: 'onBeforeAttack',
      targeting: 'self',
      conditions: [{ kind: 'selfHasStatus', statusId: 'stealth' }],
      actions: [{ kind: 'applyStatus', statusId: 'ambush', duration: 1, stacks: 1, onSelf: true }],
    },
    {
      id: 'kit_assassin_reveal',
      name: 'Rivelazione',
      trigger: 'onBeforeAttack',
      targeting: 'self',
      actions: [{ kind: 'removeStatus', statusId: 'stealth', onSelf: true }],
    },
    {
      id: 'kit_assassin_reprise',
      name: "Ritorno nell'Ombra",
      trigger: 'onKill',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'stealth', duration: 99, stacks: 1, onSelf: true }],
    },
  ],
};

export const ROLE_KITS: Record<Role, RoleKit> = {
  healer: HEALER,
  caster: CASTER,
  defender: DEFENDER,
  blade: BLADE,
  thief: THIEF,
  assassin: ASSASSIN,
};
