import { describe, expect, it } from 'vitest';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { REGISTRY } from '@content/registry';
import { simulateBattle } from '@engine/battle';
import { buildBattleState, type Placement } from '@engine/build';
import { rebuildTo } from './replay';

const at = (id: string, level: number, row: Placement['row']): Placement => ({
  def: CREATURE_MAP[id]!,
  level,
  row,
});

describe('replay del log (la UI riproduce, non calcola)', () => {
  it("lo stato ricostruito dagli eventi combacia con lo stato finale dell'engine", () => {
    const res = simulateBattle(
      buildBattleState(
        [at('thane', 22, 'front'), at('pyra', 22, 'back'), at('umbra', 22, 'back')],
        [at('orc_brute', 16, 'front'), at('dark_acolyte', 16, 'back')],
      ),
      555,
      REGISTRY,
    );
    const display = rebuildTo(res.events, res.events.length - 1, BALANCE.actionThreshold);

    for (const snap of res.finalUnits) {
      const du = display.units[snap.uid]!;
      expect(du.hp).toBe(snap.hp);
      expect(du.alive).toBe(snap.alive);
      expect(du.types).toEqual(snap.types);
    }
    expect(display.winner).toBe(res.winner);
    expect(display.done).toBe(true);
  });
});
