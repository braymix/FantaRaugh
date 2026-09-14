/** Carta di un combattente nella schermata di battaglia (sprite + feedback). */

import type { DisplayUnit, FloatText } from '../battle/replay';
import { ROLE_META, statusIcon } from '../format';
import { EnergyBar, GaugeBar, HpBar } from './Bars';
import { Sprite } from './Sprite';

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
  onInspect,
}: {
  unit: DisplayUnit;
  threshold: number;
  floats: FloatText[];
  onInspect?: (unit: DisplayUnit) => void;
}) {
  const role = ROLE_META[unit.role];
  const hurt = floats.find((f) => f.kind === 'damage' || f.kind === 'crit');
  const crit = floats.some((f) => f.kind === 'crit');

  // La `key` cambia a ogni colpo: rimonta il nodo e fa ripartire l'animazione.
  const hitKey = hurt ? hurt.id : 'idle';
  const spriteAnim = !unit.alive ? '' : hurt ? (crit ? 'animate-hit animate-crit' : 'animate-hit') : 'animate-idle';

  return (
    <button
      type="button"
      onClick={() => onInspect?.(unit)}
      className={`relative block w-full border-2 px-1.5 pb-1.5 pt-1 text-left transition-colors ${
        unit.alive ? 'border-black/50 bg-night-700/80' : 'border-transparent bg-black/40 opacity-40 grayscale'
      } ${unit.acting ? 'animate-acting border-gold' : ''}`}
    >
      {/* Numeri fluttuanti */}
      <div className="pointer-events-none absolute inset-x-0 -top-3 z-10 flex justify-center gap-1">
        {floats.map((f) => (
          <span key={f.id} className={`animate-float-up drop-shadow ${FLOAT_STYLE[f.kind]}`}>
            {f.text}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-1.5">
        <span key={hitKey} className={`shrink-0 ${spriteAnim}`}>
          <Sprite defId={unit.defId} role={unit.role} scale={2} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <span className="truncate text-[11px] font-semibold leading-tight text-parchment">{unit.name}</span>
            <span className={`shrink-0 text-[9px] ${role.color}`} title={role.label}>
              {unit.row === 'front' ? '▮' : '▯'}
            </span>
          </div>

          <HpBar hp={unit.hp} maxHp={unit.maxHp} shield={unit.shield} />
          <div className="flex items-center justify-between text-[9px] leading-tight text-white/55">
            <span>{unit.alive ? `${unit.hp}/${unit.maxHp}` : 'caduto'}</span>
            {unit.shield > 0 && <span className="text-sky-300">◈{unit.shield}</span>}
          </div>

          <div className="space-y-0.5">
            <EnergyBar energy={unit.energy} energyMax={unit.energyMax} />
            <GaugeBar gauge={unit.gauge} threshold={threshold} acting={unit.acting} />
          </div>
        </div>
      </div>

      {unit.statuses.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {unit.statuses.map((s) => (
            <span
              key={s.id}
              title={`${s.name} ×${s.stacks} · ${s.duration} turni`}
              className={`border px-1 text-[9px] leading-tight ${
                s.kind === 'buff'
                  ? 'border-emerald-700/60 bg-emerald-900/50 text-emerald-200'
                  : 'border-red-800/60 bg-red-900/50 text-red-200'
              }`}
            >
              {statusIcon(s.id)} {s.name}
              {s.stacks > 1 ? `×${s.stacks}` : ''}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
