/**
 * Potenziamenti permanenti: si spendono essenze su una LINEA evolutiva, quindi il
 * bonus vale per tutti i suoi stadi e per tutte le run future. È il layer meta
 * che dà senso ai tentativi ripetuti.
 */

import { BALANCE } from '@content/balance';
import { CREATURE_MAP, LINE_STAGES } from '@content/creatures';
import type { StatKey } from '@engine/types';
import { useGame } from '@state/store';
import { Sprite } from '../components/Sprite';
import { TypeRow } from '../components/TypeBadge';
import { ROLE_META } from '../format';

const BUYABLE: { stat: StatKey; label: string }[] = [
  { stat: 'maxHp', label: 'Salute' },
  { stat: 'atk', label: 'Attacco' },
  { stat: 'def', label: 'Difesa' },
  { stat: 'speed', label: 'Velocità' },
  { stat: 'resistance', label: 'Resistenza' },
];

export function MetaScreen() {
  const profile = useGame((s) => s.profile);
  const buy = useGame((s) => s.buyLineBuff);
  const navigate = useGame((s) => s.navigate);

  const lines = Object.keys(LINE_STAGES);

  return (
    <div className="flex h-full flex-col bg-dither">
      <div className="flex items-center justify-between border-b-2 border-black/50 bg-night-800 p-3">
        <div>
          <div className="font-display text-lg">Potenziamenti permanenti</div>
          <div className="text-xs text-white/70 font-medium">
            {profile.essence} ✦ essenze · {BALANCE.lineBuffCost} per punto (+
            {Math.round(BALANCE.lineBuffStep * 100)}% ciascuno)
          </div>
        </div>
        <button className="btn-ghost" onClick={() => navigate('home')}>
          Indietro
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {lines.map((line) => {
          const stages = LINE_STAGES[line]!;
          const first = CREATURE_MAP[stages[0]!]!;
          const buffs = profile.lineBuffs[line] ?? {};
          const known = stages.some((id) => profile.seen.includes(id));
          return (
            <div key={line} className={`card ${known ? '' : 'opacity-50'}`}>
              <div className="flex items-center gap-2">
                <Sprite defId={stages[stages.length - 1]!} role={first.role} scale={2} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold text-parchment">
                    {stages.map((id) => CREATURE_MAP[id]!.name).join(' → ')}
                  </div>
                  <div className="text-xs text-white/70 font-medium">
                    <span className={ROLE_META[first.role].color}>{ROLE_META[first.role].label}</span>{' '}
                    <TypeRow types={first.types} small />
                  </div>
                </div>
              </div>
              {!known ? (
                <div className="mt-2 text-xs text-white/60 font-medium">Non ancora incontrata.</div>
              ) : (
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {BUYABLE.map(({ stat, label }) => {
                    const pts = buffs[stat] ?? 0;
                    const maxed = pts >= BALANCE.lineBuffMaxPoints;
                    return (
                      <button
                        key={stat}
                        disabled={maxed || profile.essence < BALANCE.lineBuffCost}
                        onClick={() => buy(line, stat)}
                        className="border-2 border-black/50 bg-white/5 px-1 py-1 text-[10px] font-medium leading-tight text-white/85 disabled:opacity-35"
                      >
                        <div>{label}</div>
                        <div className="font-bold text-gold">
                          {pts}/{BALANCE.lineBuffMaxPoints}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
