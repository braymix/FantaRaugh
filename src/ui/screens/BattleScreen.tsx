/**
 * Schermata di combattimento: riproduce il log di eventi. Non calcola nulla.
 *
 * Chiarezza: un banner annuncia l'abilità in corso, e toccando un combattente si
 * apre la sua scheda (statistiche e stati attivi spiegati).
 */

import { useState } from 'react';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { useGame } from '@state/store';
import { BattleUnit } from '../components/BattleUnit';
import { RulesSheet } from '../components/RulesSheet';
import { Sprite } from '../components/Sprite';
import { useReplay, type Speed } from '../battle/useReplay';
import type { DisplayUnit } from '../battle/replay';
import { TypeRow } from '../components/TypeBadge';
import { ROLE_META, statusIcon } from '../format';

const SPEEDS: Speed[] = [1, 2, 4];

export function BattleScreen() {
  const battle = useGame((s) => s.lastBattle);
  const summary = useGame((s) => s.lastSummary);
  const run = useGame((s) => s.profile.run);
  const navigate = useGame((s) => s.navigate);

  const [inspect, setInspect] = useState<DisplayUnit | null>(null);
  const [help, setHelp] = useState(false);

  const events = battle?.events ?? [];
  const replay = useReplay(events, BALANCE.actionThreshold);
  const { display } = replay;

  // Calcolato a ogni render: `display` è mutato in place dal replay, quindi una
  // memoizzazione sul suo riferimento non si aggiornerebbe mai.
  const list = display.order.map((uid) => display.units[uid]!).filter(Boolean);
  const enemies = list.filter((u) => u.side === 'enemy');
  const players = list.filter((u) => u.side === 'player');

  if (!battle) {
    return (
      <div className="flex h-full items-center justify-center">
        <button className="btn-primary" onClick={() => navigate('home')}>
          Torna alla base
        </button>
      </div>
    );
  }

  const floatsFor = (u: DisplayUnit) => display.floats.filter((f) => f.uid === u.uid);
  const runActive = run?.active ?? false;
  const won = display.winner === 'player';
  const ability = display.lastAbility;
  const actorName = ability ? (display.units[ability.uid]?.name ?? '') : '';

  return (
    <div className="flex h-full flex-col bg-dither">
      {/* Barra di stato */}
      <div className="flex items-center justify-between border-b-2 border-black/50 bg-night-800 px-2 py-1 text-xs text-white/70 font-medium">
        <span>{display.turn > 0 ? `Turno ${display.turn}` : 'Preparativi'}</span>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-[10px]">seed {battle.seed}</span>
          <button onClick={() => setHelp(true)} className="border-2 border-black/50 bg-white/10 px-1.5 text-parchment">
            ?
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Nemici */}
      <div className="px-2 pt-2">
        <div className="mb-1 text-xs uppercase tracking-wider text-red-300 font-bold">Nemici</div>
        <div className="grid grid-cols-2 gap-1.5">
          {enemies.map((u) => (
            <BattleUnit key={u.uid} unit={u} threshold={display.threshold} floats={floatsFor(u)} onInspect={setInspect} />
          ))}
        </div>
      </div>

      {/* Squadra */}
      <div className="px-2 pb-1">
        <div className="mb-1 text-xs uppercase tracking-wider text-emerald-300 font-bold">La tua squadra</div>
        <div className="grid grid-cols-2 gap-1.5">
          {players.map((u) => (
            <BattleUnit key={u.uid} unit={u} threshold={display.threshold} floats={floatsFor(u)} onInspect={setInspect} />
          ))}
        </div>
      </div>
      {/* Banner abilità + log (in basso: assorbe lo spazio residuo) */}
      <div className="mx-2 mb-2 flex max-h-52 min-h-0 flex-1 flex-col border-2 border-black/40 bg-black/35">
        {ability && (
          <div
            key={ability.id}
            className={`shrink-0 border-b-2 border-black/40 px-2 py-2 text-center text-sm font-medium ${
              ability.isUltimate ? 'bg-gold/20 text-gold' : 'bg-white/5 text-parchment'
            }`}
          >
            <b>{actorName}</b> usa <b>{ability.name}</b>
            {ability.isUltimate && ' ✦'}
          </div>
        )}
        <div className="flex min-h-0 flex-1 flex-col justify-end gap-0.5 overflow-y-auto p-2 text-xs leading-snug text-white/75">
          {display.logLines.slice(-8).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>
      </div>

      {/* Controlli */}
      <div className="flex items-center gap-2 border-t-2 border-black/50 bg-night-800 p-2">
        <button className="btn-ghost" onClick={replay.togglePlay} disabled={display.done}>
          {replay.playing ? '⏸' : '▶'}
        </button>
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => replay.setSpeed(s)}
              className={`border-2 border-black/50 px-2 py-1 text-xs ${
                replay.speed === s ? 'bg-arcane text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              ×{s}
            </button>
          ))}
        </div>
        <button className="btn-ghost ml-auto" onClick={replay.skip} disabled={display.done}>
          Salta ⏭
        </button>
      </div>
      <div className="h-1 w-full bg-black/40">
        <div className="h-full bg-arcane transition-all" style={{ width: `${replay.progress * 100}%` }} />
      </div>

      {/* Scheda di un combattente */}
      {inspect && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/70" onClick={() => setInspect(null)}>
          <div
            className="w-full border-t-2 border-gold/50 bg-night-800 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <Sprite defId={inspect.defId} role={inspect.role} scale={3} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-base">{inspect.name}</div>
                <div className={`text-[11px] ${ROLE_META[inspect.role].color}`}>
                  {ROLE_META[inspect.role].icon} {ROLE_META[inspect.role].label} ·{' '}
                  {inspect.row === 'front' ? 'prima linea' : 'retrovia'}
                </div>
                <div className="mt-0.5">
                  <TypeRow types={inspect.types} small />
                </div>
                <div className="text-[11px] text-white/55">
                  {inspect.hp}/{inspect.maxHp} HP
                  {inspect.shield > 0 && <span className="text-sky-300"> · ◈{inspect.shield} scudo</span>}
                  {' · '}⚡ {inspect.energy}/{inspect.energyMax}
                </div>
              </div>
            </div>

            <div className="mt-3 text-[10px] uppercase tracking-wider text-white/40">Stati attivi</div>
            {inspect.statuses.length === 0 ? (
              <div className="text-[11px] text-white/35">Nessuno stato attivo.</div>
            ) : (
              <div className="mt-1 space-y-1">
                {inspect.statuses.map((s) => (
                  <div key={s.id} className="flex items-baseline gap-2 text-[11px]">
                    <span className="w-4 text-center">{statusIcon(s.id)}</span>
                    <span className={s.kind === 'buff' ? 'text-emerald-200' : 'text-red-200'}>
                      {s.name}
                      {s.stacks > 1 && ` ×${s.stacks}`}
                    </span>
                    <span className="ml-auto text-white/40">{s.duration} turni</span>
                  </div>
                ))}
              </div>
            )}
            <button className="btn-ghost mt-3 w-full" onClick={() => setInspect(null)}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      {help && <RulesSheet onClose={() => setHelp(false)} />}

      {/* Esito */}
      {display.done && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 p-4">
          <div className="card w-full max-w-sm text-center">
            <div className="mb-2 font-display text-2xl">
              {won ? '🏆 Vittoria' : display.winner === 'enemy' ? '💀 Sconfitta' : '⏳ Pareggio'}
            </div>
            {summary && (
              <div className="mb-3 space-y-0.5 text-sm text-white/70">
                {!won && <div className="text-white/45">Il viaggio finisce qui, ma resta l'esperienza:</div>}
                {summary.xp > 0 && <div>+{Math.round(summary.xp)} XP alla squadra</div>}
                {summary.essence > 0 && <div className="text-gold">+{summary.essence} ✦ essenze</div>}
                {summary.evolved.map((e) => (
                  <div key={e.uid} className="text-sky-300">
                    {CREATURE_MAP[e.from]?.name ?? e.from} evolve in {CREATURE_MAP[e.to]?.name ?? e.to}!
                  </div>
                ))}
              </div>
            )}
            <div className="mb-3 text-xs text-white/40">Durata: {battle.stats.turns} turni</div>
            {won && runActive ? (
              <button className="btn-primary w-full" onClick={() => navigate('map')}>
                Avanti
              </button>
            ) : won ? (
              <button className="btn-primary w-full" onClick={() => navigate('home')}>
                🏆 Campione! Torna alla base
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button className="btn-primary w-full" onClick={() => navigate('starter')}>
                  Nuova run (più forti di prima)
                </button>
                <button className="btn-ghost w-full" onClick={() => navigate('home')}>
                  Torna alla base
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
