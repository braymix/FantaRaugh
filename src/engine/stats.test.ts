import { describe, expect, it } from 'vitest';
import { effectiveStat } from './stats';
import { makeUnit, testRegistry } from './test-helpers';
import type { StatusDef } from './types';

describe('pipeline delle statistiche', () => {
  const registry = testRegistry();

  it('senza modificatori ritorna la base', () => {
    const u = makeUnit({ side: 'player', base: { atk: 200 } });
    expect(effectiveStat(u, 'atk', registry)).toBe(200);
  });

  it('applica additivi e moltiplicativi nell\'ordine (base+add)*(1+mul)', () => {
    // atk_up = +15% mul. Aggiungiamo un buff additivo custom.
    const custom: StatusDef = {
      id: 'flat_atk',
      name: 'Flat',
      kind: 'buff',
      tags: ['buff'],
      maxStacks: 1,
      statMods: [{ stat: 'atk', mode: 'add', value: 100 }],
    };
    const reg = { ...registry, statuses: { ...registry.statuses, flat_atk: custom } };
    const u = makeUnit({
      side: 'player',
      statuses: [
        { defId: 'flat_atk', duration: 5, stacks: 1, sourceUid: 'x' },
        { defId: 'atk_up', duration: 5, stacks: 1, sourceUid: 'x' },
      ],
    });
    // base 200, +100 add = 300, *1.15 = 345
    expect(effectiveStat(u, 'atk', reg)).toBeCloseTo(345, 5);
  });

  it('gli stack moltiplicano il modificatore', () => {
    const u = makeUnit({
      side: 'player',
      statuses: [{ defId: 'atk_up', duration: 5, stacks: 3, sourceUid: 'x' }],
    });
    // 3 stack di +15% = *1.15^3
    expect(effectiveStat(u, 'atk', registry)).toBeCloseTo(200 * 1.15 ** 3, 5);
  });

  it('clampa critRate in [0,1]', () => {
    const u = makeUnit({ side: 'player', base: { critRate: 0.9 } });
    const reg = {
      ...registry,
      statuses: {
        ...registry.statuses,
        crit_huge: {
          id: 'crit_huge',
          name: 'C',
          kind: 'buff',
          tags: ['buff'],
          maxStacks: 1,
          statMods: [{ stat: 'critRate', mode: 'add', value: 0.5 }],
        } as StatusDef,
      },
    };
    u.statuses.push({ defId: 'crit_huge', duration: 5, stacks: 1, sourceUid: 'x' });
    expect(effectiveStat(u, 'critRate', reg)).toBe(1);
  });
});
