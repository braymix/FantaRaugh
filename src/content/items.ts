/**
 * Oggetti tenuti: uno per creatura. Sostituiscono armi e perk con un modello più
 * leggibile e "da roguelike": ogni oggetto ha un **trade-off esplicito**, così non
 * esistono scelte dominate. Gli effetti sono gli stessi Effect componibili.
 */

import type { Effect, Rarity, StatMod } from '@engine/types';

export interface ItemDef {
  id: string;
  name: string;
  rarity: Rarity;
  /** Modificatori permanenti mentre è equipaggiato. */
  statMods?: StatMod[];
  /** Effetto innescato (stessa struttura di abilità e passive). */
  effect?: Effect;
  /** Il compromesso, in chiaro: serve a far capire il costo della scelta. */
  tradeoff?: string;
}

export const ITEMS: ItemDef[] = [
  {
    id: 'item_quickclaw',
    name: 'Artiglio Rapido',
    rarity: 'rare',
    effect: {
      id: 'item_quickclaw',
      name: 'Artiglio Rapido',
      trigger: 'onBattleStart',
      targeting: 'self',
      chance: 0.35,
      actions: [{ kind: 'pushGauge', amount: 0.45 }],
    },
    tradeoff: 'Solo il 35% delle volte: inaffidabile per definizione.',
  },
  {
    id: 'item_laggingtail',
    name: 'Coda Lenta',
    rarity: 'rare',
    statMods: [
      { stat: 'speed', mode: 'mul', value: -0.25 },
      { stat: 'atk', mode: 'mul', value: 0.3 },
    ],
    tradeoff: 'Agisci molto più tardi, ma picchi molto più forte.',
  },
  {
    id: 'item_loadeddice',
    name: 'Dadi Truccati',
    rarity: 'epic',
    effect: {
      id: 'item_loadeddice',
      name: 'Dadi Truccati',
      trigger: 'onTurnStart',
      targeting: 'self',
      chance: 0.5,
      actions: [{ kind: 'applyStatus', statusId: 'atk_up', duration: 2, stacks: 1, onSelf: true }],
    },
    statMods: [{ stat: 'accuracy', mode: 'add', value: -0.08 }],
    tradeoff: 'Spesso ti carichi, ma manchi più spesso i colpi.',
  },
  {
    id: 'item_adrenaline',
    name: 'Sfera Adrenalina',
    rarity: 'rare',
    effect: {
      id: 'item_adrenaline',
      name: 'Sfera Adrenalina',
      trigger: 'onCrit',
      targeting: 'self',
      actions: [{ kind: 'applyStatus', statusId: 'atk_up', duration: 3, stacks: 1, onSelf: true }],
    },
    statMods: [{ stat: 'critRate', mode: 'add', value: 0.08 }],
    tradeoff: 'Inutile su chi non fa critici.',
  },
  {
    id: 'item_redcard',
    name: 'Carta Rossa',
    rarity: 'rare',
    effect: {
      id: 'item_redcard',
      name: 'Carta Rossa',
      trigger: 'onDamaged',
      targeting: 'triggerSource',
      chance: 0.5,
      actions: [{ kind: 'applyStatus', statusId: 'atk_down', duration: 2, stacks: 1 }],
    },
    tradeoff: 'Reattivo: non fa nulla se non vieni colpito.',
  },
  {
    id: 'item_kingsrock',
    name: 'Roccia del Re',
    rarity: 'epic',
    effect: {
      id: 'item_kingsrock',
      name: 'Roccia del Re',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.2,
      cooldown: 2,
      actions: [{ kind: 'applyStatus', statusId: 'stun', duration: 1, stacks: 1 }],
      tags: ['control'],
    },
    tradeoff: 'Controllo potente ma raro e con ricarica.',
  },
  {
    id: 'item_vampiric',
    name: 'Amuleto Vampirico',
    rarity: 'epic',
    effect: {
      id: 'item_vampiric',
      name: 'Amuleto Vampirico',
      trigger: 'onHit',
      targeting: 'self',
      actions: [{ kind: 'heal', power: 0.28 }],
    },
    statMods: [{ stat: 'maxHp', mode: 'mul', value: -0.1 }],
    tradeoff: 'Ti curi colpendo, ma parti con meno HP.',
  },
  {
    id: 'item_toxicpin',
    name: 'Spilla Tossica',
    rarity: 'common',
    effect: {
      id: 'item_toxicpin',
      name: 'Spilla Tossica',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.5,
      actions: [{ kind: 'applyStatus', statusId: 'poison', duration: 4, stacks: 1 }],
      tags: ['poison'],
    },
    tradeoff: 'Il veleno impiega tempo: scarso nei fight brevi.',
  },
  {
    id: 'item_emberstone',
    name: 'Cristallo Focoso',
    rarity: 'common',
    effect: {
      id: 'item_emberstone',
      name: 'Cristallo Focoso',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.35,
      actions: [{ kind: 'applyStatus', statusId: 'burn', duration: 3, stacks: 1 }],
      tags: ['fire'],
    },
    tradeoff: 'Danno nel tempo, non immediato.',
  },
  {
    id: 'item_frostseal',
    name: 'Sigillo di Ghiaccio',
    rarity: 'common',
    effect: {
      id: 'item_frostseal',
      name: 'Sigillo di Ghiaccio',
      trigger: 'onHit',
      targeting: 'triggerSource',
      chance: 0.3,
      actions: [{ kind: 'applyStatus', statusId: 'slow', duration: 2, stacks: 1 }],
      tags: ['control'],
    },
    tradeoff: 'Rallenta, ma non aumenta il tuo danno.',
  },
  {
    id: 'item_executioner',
    name: 'Talismano del Boia',
    rarity: 'legendary',
    effect: {
      id: 'item_executioner',
      name: 'Talismano del Boia',
      trigger: 'onHit',
      targeting: 'triggerSource',
      conditions: [{ kind: 'targetHpBelowPct', value: 35 }],
      cooldown: 1,
      actions: [{ kind: 'damage', power: 0.85, damageType: 'physical', tags: ['physical'] }],
    },
    tradeoff: 'Inerte finché il bersaglio non è già ferito.',
  },
  {
    id: 'item_lifeanchor',
    name: 'Ancora Vitale',
    rarity: 'epic',
    effect: {
      id: 'item_lifeanchor',
      name: 'Ancora Vitale',
      trigger: 'onDamaged',
      targeting: 'self',
      conditions: [{ kind: 'selfHpBelowPct', value: 30 }],
      maxTriggersPerBattle: 1,
      actions: [{ kind: 'shield', power: 3.2 }],
    },
    tradeoff: 'Una sola volta per battaglia.',
  },
  {
    id: 'item_banner',
    name: 'Stendardo Risoluto',
    rarity: 'rare',
    effect: {
      id: 'item_banner',
      name: 'Stendardo Risoluto',
      trigger: 'onBattleStart',
      targeting: 'allAllies',
      actions: [{ kind: 'applyStatus', statusId: 'atk_up', duration: 999, stacks: 1 }],
    },
    statMods: [{ stat: 'def', mode: 'mul', value: -0.15 }],
    tradeoff: "Potenzia tutta la squadra, ma t'indebolisce la difesa.",
  },
  {
    id: 'item_ironband',
    name: 'Bracciale di Ferro',
    rarity: 'common',
    statMods: [
      { stat: 'def', mode: 'mul', value: 0.35 },
      { stat: 'resistance', mode: 'mul', value: 0.2 },
      { stat: 'speed', mode: 'mul', value: -0.12 },
    ],
    tradeoff: 'Molto più solido, ma sensibilmente più lento.',
  },
];

export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
