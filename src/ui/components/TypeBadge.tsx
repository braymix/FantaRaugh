/** Etichetta di un tipo elementale. */

import type { MonType } from '@engine/types';
import { TYPE_META } from '../format';

export function TypeBadge({ type, small = false }: { type: MonType; small?: boolean }) {
  const m = TYPE_META[type];
  return (
    <span
      className={`border ${m.bg} ${m.color} ${small ? 'px-1 text-[8px]' : 'px-1.5 text-[10px]'} uppercase tracking-wide`}
    >
      {m.label}
    </span>
  );
}

export function TypeRow({ types, small }: { types: MonType[]; small?: boolean }) {
  return (
    <span className="inline-flex gap-0.5">
      {types.map((t) => (
        <TypeBadge key={t} type={t} small={small} />
      ))}
    </span>
  );
}
