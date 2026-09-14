/**
 * Generazione automatica delle descrizioni degli effetti a partire dai DATI.
 *
 * Motivo: non voglio mantenere a mano testi che divergono dal comportamento
 * reale. La descrizione è derivata da trigger + condizioni + azioni + targeting,
 * quindi resta sempre allineata a ciò che l'effetto fa davvero. Un effetto può
 * comunque fornire una `description` manuale che ha la precedenza (per casi in
 * cui il testo generato risulterebbe goffo).
 */

import type { Action, Condition, Effect, Registry, Tag, TargetRule, Trigger } from './types';

const TRIGGER_TEXT: Record<Trigger, string> = {
  active: '',
  onBattleStart: 'A inizio battaglia',
  onTurnStart: 'A inizio turno',
  onTurnEnd: 'A fine turno',
  onBeforeAttack: 'Prima di attaccare',
  onBeforeDefend: 'Prima di difendere',
  onHit: 'Quando colpisci',
  onCrit: 'Con un colpo critico',
  onKill: 'Quando uccidi un nemico',
  onDamaged: 'Quando subisci danno',
  onHealed: 'Quando vieni curato',
  onDeath: 'Alla tua morte',
  onAllyDeath: 'Alla morte di un alleato',
  onStatusApplied: 'Quando ricevi uno stato',
};

const TARGET_TEXT: Record<TargetRule, string> = {
  self: 'sé stesso',
  triggerSource: "l'unità coinvolta",
  singleEnemy: 'un nemico',
  lowestHpEnemy: 'il nemico con meno HP',
  lowestHpPctAlly: "l'alleato più ferito",
  lowestHpPctAllyOrSelf: "l'alleato più ferito (o sé stesso)",
  allEnemies: 'tutti i nemici',
  allAllies: 'tutti gli alleati',
  alliesExceptSelf: 'gli altri alleati',
  frontRowEnemies: 'i nemici in prima linea',
  backRowEnemySingle: 'un nemico in retrovia (ignora la prima linea)',
  randomEnemy: 'un nemico a caso',
};

function statusName(id: string, registry?: Registry): string {
  return registry?.statuses[id]?.name ?? id;
}

function describeAction(action: Action, target: string, registry?: Registry): string {
  switch (action.kind) {
    case 'damage': {
      const type = action.damageType === 'physical' ? 'fisico' : 'magico';
      const mult = `${Math.round(action.power * 100)}%`;
      const hits = action.hits && action.hits > 1 ? ` in ${action.hits} colpi` : '';
      const pierce =
        action.defIgnorePct && action.defIgnorePct > 0
          ? ` (ignora il ${Math.round(action.defIgnorePct * 100)}% della difesa)`
          : '';
      const bonus = action.bonusVsTag
        ? `, +${Math.round(action.bonusVsTag.pct * 100)}% se il bersaglio ha "${action.bonusVsTag.tag}"`
        : '';
      return `infligge danno ${type} pari al ${mult} dell'attacco${hits} a ${target}${pierce}${bonus}`;
    }
    case 'heal': {
      const shield = action.overhealToShield ? ' (l\'eccesso diventa scudo)' : '';
      return `cura ${target} del ${Math.round(action.power * 100)}% dell'attacco${shield}`;
    }
    case 'shield':
      return `dà a ${target} uno scudo pari al ${Math.round(action.power * 100)}% dell'attacco`;
    case 'applyStatus': {
      const who = action.onSelf ? 'sé stesso' : target;
      const stacks = action.stacks && action.stacks > 1 ? ` x${action.stacks}` : '';
      return `applica "${statusName(action.statusId, registry)}"${stacks} a ${who} per ${action.duration} turni`;
    }
    case 'cleanse':
      return `rimuove ${action.count ?? 'tutti i'} debuff da ${target}`;
    case 'removeStatus':
      return `rimuove "${statusName(action.statusId, registry)}" da ${action.onSelf ? 'sé stesso' : target}`;
    case 'pushGauge': {
      const pct = Math.round(action.amount * 100);
      return action.amount >= 0
        ? `anticipa il turno di ${target} del ${pct}%`
        : `ritarda il turno di ${target} del ${Math.abs(pct)}%`;
    }
    case 'gainEnergy':
      return `dà ${action.amount} energia a ${target}`;
    case 'addStack':
      return `accumula ${action.amount} "${action.stack}" (max ${action.max})`;
    case 'consumeStack':
      return `consuma tutti gli stack di "${action.stack}"`;
    case 'stealBuff':
      return `ruba ${action.count ?? 1} buff da ${target}`;
    default:
      return '';
  }
}

function describeCondition(cond: Condition, registry?: Registry): string {
  switch (cond.kind) {
    case 'selfHpBelowPct':
      return `i tuoi HP sono sotto il ${cond.value}%`;
    case 'selfHpAbovePct':
      return `i tuoi HP sono sopra il ${cond.value}%`;
    case 'targetHpBelowPct':
      return `il bersaglio è sotto il ${cond.value}% HP`;
    case 'targetHpAbovePct':
      return `il bersaglio è sopra il ${cond.value}% HP`;
    case 'targetHasTag':
      return `il bersaglio ha "${cond.tag}"`;
    case 'targetHasStatus':
      return `il bersaglio ha "${statusName(cond.statusId, registry)}"`;
    case 'selfHasStatus':
      return `hai "${statusName(cond.statusId, registry)}"`;
    case 'selfMissingStatus':
      return `non hai "${statusName(cond.statusId, registry)}"`;
    case 'stackAtLeast':
      return `hai almeno ${cond.value} "${cond.stack}"`;
    case 'targetIsRow':
      return `il bersaglio è in ${cond.row === 'front' ? 'prima linea' : 'retrovia'}`;
    case 'alliesDeadAtLeast':
      return `almeno ${cond.value} alleati sono morti`;
    case 'isCrit':
      return "è un colpo critico";
    default:
      return '';
  }
}

export function describeEffect(effect: Effect, registry?: Registry): string {
  if (effect.description) return effect.description;

  const target = TARGET_TEXT[effect.targeting];
  const parts = effect.actions.map((a) => describeAction(a, target, registry)).filter(Boolean);
  let body = capitalize(joinList(parts));

  const prefix = TRIGGER_TEXT[effect.trigger];
  if (prefix) body = `${prefix}, ${lower(body)}`;

  if (effect.conditions && effect.conditions.length > 0) {
    const conds = effect.conditions.map((c) => describeCondition(c, registry)).filter(Boolean);
    if (conds.length > 0) body += ` — solo se ${joinList(conds)}`;
  }

  const extras: string[] = [];
  if (effect.chance !== undefined && effect.chance < 1) extras.push(`${Math.round(effect.chance * 100)}% di probabilità`);
  if (effect.cooldown) extras.push(`ricarica ${effect.cooldown} turni`);
  if (effect.maxTriggersPerBattle) extras.push(`max ${effect.maxTriggersPerBattle}/battaglia`);
  if (effect.energyCost) extras.push(`costo ${effect.energyCost} energia`);
  if (extras.length > 0) body += `. [${extras.join(', ')}]`;

  return body + '.';
}

function joinList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return items.slice(0, -1).join(', ') + ' e ' + items[items.length - 1];
}

function capitalize(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

function lower(s: string): string {
  return s.length > 0 ? s[0]!.toLowerCase() + s.slice(1) : s;
}

// ---------------------------------------------------------------------------
// API strutturata: invece di una frase lunga, pezzi scansionabili per la UI.
// Stesso principio (derivata dai dati), ma leggibile a colpo d'occhio.
// ---------------------------------------------------------------------------

export const TAG_LABEL: Record<Tag, string> = {
  fire: 'fuoco',
  bleed: 'sanguinamento',
  poison: 'veleno',
  control: 'controllo',
  area: 'area',
  holy: 'sacro',
  shadow: 'ombra',
  physical: 'fisico',
  magical: 'magico',
  buff: 'buff',
  debuff: 'debuff',
};

export interface EffectAction {
  icon: string;
  text: string;
}

export interface EffectBreakdown {
  /** Quando scatta ("Quando colpisci"); per le attive: "Azione del turno". */
  triggerLabel: string;
  /** Su chi agisce ("un nemico", "tutti gli alleati"). */
  targetLabel: string;
  /** Cosa fa, una voce per azione, senza ripetere il bersaglio. */
  actions: EffectAction[];
  /** Vincoli ("i tuoi HP sono sotto il 30%"). */
  conditions: string[];
  /** Etichette brevi: probabilità, ricarica, limiti, costo energia. */
  chips: string[];
  tags: Tag[];
}

/** Icona sintetica per tipo di azione. */
function actionIcon(action: Action): string {
  switch (action.kind) {
    case 'damage':
      return action.damageType === 'physical' ? '⚔' : '✦';
    case 'heal':
      return '✚';
    case 'shield':
      return '🛡';
    case 'applyStatus':
      return '✨';
    case 'cleanse':
      return '🧼';
    case 'removeStatus':
      return '✖';
    case 'pushGauge':
      return '⏩';
    case 'gainEnergy':
      return '⚡';
    case 'addStack':
      return '▲';
    case 'consumeStack':
      return '▼';
    case 'stealBuff':
      return '🫳';
    default:
      return '•';
  }
}

/**
 * Descrive COSA fa un'azione, senza nominare il bersaglio (mostrato a parte).
 * Frasi corte e numeriche: si leggono a colpo d'occhio.
 */
function describeActionShort(action: Action, registry?: Registry): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  switch (action.kind) {
    case 'damage': {
      const type = action.damageType === 'physical' ? 'fisico' : 'magico';
      const hits = action.hits && action.hits > 1 ? ` ×${action.hits} colpi` : '';
      const total =
        action.hits && action.hits > 1 ? ` (tot. ${pct(action.power * action.hits)})` : '';
      const pierce =
        action.defIgnorePct && action.defIgnorePct > 0
          ? `, ignora ${pct(action.defIgnorePct)} difesa`
          : '';
      const bonus = action.bonusVsTag
        ? `, +${pct(action.bonusVsTag.pct)} se ${TAG_LABEL[action.bonusVsTag.tag]}`
        : '';
      return `Danno ${type} ${pct(action.power)} ATK${hits}${total}${pierce}${bonus}`;
    }
    case 'heal':
      return `Cura ${pct(action.power)} ATK${action.overhealToShield ? ' — eccesso → scudo' : ''}`;
    case 'shield':
      return `Scudo ${pct(action.power)} ATK`;
    case 'applyStatus': {
      const stacks = action.stacks && action.stacks > 1 ? ` ×${action.stacks}` : '';
      const who = action.onSelf ? ' su di sé' : '';
      return `Applica ${statusName(action.statusId, registry)}${stacks}${who} · ${action.duration} turni`;
    }
    case 'cleanse':
      return `Rimuove ${action.count ?? 'tutti i'} debuff`;
    case 'removeStatus':
      return `Consuma ${statusName(action.statusId, registry)}${action.onSelf ? ' su di sé' : ''}`;
    case 'pushGauge':
      return action.amount >= 0
        ? `Anticipa il turno di ${pct(action.amount)}`
        : `Ritarda il turno di ${pct(Math.abs(action.amount))}`;
    case 'gainEnergy':
      return `+${action.amount} energia`;
    case 'addStack':
      return `+${action.amount} ${action.stack} (max ${action.max})`;
    case 'consumeStack':
      return `Consuma gli stack di ${action.stack}`;
    case 'stealBuff':
      return `Ruba ${action.count ?? 1} buff`;
    default:
      return '';
  }
}

export function describeEffectParts(effect: Effect, registry?: Registry): EffectBreakdown {
  const chips: string[] = [];
  if (effect.energyCost) chips.push(`⚡ ${effect.energyCost}`);
  if (effect.chance !== undefined && effect.chance < 1) chips.push(`${Math.round(effect.chance * 100)}%`);
  if (effect.cooldown) chips.push(`ricarica ${effect.cooldown}`);
  if (effect.maxTriggersPerBattle) chips.push(`max ${effect.maxTriggersPerBattle}/battaglia`);

  return {
    triggerLabel: effect.trigger === 'active' ? 'Azione del turno' : TRIGGER_TEXT[effect.trigger],
    targetLabel: TARGET_TEXT[effect.targeting],
    actions: effect.actions
      .map((a) => ({ icon: actionIcon(a), text: describeActionShort(a, registry) }))
      .filter((a) => a.text.length > 0),
    conditions: (effect.conditions ?? []).map((c) => describeCondition(c, registry)).filter(Boolean),
    chips,
    tags: effect.tags ?? [],
  };
}
