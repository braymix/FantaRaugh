/** Schermata di combattimento: riproduce il log di eventi. Non calcola nulla. */

import { BALANCE } from '@content/balance';
import { useGame } from '@state/store';
import { BattleUnit } from '../components/BattleUnit';
import { useReplay, type Speed } from '../battle/useReplay';
import type { DisplayUnit } from '../battle/replay';

const SPEEDS: Speed[] = [1, 2, 4];

export function BattleScreen() {
  const battle = useGame((s) => s.lastBattle);
  const reward = useGame((s) => s.lastReward);
  const run = useGame((s) => s.profile.run);
  const navigate = useGame((s) => s.navigate);

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

  return (
    <div className="flex h-full flex-col">
      {/* Nemici */}
      <div className="p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-red-300/70">Nemici</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {enemies.map((u) => (
            <BattleUnit key={u.uid} unit={u} threshold={display.threshold} floats={floatsFor(u)} />
          ))}
        </div>
      </div>

      {/* Log al centro */}
      <div className="mx-2 flex-1 overflow-hidden rounded-lg border border-white/5 bg-black/30 p-2">
        <div className="flex h-full flex-col justify-end gap-0.5 overflow-y-auto text-[11px] text-white/70">
          {display.logLines.slice(-8).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      </div>

      {/* Giocatore */}
      <div className="p-2">
        <div className="mb-1 text-[10px] uppercase tracking-wider text-emerald-300/70">La tua squadra</div>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {players.map((u) => (
            <BattleUnit key={u.uid} unit={u} threshold={display.threshold} floats={floatsFor(u)} />
          ))}
        </div>
      </div>

      {/* Controlli */}
      <div className="flex items-center gap-2 border-t border-white/10 bg-night-800 p-2">
        <button className="btn-ghost" onClick={replay.togglePlay} disabled={display.done}>
          {replay.playing ? '⏸' : '▶'}
        </button>
        <div className="flex gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => replay.setSpeed(s)}
              className={`rounded px-2 py-1 text-xs ${replay.speed === s ? 'bg-arcane text-white' : 'bg-white/10 text-white/60'}`}
            >
              x{s}
            </button>
          ))}
        </div>
        <button className="btn-ghost ml-auto" onClick={replay.skip} disabled={display.done}>
          Salta ⏭
        </button>
      </div>

      {/* Barra di avanzamento */}
      <div className="h-1 w-full bg-black/40">
        <div className="h-full bg-arcane transition-all" style={{ width: `${replay.progress * 100}%` }} />
      </div>

      {/* Esito */}
      {display.done && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-night-700 p-5 text-center">
            <div className="mb-2 font-display text-2xl">
              {won ? '🏆 Vittoria' : display.winner === 'enemy' ? '💀 Sconfitta' : '⏳ Pareggio'}
            </div>
            {won && reward && (
              <div className="mb-3 space-y-0.5 text-sm text-white/70">
                {reward.xp > 0 && <div>+{reward.xp} XP alla squadra</div>}
                {reward.gold > 0 && <div className="text-gold">+{reward.gold} oro</div>}
                {reward.gems > 0 && <div className="text-fuchsia-300">+{reward.gems} gemme</div>}
                {reward.newWeapon && <div className="text-sky-300">Nuova arma: {reward.newWeapon}</div>}
                {reward.newPerk && <div className="text-violet-300">Nuovo perk: {reward.newPerk}</div>}
              </div>
            )}
            <div className="mb-3 text-xs text-white/40">Durata: {battle.stats.turns} turni · seed {battle.seed}</div>
            {won && runActive ? (
              <button className="btn-primary w-full" onClick={() => navigate('dungeon')}>
                Continua il dungeon
              </button>
            ) : (
              <button className="btn-primary w-full" onClick={() => navigate('home')}>
                {won ? 'Dungeon completato! Torna alla base' : 'Torna alla base'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
