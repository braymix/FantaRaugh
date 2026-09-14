/**
 * Selezione dei bersagli. Rispetta, in ordine: untargetable/stealth, taunt,
 * regola della prima linea, e infine la preferenza di ruolo (deterministica).
 * Nessuna scelta usa Math.random: dove serve casualità arriva il PRNG con seed.
 */

import type { Rng } from './prng';
import { getFlags } from './status';
import type { Registry, TargetRule, Unit } from './types';

export interface TargetContext {
  source: Unit;
  /** Controparte del trigger (es. chi ha appena colpito), per 'triggerSource'. */
  other: Unit | null;
}

function alive(units: Unit[]): Unit[] {
  return units.filter((u) => u.alive);
}

export function alliesOf(source: Unit, all: Unit[]): Unit[] {
  return alive(all).filter((u) => u.side === source.side);
}

export function enemiesOf(source: Unit, all: Unit[]): Unit[] {
  return alive(all).filter((u) => u.side !== source.side);
}

/** Stabilizza l'ordine per tie-break deterministici (mai casuale). */
function bySlot(a: Unit, b: Unit): number {
  return a.slot - b.slot || a.uid.localeCompare(b.uid);
}

function hpPct(u: Unit): number {
  return u.hp / u.base.maxHp;
}

/** Candidati validi come bersaglio singolo nemico (taunt/stealth/front-row). */
function singleEnemyCandidates(source: Unit, all: Unit[], registry: Registry, bypassFront: boolean): Unit[] {
  let enemies = enemiesOf(source, all).filter((e) => {
    const f = getFlags(e, registry);
    return !f.untargetable && !f.stealth;
  });
  if (enemies.length === 0) return [];

  // Taunt ha la precedenza assoluta e ignora la regola della prima linea.
  const taunters = enemies.filter((e) => getFlags(e, registry).taunt);
  if (taunters.length > 0) return taunters;

  if (!bypassFront) {
    const front = enemies.filter((e) => e.row === 'front');
    if (front.length > 0) enemies = front;
  }
  return enemies;
}

function pickByRole(source: Unit, candidates: Unit[]): Unit | null {
  if (candidates.length === 0) return null;
  const sorted = [...candidates];
  switch (source.role) {
    case 'thief':
      // Finisce i feriti: HP% più basso.
      sorted.sort((a, b) => hpPct(a) - hpPct(b) || bySlot(a, b));
      break;
    default:
      // Focus fire: HP corrente più basso.
      sorted.sort((a, b) => a.hp - b.hp || bySlot(a, b));
      break;
  }
  return sorted[0] ?? null;
}

export function resolveTargets(
  rule: TargetRule,
  ctx: TargetContext,
  all: Unit[],
  rng: Rng,
  registry: Registry,
): Unit[] {
  const { source, other } = ctx;
  switch (rule) {
    case 'self':
      return source.alive ? [source] : [];

    case 'triggerSource':
      return other && other.alive ? [other] : [];

    case 'singleEnemy': {
      const cand = singleEnemyCandidates(source, all, registry, source.role === 'assassin');
      const t = pickByRole(source, cand);
      return t ? [t] : [];
    }

    case 'lowestHpEnemy': {
      const cand = singleEnemyCandidates(source, all, registry, false);
      const sorted = [...cand].sort((a, b) => a.hp - b.hp || bySlot(a, b));
      return sorted[0] ? [sorted[0]] : [];
    }

    case 'backRowEnemySingle': {
      // Assassino: bypassa la prima linea puntando la retrovia.
      const cand = singleEnemyCandidates(source, all, registry, true);
      const back = cand.filter((e) => e.row === 'back');
      const pool = back.length > 0 ? back : cand;
      const sorted = [...pool].sort((a, b) => a.hp - b.hp || bySlot(a, b));
      return sorted[0] ? [sorted[0]] : [];
    }

    case 'randomEnemy': {
      const cand = singleEnemyCandidates(source, all, registry, false);
      if (cand.length === 0) return [];
      const idx = rng.int(0, cand.length - 1);
      const picked = cand[idx];
      return picked ? [picked] : [];
    }

    case 'allEnemies':
      return enemiesOf(source, all)
        .filter((e) => !getFlags(e, registry).untargetable)
        .sort(bySlot);

    case 'frontRowEnemies': {
      const enemies = enemiesOf(source, all).filter((e) => !getFlags(e, registry).untargetable);
      const front = enemies.filter((e) => e.row === 'front');
      return (front.length > 0 ? front : enemies).sort(bySlot);
    }

    case 'allAllies':
      return alliesOf(source, all).sort(bySlot);

    case 'alliesExceptSelf':
      return alliesOf(source, all)
        .filter((a) => a.uid !== source.uid)
        .sort(bySlot);

    case 'lowestHpPctAlly': {
      const allies = alliesOf(source, all);
      const sorted = [...allies].sort((a, b) => hpPct(a) - hpPct(b) || bySlot(a, b));
      return sorted[0] ? [sorted[0]] : [];
    }

    case 'lowestHpPctAllyOrSelf': {
      const allies = alliesOf(source, all);
      const sorted = [...allies].sort((a, b) => hpPct(a) - hpPct(b) || bySlot(a, b));
      return sorted[0] ? [sorted[0]] : source.alive ? [source] : [];
    }

    default:
      return [];
  }
}
