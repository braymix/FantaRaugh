/** Carta di un combattente nella schermata di battaglia. */

import type { DisplayUnit, FloatText } from '../battle/replay';
import { ROLE_META, statusIcon } from '../format';
import { EnergyBar, GaugeBar, HpBar } from './Bars';

const FLOAT_STYLE: Record<FloatText['kind'], string> = {
  damage: 'text-red-300',
  crit: 'text-red-400 font-bold text-lg',
  heal: 'text-emerald-300',
  miss: 'text-gray-400 italic',
  shield: 'text-sky-300',
  status: 'text-violet-200 text-xs',
};

export function BattleUnit({
  unit,
  threshold,
  floats,
}: {
  unit: DisplayUnit;
  threshold: number;
  floats: FloatText[];
}) {
  const role = ROLE_META[unit.role];
  const mine = unit.side === 'player';
  return (
    <div
      className={`relative rounded-lg border px-2 py-1.5 transition-all ${
        unit.alive ? 'border-white/10 bg-night-700/80' : 'border-transparent bg-black/40 opacity-40 grayscale'
      } ${unit.acting ? 'ring-2 ring-gold shadow-[0_0_12px] shadow-gold/40' : ''}`}
    >
      {/* Numeri fluttuanti */}
      <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
        {floats.map((f) => (
          <span key={f.id} className={`animate-float-up drop-shadow ${FLOAT_STYLE[f.kind]}`}>
            {f.text}
          </span>
        ))}
      </div>

      <div className="mb-1 flex items-center justify-between gap-1">
        <span className="truncate text-xs font-semibold text-parchment">
          <span className={role.color}>{role.icon}</span> {unit.name}
        </span>
        <span className="shrink-0 text-[10px] text-white/40">{mine ? '' : unit.row === 'front' ? '▮' : '▯'}</span>
      </div>

      <HpBar hp={unit.hp} maxHp={unit.maxHp} shield={unit.shield} />
      <div className="mt-0.5 flex items-center justify-between text-[10px] text-white/50">
        <span>{unit.alive ? `${unit.hp}` : '—'}</span>
        {unit.shield > 0 && <span className="text-sky-300">+{unit.shield}</span>}
      </div>

      <div className="mt-1 space-y-0.5">
        <EnergyBar energy={unit.energy} energyMax={unit.energyMax} />
        <GaugeBar gauge={unit.gauge} threshold={threshold} acting={unit.acting} />
      </div>

      {unit.statuses.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {unit.statuses.map((s) => (
            <span
              key={s.id}
              title={`${s.name} x${s.stacks}`}
              className={`rounded px-1 text-[10px] ${s.kind === 'buff' ? 'bg-emerald-900/60' : 'bg-red-900/60'}`}
            >
              {statusIcon(s.id)}
              {s.stacks > 1 ? s.stacks : ''}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
