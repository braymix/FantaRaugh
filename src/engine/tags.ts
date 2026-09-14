/**
 * Utilità sui tag. I tag sono il collante che permette agli effetti di
 * interagire ("+30% danno a chi sanguina"): un'unità "ha" un tag se porta uno
 * stato con quel tag.
 */

import type { Registry, Tag, Unit } from './types';

export function getStatusTags(unit: Unit, registry: Registry): Set<Tag> {
  const tags = new Set<Tag>();
  for (const st of unit.statuses) {
    const def = registry.statuses[st.defId];
    if (!def) continue;
    for (const t of def.tags) tags.add(t);
  }
  return tags;
}

export function unitHasTag(unit: Unit, tag: Tag, registry: Registry): boolean {
  return getStatusTags(unit, registry).has(tag);
}
