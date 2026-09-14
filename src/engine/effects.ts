/**
 * Valutazione delle condizioni degli effetti. Le percentuali HP sono su scala
 * 0..100 ("hp sotto il 30%" ⇒ value 30). Le condizioni sono AND: un effetto
 * scatta solo se tutte sono vere.
 */

import { hasStatus } from './status';
import { unitHasTag } from './tags';
import type { Condition, Registry, Unit } from './types';

export interface ConditionContext {
  source: Unit;
  target: Unit | null;
  crit: boolean;
  allUnits: Unit[];
  registry: Registry;
}

function hpPct(u: Unit): number {
  return (u.hp / u.base.maxHp) * 100;
}

function checkOne(cond: Condition, ctx: ConditionContext): boolean {
  const { source, target } = ctx;
  switch (cond.kind) {
    case 'selfHpBelowPct':
      return hpPct(source) < cond.value;
    case 'selfHpAbovePct':
      return hpPct(source) > cond.value;
    case 'targetHpBelowPct':
      return target !== null && hpPct(target) < cond.value;
    case 'targetHpAbovePct':
      return target !== null && hpPct(target) > cond.value;
    case 'targetHasTag':
      return target !== null && unitHasTag(target, cond.tag, ctx.registry);
    case 'targetHasStatus':
      return target !== null && hasStatus(target, cond.statusId);
    case 'selfHasStatus':
      return hasStatus(source, cond.statusId);
    case 'selfMissingStatus':
      return !hasStatus(source, cond.statusId);
    case 'stackAtLeast':
      return (source.stacks[cond.stack] ?? 0) >= cond.value;
    case 'targetIsRow':
      return target !== null && target.row === cond.row;
    case 'alliesDeadAtLeast':
      return ctx.allUnits.filter((u) => u.side === source.side && !u.alive).length >= cond.value;
    case 'isCrit':
      return ctx.crit;
    default:
      return false;
  }
}

export function checkConditions(conditions: Condition[] | undefined, ctx: ConditionContext): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => checkOne(c, ctx));
}
