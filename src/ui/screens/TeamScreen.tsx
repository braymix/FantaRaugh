/**
 * Squadra della run: ordine, schieramento, oggetti tenuti, evoluzioni.
 *
 * Include l'analizzatore di debolezze: rende esplicito il rischio di copertura,
 * che è la decisione strategica centrale contro le palestre a tema.
 */

import { useState } from 'react';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { ITEM_MAP } from '@content/items';
import { REGISTRY } from '@content/registry';
import { ROLE_KITS } from '@content/rolekits';
import { MON_TYPES, teamWeaknesses } from '@content/typechart';
import { levelStats } from '@engine/build';
import { composeMon, maxHpOf } from '@state/party';
import { xpForNextLevel } from '@state/progression';
import { useGame } from '@state/store';
import { EffectCard } from '../components/EffectCard';
import { HpBar } from '../components/Bars';
import { Sprite } from '../components/Sprite';
import { TypeBadge, TypeRow } from '../components/TypeBadge';
import { ROLE_META } from '../format';

export function TeamScreen() {
  const profile = useGame((s) => s.profile);
  const navigate = useGame((s) => s.navigate);
  const run = profile.run;
  const [openUid, setOpenUid] = useState<string | null>(null);

  if (!run) {
    return <div className="flex h-full items-center justify-center text-white/60">Nessuna run attiva.</div>;
  }

  const weaknesses = teamWeaknesses(run.team.map((m) => CREATURE_MAP[m.defId]?.types ?? []));
  const worst = MON_TYPES.filter((t) => weaknesses[t] >= 2).sort((a, b) => weaknesses[b] - weaknesses[a]);

  return (
    <div className="flex h-full flex-col bg-dither">
      <div className="flex items-center justify-between border-b-2 border-black/50 bg-night-800 p-3">
        <div>
          <div className="font-display text-base">Squadra</div>
          <div className="text-[10px] text-white/45">
            {run.team.length}/{BALANCE.maxRecruits} creature · borsa {run.bag.length}
          </div>
        </div>
        <button className="btn-ghost" onClick={() => navigate(run.active ? 'map' : 'home')}>
          {run.active ? 'Mappa' : 'Base'}
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {/* Analizzatore di debolezze */}
        <div className="card">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">Debolezze di squadra</div>
          {worst.length === 0 ? (
            <div className="text-[11px] text-emerald-300">Nessuna debolezza condivisa: buona copertura.</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {worst.map((t) => (
                <span key={t} className="flex items-center gap-1">
                  <TypeBadge type={t} small />
                  <span className={`text-[10px] ${weaknesses[t] >= 3 ? 'text-red-300' : 'text-amber-200'}`}>
                    ×{weaknesses[t]}
                  </span>
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 text-[9px] leading-snug text-white/35">
            Quanti membri prendono danno aumentato da quel tipo. Una palestra a tema può spazzarti via.
          </div>
        </div>

        {run.team.map((mon, i) => {
          const def = CREATURE_MAP[mon.defId];
          if (!def) return null;
          const composed = composeMon(mon, profile.lineBuffs, run.team);
          const stats = composed
            ? levelStats(composed.placement.def.baseStats, composed.placement.def.growth, mon.level)
            : def.baseStats;
          const maxHp = maxHpOf(mon, profile.lineBuffs, run.team);
          const item = mon.itemId ? ITEM_MAP[mon.itemId] : null;
          const kit = ROLE_KITS[def.role];
          const open = openUid === mon.uid;
          return (
            <div key={mon.uid} className={`card ${mon.fainted ? 'opacity-40' : ''}`}>
              <div className="flex items-start gap-2">
                <Sprite defId={mon.defId} role={def.role} scale={2} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="truncate text-xs font-bold text-parchment">{def.name}</span>
                    <span className="shrink-0 text-[10px] text-white/45">Lv {mon.level}</span>
                  </div>
                  <div className="mb-0.5 flex items-center gap-1">
                    <TypeRow types={def.types} small />
                    <span className={`text-[9px] ${ROLE_META[def.role].color}`}>{ROLE_META[def.role].label}</span>
                  </div>
                  <HpBar hp={Math.min(mon.hp, maxHp)} maxHp={maxHp} />
                  <div className="flex justify-between text-[9px] text-white/50">
                    <span>
                      {Math.min(mon.hp, maxHp)}/{maxHp}
                    </span>
                    <span>
                      XP {mon.xp}/{xpForNextLevel(mon.level)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <ReorderButtons uid={mon.uid} index={i} total={run.team.length} />
                </div>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
                <RowToggle uid={mon.uid} row={mon.row} />
                <span className="border border-gold/40 bg-gold/10 px-1 text-gold">mossa tier {mon.moveTier}</span>
                {composed && composed.traitTiers > 0 && (
                  <span className="border border-emerald-600/50 bg-emerald-900/40 px-1 text-emerald-200">
                    tratti ×{composed.traitTiers}
                  </span>
                )}
                <button
                  className="ml-auto border border-white/20 px-1.5 text-white/70"
                  onClick={() => setOpenUid(open ? null : mon.uid)}
                >
                  {open ? 'chiudi' : 'dettagli'}
                </button>
              </div>

              <ItemSlot uid={mon.uid} itemId={mon.itemId} />

              {open && (
                <div className="mt-2 space-y-1.5">
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <Stat label="ATT" value={Math.round(stats.atk)} />
                    <Stat label="DIF" value={Math.round(stats.def)} />
                    <Stat label="VEL" value={Math.round(stats.speed)} />
                    <Stat label="RES" value={Math.round(stats.resistance)} />
                    <Stat label="CRIT" value={`${Math.round(stats.critRate * 100)}%`} />
                    <Stat label="HP" value={Math.round(stats.maxHp)} />
                  </div>
                  {def.evolution && (
                    <div className="text-[10px] text-sky-200">
                      Evolve a Lv {def.evolution.atLevel} in{' '}
                      {CREATURE_MAP[def.evolution.toId]?.name ?? '?'}
                    </div>
                  )}
                  {item?.tradeoff && (
                    <div className="text-[10px] italic text-amber-200/80">{item.name}: {item.tradeoff}</div>
                  )}
                  <EffectCard effect={kit.basicAttack} registry={REGISTRY} badge="base" compact />
                  <EffectCard
                    effect={composed?.placement.def.ability ?? kit.ability}
                    registry={REGISTRY}
                    badge={`ultimate ✦ tier ${mon.moveTier}`}
                    compact
                  />
                  {kit.passives.map((p) => (
                    <EffectCard key={p.id} effect={p} registry={REGISTRY} badge="innata" compact />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {run.bag.length > 0 && (
          <div className="card">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
              Borsa ({run.bag.length})
            </div>
            <div className="space-y-1">
              {run.bag.map((id, i) => {
                const it = ITEM_MAP[id];
                return (
                  <div key={`${id}_${i}`} className="text-[11px] text-white/70">
                    <span className="font-semibold text-parchment">{it?.name ?? id}</span>
                    {it?.tradeoff && <span className="text-white/40"> — {it.tradeoff}</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 text-[9px] text-white/35">
              Assegna un oggetto dallo slot di una creatura qui sopra.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-black/30 px-1 py-0.5">
      <span className="text-white/40">{label} </span>
      <span className="font-semibold text-parchment">{value}</span>
    </div>
  );
}

function ReorderButtons({ uid, index, total }: { uid: string; index: number; total: number }) {
  const moveMon = useGame((s) => s.moveMon);
  return (
    <>
      <button
        disabled={index === 0}
        onClick={() => moveMon(uid, -1)}
        className="border border-white/20 px-1 text-[10px] text-white/70 disabled:opacity-25"
      >
        ▲
      </button>
      <button
        disabled={index === total - 1}
        onClick={() => moveMon(uid, 1)}
        className="border border-white/20 px-1 text-[10px] text-white/70 disabled:opacity-25"
      >
        ▼
      </button>
    </>
  );
}

function RowToggle({ uid, row }: { uid: string; row: 'front' | 'back' }) {
  const setRow = useGame((s) => s.setRow);
  return (
    <span className="flex border border-black/50">
      {(['front', 'back'] as const).map((r) => (
        <button
          key={r}
          onClick={() => setRow(uid, r)}
          className={`px-1.5 ${row === r ? 'bg-arcane text-white' : 'bg-white/5 text-white/45'}`}
        >
          {r === 'front' ? '▮ linea' : '▯ retro'}
        </button>
      ))}
    </span>
  );
}

function ItemSlot({ uid, itemId }: { uid: string; itemId: string | null }) {
  const bag = useGame((s) => s.profile.run?.bag ?? []);
  const equipItem = useGame((s) => s.equipItem);
  const current = itemId ? ITEM_MAP[itemId] : null;
  return (
    <div className="mt-1 flex items-center gap-1 text-[10px]">
      <span className="text-white/40">Oggetto:</span>
      <select
        className="min-w-0 flex-1 border-2 border-black/50 bg-night-900 px-1 py-0.5 text-[10px] text-parchment"
        value={itemId ?? ''}
        onChange={(e) => equipItem(uid, e.target.value || null)}
      >
        <option value="">— nessuno —</option>
        {current && <option value={current.id}>{current.name} (equipaggiato)</option>}
        {bag.map((id, i) => (
          <option key={`${id}_${i}`} value={id}>
            {ITEM_MAP[id]?.name ?? id}
          </option>
        ))}
      </select>
    </div>
  );
}
