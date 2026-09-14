/**
 * simulateBattle: il cuore deterministico. Barra d'azione a tick (ATB), calcolo
 * del danno, sistema di effetti componibile, log completo di eventi.
 *
 * Determinismo: nessun Math.random / Date.now. Ogni scelta casuale passa dal
 * PRNG con seed. Ogni tie-break (gauge, bersagli) è ordinato per slot/uid.
 * Stesso stato iniziale + stesso seed ⇒ stesso identico BattleResult.
 *
 * Le meccaniche di ruolo NON hanno rami dedicati qui: sono effetti (Effect) che
 * il motore esegue come qualunque altro. L'unica differenziazione "di ruolo" nel
 * motore è la preferenza di targeting (in targeting.ts) e l'energia extra del
 * Difensore quando subisce danno (una singola costante).
 */

import { computeDamage } from './damage';
import { checkConditions } from './effects';
import { makeRng, type Rng } from './prng';
import { effectiveStat } from './stats';
import {
  applyStatus as applyStatusInstance,
  cleanseDebuffs,
  getFlags,
  removeStatus as removeStatusInstance,
} from './status';
import { alliesOf, resolveTargets } from './targeting';
import type {
  Action,
  BattleEvent,
  BattleResult,
  BattleState,
  BattleStats,
  Effect,
  Registry,
  Role,
  Trigger,
  Unit,
  UnitSnapshot,
} from './types';

interface Ctx {
  state: BattleState;
  rng: Rng;
  registry: Registry;
  events: BattleEvent[];
  stats: BattleStats;
  depth: number; // profondità corrente di ricorsione dei trigger
}

const ALL_ROLES: Role[] = ['healer', 'caster', 'defender', 'blade', 'thief', 'assassin'];

// --- Log & snapshot --------------------------------------------------------

function log(ctx: Ctx, ev: BattleEvent): void {
  ctx.events.push(ev);
}

function snapshot(unit: Unit, registry: Registry): UnitSnapshot {
  return {
    uid: unit.uid,
    defId: unit.defId,
    name: unit.name,
    role: unit.role,
    side: unit.side,
    row: unit.row,
    hp: Math.max(0, Math.round(unit.hp)),
    maxHp: unit.base.maxHp,
    energy: Math.round(unit.energy),
    energyMax: unit.base.energyMax,
    shield: Math.round(unit.shield),
    speed: Math.round(effectiveStat(unit, 'speed', registry)),
    alive: unit.alive,
    statuses: unit.statuses.map((s) => {
      const def = registry.statuses[s.defId];
      return {
        id: s.defId,
        name: def?.name ?? s.defId,
        stacks: s.stacks,
        duration: s.duration,
        kind: def?.kind ?? 'debuff',
      };
    }),
  };
}

function snapshotAll(ctx: Ctx): UnitSnapshot[] {
  return ctx.state.units.map((u) => snapshot(u, ctx.registry));
}

// --- Risorse ---------------------------------------------------------------

function gainEnergy(ctx: Ctx, unit: Unit, amount: number): void {
  if (amount === 0 || !unit.alive) return;
  const max = effectiveStat(unit, 'energyMax', ctx.registry);
  const before = unit.energy;
  unit.energy = Math.min(max, Math.max(0, unit.energy + amount));
  const delta = unit.energy - before;
  if (delta !== 0) log(ctx, { t: 'energy', target: unit.uid, delta, energyAfter: Math.round(unit.energy) });
}

function pushGauge(ctx: Ctx, unit: Unit, fraction: number): void {
  if (!unit.alive) return;
  const delta = fraction * ctx.registry.config.actionThreshold;
  unit.gauge = Math.max(0, unit.gauge + delta);
  log(ctx, { t: 'gauge', target: unit.uid, delta: Math.round(delta), gaugeAfter: Math.round(unit.gauge) });
}

function addStack(ctx: Ctx, unit: Unit, stack: string, amount: number, max: number): void {
  const total = Math.min(max, (unit.stacks[stack] ?? 0) + amount);
  unit.stacks[stack] = total;
  log(ctx, { t: 'stack', target: unit.uid, stack, amount, total });
}

function consumeStack(ctx: Ctx, unit: Unit, stack: string): void {
  if (!unit.stacks[stack]) return;
  unit.stacks[stack] = 0;
  log(ctx, { t: 'stack', target: unit.uid, stack, amount: 0, total: 0 });
}

// --- Applicazione danno diretto (usata da azioni e tick) -------------------

/** Applica danno grezzo (dopo scudo) e ritorna il danno effettivo agli HP. */
function applyRawDamage(target: Unit, amount: number): { absorbed: number; hpDamage: number } {
  const absorbed = Math.min(target.shield, amount);
  target.shield -= absorbed;
  const hpDamage = amount - absorbed;
  target.hp -= hpDamage;
  return { absorbed, hpDamage };
}

function recordDamage(ctx: Ctx, source: Unit, target: Unit, amount: number): void {
  ctx.stats.damageByUid[source.uid] = (ctx.stats.damageByUid[source.uid] ?? 0) + amount;
  ctx.stats.damageByRole[source.role] += amount;
  ctx.stats.damageTakenByUid[target.uid] = (ctx.stats.damageTakenByUid[target.uid] ?? 0) + amount;
}

// --- Morte -----------------------------------------------------------------

function handleDeath(ctx: Ctx, dead: Unit, killer: Unit | null): void {
  if (!dead.alive) return;
  dead.alive = false;
  dead.hp = 0;
  dead.shield = 0;
  log(ctx, { t: 'death', uid: dead.uid });

  // onDeath del morto, onKill dell'uccisore, onAllyDeath degli alleati vivi.
  fireTrigger(ctx, 'onDeath', dead, killer);
  if (killer) fireTrigger(ctx, 'onKill', killer, dead);
  for (const ally of alliesOf(dead, ctx.state.units)) {
    if (ally.uid !== dead.uid) fireTrigger(ctx, 'onAllyDeath', ally, dead);
  }
}

// --- Azioni ----------------------------------------------------------------

function applyAction(ctx: Ctx, source: Unit, action: Action, targets: Unit[]): void {
  const { registry } = ctx;
  switch (action.kind) {
    case 'damage': {
      const hits = action.hits ?? 1;
      for (const target of targets) {
        if (target.alive && source.alive) fireTrigger(ctx, 'onBeforeDefend', target, source);
        for (let h = 0; h < hits; h++) {
          if (!target.alive || !source.alive) break;
          const roll = computeDamage(source, target, action, ctx.rng, registry);
          if (!roll.hit) {
            log(ctx, { t: 'miss', source: source.uid, target: target.uid });
            continue;
          }
          const { absorbed } = applyRawDamage(target, roll.amount);
          recordDamage(ctx, source, target, roll.amount);
          target.lastAttackerUid = source.uid;
          log(ctx, {
            t: 'damage',
            source: source.uid,
            target: target.uid,
            amount: roll.amount,
            crit: roll.crit,
            damageType: action.damageType,
            tags: action.tags ?? [],
            absorbed,
            hpAfter: Math.max(0, Math.round(target.hp)),
          });

          // Energia guadagnata subendo danno (Difensore di più).
          const eGain =
            target.role === 'defender'
              ? ctx.registry.config.defenderEnergyOnDamaged
              : ctx.registry.config.energyOnDamaged;
          gainEnergy(ctx, target, eGain);

          fireTrigger(ctx, 'onHit', source, target, roll.crit);
          if (roll.crit) fireTrigger(ctx, 'onCrit', source, target, true);

          if (target.hp <= 0) {
            handleDeath(ctx, target, source);
          } else {
            fireTrigger(ctx, 'onDamaged', target, source, roll.crit);
          }
        }
      }
      break;
    }

    case 'heal': {
      const power = effectiveStat(source, 'atk', registry) * action.power;
      for (const target of targets) {
        if (!target.alive) continue;
        const missing = target.base.maxHp - target.hp;
        const healed = Math.min(missing, power);
        const overheal = power - healed;
        target.hp += healed;
        ctx.stats.healingByUid[source.uid] = (ctx.stats.healingByUid[source.uid] ?? 0) + healed;
        log(ctx, {
          t: 'heal',
          source: source.uid,
          target: target.uid,
          amount: Math.round(healed),
          overheal: Math.round(overheal),
          hpAfter: Math.round(target.hp),
        });
        if (action.overhealToShield && overheal > 0) {
          target.shield += overheal;
          log(ctx, { t: 'shield', source: source.uid, target: target.uid, amount: Math.round(overheal) });
        }
        fireTrigger(ctx, 'onHealed', target, source);
      }
      break;
    }

    case 'shield': {
      const power = effectiveStat(source, 'atk', registry) * action.power;
      for (const target of targets) {
        if (!target.alive) continue;
        target.shield += power;
        log(ctx, { t: 'shield', source: source.uid, target: target.uid, amount: Math.round(power) });
      }
      break;
    }

    case 'applyStatus': {
      const recipients = action.onSelf ? [source] : targets;
      const def = registry.statuses[action.statusId];
      if (!def) break;
      const landChance = statusLandChance(ctx, source, action.onSelf ? source : recipients[0] ?? source, def.kind);
      for (const target of recipients) {
        if (!target.alive) continue;
        if (def.kind === 'debuff' && !ctx.rng.chance(landChance)) continue;
        const inst = applyStatusInstance(
          target,
          action.statusId,
          action.duration,
          action.stacks ?? 1,
          source.uid,
          registry,
        );
        if (!inst) continue;
        log(ctx, {
          t: 'statusApplied',
          source: source.uid,
          target: target.uid,
          statusId: action.statusId,
          name: def.name,
          stacks: inst.stacks,
          duration: inst.duration,
          kind: def.kind,
        });
        fireTrigger(ctx, 'onStatusApplied', target, source);
      }
      break;
    }

    case 'cleanse': {
      const count = action.count ?? 99;
      for (const target of targets) {
        if (!target.alive) continue;
        const removed = cleanseDebuffs(target, count, registry);
        if (removed.length > 0) {
          log(ctx, { t: 'cleanse', source: source.uid, target: target.uid, removed });
        }
      }
      break;
    }

    case 'removeStatus': {
      const recipients = action.onSelf ? [source] : targets;
      for (const target of recipients) removeStatusInstance(target, action.statusId);
      break;
    }

    case 'pushGauge': {
      for (const target of targets) pushGauge(ctx, target, action.amount);
      break;
    }

    case 'gainEnergy': {
      for (const target of targets) gainEnergy(ctx, target, action.amount);
      break;
    }

    case 'addStack':
      addStack(ctx, source, action.stack, action.amount, action.max);
      break;

    case 'consumeStack':
      consumeStack(ctx, source, action.stack);
      break;

    case 'stealBuff': {
      const count = action.count ?? 1;
      for (const target of targets) {
        if (!target.alive) continue;
        let stolen = 0;
        for (const st of [...target.statuses]) {
          if (stolen >= count) break;
          const def = registry.statuses[st.defId];
          if (!def || def.kind !== 'buff') continue;
          // Sposta il buff dal bersaglio al lanciatore.
          target.statuses = target.statuses.filter((s) => s !== st);
          applyStatusInstance(source, st.defId, st.duration, st.stacks, source.uid, registry);
          log(ctx, {
            t: 'stealBuff',
            source: source.uid,
            target: target.uid,
            statusId: st.defId,
            name: def.name,
          });
          stolen++;
        }
      }
      break;
    }

    default:
      break;
  }
}

/** Probabilità di far attecchire un debuff: accuracy attaccante vs resistance. */
function statusLandChance(ctx: Ctx, source: Unit, target: Unit, kind: 'buff' | 'debuff'): number {
  if (kind === 'buff') return 1;
  const acc = effectiveStat(source, 'accuracy', ctx.registry);
  const res = effectiveStat(target, 'resistance', ctx.registry);
  const resistFactor = res / (res + ctx.registry.config.resMitigationK);
  return Math.min(1, Math.max(0.05, acc * (1 - resistFactor)));
}

// --- Esecuzione di un effetto ----------------------------------------------

/**
 * Esegue un effetto (attivo o reattivo). Gestisce condizioni, chance, cooldown e
 * maxTriggersPerBattle. Ritorna true se l'effetto è scattato.
 */
function applyEffect(
  ctx: Ctx,
  effect: Effect,
  source: Unit,
  other: Unit | null,
  isActive: boolean,
  crit = false,
): boolean {
  if (!source.alive && effect.trigger !== 'onDeath') return false;

  // Cooldown & tetto per battaglia.
  if (effect.cooldown && (source.cooldowns[effect.id] ?? 0) > 0) return false;
  if (
    effect.maxTriggersPerBattle !== undefined &&
    (source.triggerCounts[effect.id] ?? 0) >= effect.maxTriggersPerBattle
  ) {
    return false;
  }

  const targets = resolveTargets(effect.targeting, { source, other }, ctx.state.units, ctx.rng, ctx.registry);
  const primary = targets[0] ?? null;

  const ok = checkConditions(effect.conditions, {
    source,
    target: primary,
    crit,
    allUnits: ctx.state.units,
    registry: ctx.registry,
  });
  if (!ok) return false;

  if (effect.chance !== undefined && !ctx.rng.chance(effect.chance)) return false;

  if (isActive) {
    log(ctx, {
      t: 'abilityUsed',
      uid: source.uid,
      effectId: effect.id,
      name: effect.name,
      targets: targets.map((t) => t.uid),
      isUltimate: (effect.energyCost ?? 0) > 0,
    });
  } else {
    log(ctx, { t: 'effectTriggered', uid: source.uid, effectId: effect.id, name: effect.name });
  }

  for (const action of effect.actions) applyAction(ctx, source, action, targets);

  if (effect.cooldown) source.cooldowns[effect.id] = effect.cooldown;
  source.triggerCounts[effect.id] = (source.triggerCounts[effect.id] ?? 0) + 1;
  return true;
}

// --- Dispatch dei trigger --------------------------------------------------

function fireTrigger(ctx: Ctx, trigger: Trigger, reactor: Unit, other: Unit | null, crit = false): void {
  if (ctx.depth >= ctx.registry.config.maxTriggerDepth) return; // guardia anti-loop
  ctx.depth++;
  try {
    for (const effect of reactor.passives) {
      if (effect.trigger !== trigger) continue;
      applyEffect(ctx, effect, reactor, other, false, crit);
    }
  } finally {
    ctx.depth--;
  }
}

// --- Turno -----------------------------------------------------------------

function statusTicks(ctx: Ctx, unit: Unit): void {
  for (const st of [...unit.statuses]) {
    const def = ctx.registry.statuses[st.defId];
    if (!def?.tick) continue;
    if (def.tick.damagePctMaxHp) {
      const amount = Math.max(1, Math.round(unit.base.maxHp * def.tick.damagePctMaxHp * st.stacks));
      applyRawDamage(unit, amount);
      log(ctx, { t: 'statusTick', target: unit.uid, statusId: st.defId, amount, hpAfter: Math.max(0, Math.round(unit.hp)) });
      if (unit.hp <= 0) {
        const src = ctx.state.units.find((u) => u.uid === st.sourceUid) ?? null;
        handleDeath(ctx, unit, src);
        return;
      }
    }
    if (def.tick.healPctMaxHp) {
      const heal = Math.round(unit.base.maxHp * def.tick.healPctMaxHp * st.stacks);
      const missing = unit.base.maxHp - unit.hp;
      const healed = Math.min(missing, heal);
      unit.hp += healed;
      log(ctx, { t: 'statusTick', target: unit.uid, statusId: st.defId, amount: -healed, hpAfter: Math.round(unit.hp) });
    }
  }
}

function decayEndOfTurn(ctx: Ctx, unit: Unit): void {
  // Cooldown --.
  for (const id of Object.keys(unit.cooldowns)) {
    if (unit.cooldowns[id]! > 0) unit.cooldowns[id]!--;
  }
  // Durate degli stati --; rimozione a scadenza.
  const kept = [];
  for (const st of unit.statuses) {
    st.duration--;
    if (st.duration > 0) {
      kept.push(st);
    } else {
      log(ctx, { t: 'statusExpired', target: unit.uid, statusId: st.defId });
    }
  }
  unit.statuses = kept;
}

function executeTurn(ctx: Ctx, actor: Unit): void {
  ctx.state.turn++;
  ctx.stats.turns = ctx.state.turn;
  const gauges = ctx.state.units
    .filter((u) => u.alive)
    .map((u) => ({ uid: u.uid, gauge: Math.round(u.gauge) }));
  log(ctx, { t: 'turnStart', uid: actor.uid, gauge: Math.round(actor.gauge), turn: ctx.state.turn, gauges });

  statusTicks(ctx, actor);
  if (!actor.alive) {
    actor.gauge -= ctx.registry.config.actionThreshold;
    return;
  }

  fireTrigger(ctx, 'onTurnStart', actor, null);

  const flags = getFlags(actor, ctx.registry);
  if (!flags.stunned && actor.alive) {
    const cost = actor.ability.energyCost ?? actor.base.energyMax;
    if (actor.energy >= cost && cost > 0) {
      actor.energy -= cost;
      log(ctx, { t: 'energy', target: actor.uid, delta: -cost, energyAfter: Math.round(actor.energy) });
      fireTrigger(ctx, 'onBeforeAttack', actor, null);
      applyEffect(ctx, actor.ability, actor, null, true);
    } else {
      fireTrigger(ctx, 'onBeforeAttack', actor, null);
      const fired = applyEffect(ctx, actor.basicAttack, actor, null, true);
      if (fired) gainEnergy(ctx, actor, ctx.registry.config.energyOnBasicAttack);
    }
  }

  if (actor.alive) fireTrigger(ctx, 'onTurnEnd', actor, null);
  decayEndOfTurn(ctx, actor);
  actor.gauge -= ctx.registry.config.actionThreshold;
}

// --- Selezione del prossimo attore (ATB a salto) ---------------------------

function effSpeed(ctx: Ctx, u: Unit): number {
  return Math.max(ctx.registry.config.minEffectiveSpeed, effectiveStat(u, 'speed', ctx.registry));
}

function nextActor(ctx: Ctx): Unit | null {
  const alive = ctx.state.units.filter((u) => u.alive);
  if (alive.length === 0) return null;
  const threshold = ctx.registry.config.actionThreshold;

  // Ticks minimi perché qualcuno raggiunga la soglia.
  let minTicks = Infinity;
  for (const u of alive) {
    const needed = (threshold - u.gauge) / effSpeed(ctx, u);
    const ticks = needed <= 0 ? 0 : Math.ceil(needed);
    if (ticks < minTicks) minTicks = ticks;
  }
  if (!Number.isFinite(minTicks)) minTicks = 0;

  if (minTicks > 0) {
    for (const u of alive) u.gauge += minTicks * effSpeed(ctx, u);
    ctx.state.tickCount += minTicks;
  }

  const candidates = alive
    .filter((u) => u.gauge >= threshold)
    .sort((a, b) => b.gauge - a.gauge || a.slot - b.slot || a.uid.localeCompare(b.uid));
  return candidates[0] ?? null;
}

function sideAlive(ctx: Ctx, side: Unit['side']): boolean {
  return ctx.state.units.some((u) => u.side === side && u.alive);
}

// --- Entry point -----------------------------------------------------------

function emptyStats(): BattleStats {
  const damageByRole = {} as BattleStats['damageByRole'];
  for (const r of ALL_ROLES) damageByRole[r] = 0;
  return {
    turns: 0,
    damageByUid: {},
    healingByUid: {},
    damageByRole,
    damageTakenByUid: {},
  };
}

/**
 * Simula una battaglia completa. Firma concettuale del progetto:
 *   simulateBattle(initialState, seed) -> BattleResult
 * Il Registry (stati + tuning) è fornito dai contenuti per tenere l'engine puro.
 */
export function simulateBattle(initialState: BattleState, seed: number, registry: Registry): BattleResult {
  const ctx: Ctx = {
    state: initialState,
    rng: makeRng(seed),
    registry,
    events: [],
    stats: emptyStats(),
    depth: 0,
  };

  log(ctx, { t: 'battleStart', seed, units: snapshotAll(ctx) });

  // onBattleStart per tutti, in ordine deterministico di slot.
  const startOrder = [...ctx.state.units].sort((a, b) => a.slot - b.slot || a.uid.localeCompare(b.uid));
  for (const u of startOrder) {
    if (u.alive) fireTrigger(ctx, 'onBattleStart', u, null);
  }

  let winner: BattleResult['winner'] = 'draw';
  while (ctx.state.turn < registry.config.maxTurns) {
    if (!sideAlive(ctx, 'player')) {
      winner = 'enemy';
      break;
    }
    if (!sideAlive(ctx, 'enemy')) {
      winner = 'player';
      break;
    }
    const actor = nextActor(ctx);
    if (!actor) break;
    executeTurn(ctx, actor);
  }

  // Determina il vincitore anche se usciamo per cap turni.
  if (winner === 'draw') {
    const p = sideAlive(ctx, 'player');
    const e = sideAlive(ctx, 'enemy');
    if (p && !e) winner = 'player';
    else if (e && !p) winner = 'enemy';
  }

  log(ctx, { t: 'battleEnd', winner, turns: ctx.state.turn });

  return {
    seed,
    winner,
    events: ctx.events,
    finalUnits: snapshotAll(ctx),
    stats: ctx.stats,
  };
}
