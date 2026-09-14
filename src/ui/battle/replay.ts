/**
 * Ricostruzione dello stato visivo dal log di eventi. QUESTA è la prova che la UI
 * non calcola nulla: prende i BattleEvent prodotti dall'engine e li "riproduce",
 * aggiornando barre HP, gauge, scudi e stati. Puro, senza React: testabile.
 */

import type { BattleEvent, DamageType, MonType, Role, Side, UnitSnapshot } from '@engine/types';

export interface FloatText {
  id: number;
  uid: string;
  text: string;
  kind: 'damage' | 'crit' | 'heal' | 'miss' | 'shield' | 'status';
}

export interface DisplayStatus {
  id: string;
  name: string;
  stacks: number;
  duration: number;
  kind: 'buff' | 'debuff';
}

export interface DisplayUnit {
  uid: string;
  defId: string;
  name: string;
  role: Role;
  types: MonType[];
  side: Side;
  row: string;
  hp: number;
  maxHp: number;
  energy: number;
  energyMax: number;
  shield: number;
  gauge: number;
  alive: boolean;
  acting: boolean;
  statuses: DisplayStatus[];
}

export interface DisplayState {
  units: Record<string, DisplayUnit>;
  order: string[];
  turn: number;
  threshold: number;
  logLines: string[];
  floats: FloatText[];
  winner: Side | 'draw' | null;
  done: boolean;
  floatSeq: number;
  /** Ultima abilità annunciata: la UI la mostra come banner. */
  lastAbility: { uid: string; name: string; isUltimate: boolean; id: number } | null;
  /** id stato → nome leggibile, raccolto dagli eventi (niente dipendenze dai contenuti). */
  statusNames: Record<string, string>;
}

function unitFromSnapshot(s: UnitSnapshot): DisplayUnit {
  return {
    uid: s.uid,
    defId: s.defId,
    name: s.name,
    role: s.role,
    types: s.types,
    side: s.side,
    row: s.row,
    hp: s.hp,
    maxHp: s.maxHp,
    energy: s.energy,
    energyMax: s.energyMax,
    shield: s.shield,
    gauge: 0,
    alive: s.alive,
    acting: false,
    statuses: s.statuses.map((st) => ({
      id: st.id,
      name: st.name,
      stacks: st.stacks,
      duration: st.duration,
      kind: st.kind,
    })),
  };
}

export function initDisplay(threshold: number): DisplayState {
  return {
    units: {},
    order: [],
    turn: 0,
    threshold,
    logLines: [],
    floats: [],
    winner: null,
    done: false,
    floatSeq: 0,
    lastAbility: null,
    statusNames: {},
  };
}

function name(state: DisplayState, uid: string): string {
  return state.units[uid]?.name ?? uid;
}

function pushFloat(state: DisplayState, uid: string, text: string, kind: FloatText['kind']): void {
  state.floats.push({ id: state.floatSeq++, uid, text, kind });
}

function dmgLabel(type: DamageType): string {
  return type === 'physical' ? 'fisico' : 'magico';
}

/** Commento sull'efficacia di tipo: è l'informazione chiave da leggere a video. */
function effLabel(mult: number): string {
  if (mult === 0) return ' — IMMUNE';
  if (mult >= 4) return ' — DEVASTANTE!';
  if (mult >= 2) return ' — superefficace!';
  if (mult <= 0.25) return ' — quasi nullo';
  if (mult <= 0.5) return ' — poco efficace';
  return '';
}

/** Applica un evento allo stato visivo (muta). Ritorna lo stato per comodità. */
export function applyEvent(state: DisplayState, ev: BattleEvent): DisplayState {
  state.floats = [];
  switch (ev.t) {
    case 'battleStart': {
      for (const s of ev.units) {
        state.units[s.uid] = unitFromSnapshot(s);
        state.order.push(s.uid);
        for (const st of s.statuses) state.statusNames[st.id] = st.name;
      }
      break;
    }
    case 'turnStart': {
      state.turn = ev.turn;
      for (const uid of state.order) if (state.units[uid]) state.units[uid]!.acting = false;
      for (const g of ev.gauges) {
        const u = state.units[g.uid];
        if (u) u.gauge = g.gauge;
      }
      const actor = state.units[ev.uid];
      if (actor) actor.acting = true;
      break;
    }
    case 'abilityUsed': {
      state.logLines.push(`${name(state, ev.uid)} usa ${ev.name}${ev.isUltimate ? ' ✦' : ''}`);
      state.lastAbility = {
        uid: ev.uid,
        name: ev.name,
        isUltimate: ev.isUltimate,
        id: state.floatSeq++,
      };
      break;
    }
    case 'damage': {
      const u = state.units[ev.target];
      if (u) {
        u.hp = ev.hpAfter;
        if (ev.absorbed > 0) u.shield = Math.max(0, u.shield - ev.absorbed);
        if (ev.effectiveness === 0) {
          pushFloat(state, ev.target, 'IMMUNE', 'miss');
        } else {
          const mark = ev.effectiveness >= 2 ? '!!' : ev.crit ? '!' : '';
          pushFloat(
            state,
            ev.target,
            `-${ev.amount}${mark}`,
            ev.crit || ev.effectiveness >= 2 ? 'crit' : 'damage',
          );
        }
      }
      state.logLines.push(
        `${name(state, ev.source)} → ${name(state, ev.target)}: ${ev.amount} danno ${dmgLabel(ev.damageType)} (${ev.element})${ev.crit ? ' CRIT' : ''}${effLabel(ev.effectiveness)}`,
      );
      break;
    }
    case 'miss': {
      pushFloat(state, ev.target, 'MANCATO', 'miss');
      break;
    }
    case 'heal': {
      const u = state.units[ev.target];
      if (u) u.hp = ev.hpAfter;
      if (ev.amount > 0) pushFloat(state, ev.target, `+${ev.amount}`, 'heal');
      break;
    }
    case 'shield': {
      const u = state.units[ev.target];
      if (u) u.shield += ev.amount;
      if (ev.amount > 0) pushFloat(state, ev.target, `+${ev.amount} scudo`, 'shield');
      break;
    }
    case 'statusTick': {
      const u = state.units[ev.target];
      if (u) u.hp = ev.hpAfter;
      if (ev.amount !== 0) {
        state.logLines.push(
          `${name(state, ev.target)}: ${ev.amount > 0 ? `${ev.amount} danno` : `${-ev.amount} cura`} da ${
            state.statusNames[ev.statusId] ?? ev.statusId
          }`,
        );
      }
      if (ev.amount !== 0) {
        pushFloat(state, ev.target, ev.amount > 0 ? `-${ev.amount}` : `+${-ev.amount}`, ev.amount > 0 ? 'damage' : 'heal');
      }
      break;
    }
    case 'statusApplied': {
      state.statusNames[ev.statusId] = ev.name;
      const u = state.units[ev.target];
      if (u) {
        const existing = u.statuses.find((s) => s.id === ev.statusId);
        if (existing) {
          existing.stacks = ev.stacks;
          existing.duration = ev.duration;
        } else {
          u.statuses.push({
            id: ev.statusId,
            name: ev.name,
            stacks: ev.stacks,
            duration: ev.duration,
            kind: ev.kind,
          });
        }
        pushFloat(state, ev.target, ev.name, 'status');
        state.logLines.push(
          `${name(state, ev.target)}: ${ev.kind === 'buff' ? '+' : '−'}${ev.name}${ev.stacks > 1 ? ` ×${ev.stacks}` : ''}`,
        );
      }
      break;
    }
    case 'statusExpired': {
      const u = state.units[ev.target];
      if (u) u.statuses = u.statuses.filter((s) => s.id !== ev.statusId);
      break;
    }
    case 'cleanse': {
      const u = state.units[ev.target];
      if (u) u.statuses = u.statuses.filter((s) => !ev.removed.includes(s.id));
      break;
    }
    case 'stealBuff': {
      const from = state.units[ev.target];
      const to = state.units[ev.source];
      if (from) from.statuses = from.statuses.filter((s) => s.id !== ev.statusId);
      if (to && !to.statuses.some((s) => s.id === ev.statusId)) {
        to.statuses.push({ id: ev.statusId, name: ev.name, stacks: 1, duration: 1, kind: 'buff' });
      }
      pushFloat(state, ev.source, `ruba ${ev.name}`, 'status');
      break;
    }
    case 'energy': {
      const u = state.units[ev.target];
      if (u) u.energy = ev.energyAfter;
      break;
    }
    case 'gauge': {
      const u = state.units[ev.target];
      if (u) u.gauge = ev.gaugeAfter;
      break;
    }
    case 'overtime': {
      for (const h of ev.hits) {
        const u = state.units[h.uid];
        if (u) u.hp = h.hpAfter;
      }
      state.logLines.push(`⏱ Overtime: il campo consuma tutti (${Math.round(ev.damagePct * 100)}% HP)`);
      break;
    }
    case 'death': {
      const u = state.units[ev.uid];
      if (u) {
        u.alive = false;
        u.hp = 0;
        u.shield = 0;
        u.statuses = [];
      }
      state.logLines.push(`☠ ${name(state, ev.uid)} è caduto`);
      break;
    }
    case 'battleEnd': {
      state.winner = ev.winner;
      state.done = true;
      state.logLines.push(
        ev.winner === 'player' ? '🏆 Vittoria!' : ev.winner === 'enemy' ? '💀 Sconfitta' : '⏳ Pareggio',
      );
      break;
    }
    default:
      break;
  }
  // Mantieni il log a lunghezza gestibile.
  if (state.logLines.length > 60) state.logLines = state.logLines.slice(-60);
  return state;
}

/** Applica tutti gli eventi fino a `index` (incluso). Per "salta" / seek. */
export function rebuildTo(events: BattleEvent[], index: number, threshold: number): DisplayState {
  const state = initDisplay(threshold);
  for (let i = 0; i <= index && i < events.length; i++) applyEvent(state, events[i]!);
  return state;
}
