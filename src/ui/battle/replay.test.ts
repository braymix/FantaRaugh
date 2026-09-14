import { describe, expect, it } from 'vitest';
import { BALANCE } from '@content/balance';
import { ENEMY_MAP } from '@content/enemies';
import { HERO_MAP } from '@content/heroes';
import { REGISTRY } from '@content/registry';
import { simulateBattle } from '@engine/battle';
import { buildBattleState, type Placement } from '@engine/build';
import { rebuildTo } from './replay';

describe('replay del log (la UI riproduce, non calcola)', () => {
  it('lo stato ricostruito dagli eventi combacia con lo stato finale dell\'engine', () => {
    const player: Placement[] = [
      { def: HERO_MAP['hero_thane']!, level: 20, row: 'front' },
      { def: HERO_MAP['hero_pyra']!, level: 20, row: 'back' },
      { def: HERO_MAP['hero_umbra']!, level: 20, row: 'back' },
    ];
    const enemy: Placement[] = [
      { def: ENEMY_MAP['enemy_orc_brute']!, level: 15, row: 'front' },
      { def: ENEMY_MAP['enemy_dark_acolyte']!, level: 15, row: 'back' },
    ];
    const res = simulateBattle(buildBattleState(player, enemy), 555, REGISTRY);
    const display = rebuildTo(res.events, res.events.length - 1, BALANCE.actionThreshold);

    for (const snap of res.finalUnits) {
      const du = display.units[snap.uid]!;
      expect(du.hp).toBe(snap.hp);
      expect(du.alive).toBe(snap.alive);
    }
    expect(display.winner).toBe(res.winner);
    expect(display.done).toBe(true);
  });
});
