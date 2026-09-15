/**
 * Scheda di un effetto (abilità, passiva, perk, intrinseco d'arma).
 *
 * Risolve il problema "non si capisce cosa fanno le cose": invece di una frase
 * lunga mostra la struttura — QUANDO scatta → SU CHI → COSA fa → a quali
 * CONDIZIONI — tutto derivato dai dati dell'effetto.
 */

import { describeEffectParts, TAG_LABEL } from '@engine/descriptions';
import type { Effect, Registry } from '@engine/types';

export function EffectCard({
  effect,
  registry,
  badge,
  compact = false,
}: {
  effect: Effect;
  registry: Registry;
  badge?: string;
  compact?: boolean;
}) {
  const p = describeEffectParts(effect, registry);

  return (
    <div className={`border-2 border-black/40 bg-black/30 ${compact ? 'p-1.5' : 'p-2'}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-parchment">{effect.name}</span>
        {badge && (
          <span className="shrink-0 border border-gold/50 bg-gold/15 px-1 text-[9px] font-semibold uppercase tracking-wide text-gold">
            {badge}
          </span>
        )}
      </div>

      {/* Quando → su chi */}
      <div className="mt-1 text-xs uppercase tracking-wide text-white/60 font-medium">
        {p.triggerLabel} <span className="text-white/40">→</span> {p.targetLabel}
      </div>

      {/* Cosa fa */}
      <ul className="mt-1 space-y-0.5">
        {p.actions.map((a, i) => (
          <li key={i} className="flex gap-1.5 text-sm leading-snug text-white/95">
            <span className="shrink-0 text-white/60">{a.icon}</span>
            <span>{a.text}</span>
          </li>
        ))}
      </ul>

      {/* Condizioni */}
      {p.conditions.length > 0 && (
        <div className="mt-1 border-l-2 border-amber-500/50 pl-1.5 text-xs italic leading-snug text-amber-200">
          solo se {p.conditions.join(' e ')}
        </div>
      )}

      {/* Chip: costo, probabilità, ricarica, limiti, tag */}
      {(p.chips.length > 0 || p.tags.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.chips.map((c) => (
            <span key={c} className="border border-white/20 bg-white/5 px-1.5 text-[10px] font-medium text-white/75">
              {c}
            </span>
          ))}
          {p.tags.map((t) => (
            <span key={t} className="border border-arcane/50 bg-arcane/15 px-1.5 text-[10px] font-medium text-violet-200">
              {TAG_LABEL[t]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Confronto numerico prima → dopo, per capire l'effetto di un equipaggiamento. */
export function StatDelta({ label, from, to }: { label: string; from: number; to: number }) {
  const diff = Math.round(to - from);
  const color = diff > 0 ? 'text-emerald-300' : diff < 0 ? 'text-red-300' : 'text-white/50';
  return (
    <div className="flex items-baseline justify-between border-b border-white/5 py-1 text-sm last:border-b-0">
      <span className="text-white/70 font-medium">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="font-semibold text-parchment">{Math.round(to)}</span>
        {diff !== 0 && <span className={`text-xs font-medium ${color}`}>{diff > 0 ? `+${diff}` : diff}</span>}
      </span>
    </div>
  );
}
