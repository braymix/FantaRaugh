import { describe, expect, it } from 'vitest';
import { BALANCE } from '@content/balance';
import { levelStats } from '@engine/build';
import { composeMon, maxHpOf, traitTiers } from './party';
import { makeRunMon } from './run';
import type { RunMon } from './types';

function mon(defId: string, level = 10): RunMon {
  return makeRunMon(defId, level);
}

describe('composizione della squadra', () => {
  it("l'oggetto tenuto applica le sue modifiche di statistica", () => {
    const plain = mon('kael');
    const withBand = { ...mon('kael'), itemId: 'item_ironband' };
    const a = composeMon(plain, {}, [plain])!;
    const b = composeMon(withBand, {}, [withBand])!;
    // Bracciale di Ferro: +difesa, −velocità (trade-off esplicito).
    expect(b.placement.def.baseStats.def).toBeGreaterThan(a.placement.def.baseStats.def);
    expect(b.placement.def.baseStats.speed).toBeLessThan(a.placement.def.baseStats.speed);
  });

  it("l'effetto dell'oggetto diventa una passiva della creatura", () => {
    const m = { ...mon('kael'), itemId: 'item_kingsrock' };
    const c = composeMon(m, {}, [m])!;
    expect(c.placement.def.passives.map((p) => p.id)).toContain('item_kingsrock');
  });

  it('i potenziamenti permanenti di linea aumentano le statistiche base', () => {
    const m = mon('kael');
    const plain = composeMon(m, {}, [m])!;
    const buffed = composeMon(m, { kael: { atk: 10 } }, [m])!;
    expect(buffed.placement.def.baseStats.atk).toBeGreaterThan(plain.placement.def.baseStats.atk);
  });

  it('i tratti di tipo premiano le squadre specializzate', () => {
    const solo = [mon('kael')];
    // Tre creature di fuoco: superate le prime soglie di sinergia.
    const trio = [mon('kael'), mon('pyra'), mon('fire_imp')];
    expect(traitTiers(['fuoco'], solo)).toBe(0);
    expect(traitTiers(['fuoco'], trio)).toBeGreaterThan(0);
    const weak = composeMon(solo[0]!, {}, solo)!;
    const strong = composeMon(trio[0]!, {}, trio)!;
    expect(strong.placement.def.baseStats.atk).toBeGreaterThan(weak.placement.def.baseStats.atk);
  });

  it('il tier della mossa finale scala la potenza della ultimate', () => {
    const t1 = mon('kael');
    const t3 = { ...mon('kael'), moveTier: 3 };
    const a = composeMon(t1, {}, [t1])!.placement.def.ability.actions[0]!;
    const b = composeMon(t3, {}, [t3])!.placement.def.ability.actions[0]!;
    if (a.kind === 'damage' && b.kind === 'damage') {
      expect(b.power).toBeCloseTo(a.power * BALANCE.moveTierMult[2]!, 5);
    } else {
      throw new Error('attesa azione di danno');
    }
  });

  it('maxHpOf tiene conto di livello, oggetto e buff', () => {
    const m = mon('thane', 20);
    const composed = composeMon(m, {}, [m])!;
    const expected = levelStats(composed.placement.def.baseStats, composed.placement.def.growth, 20).maxHp;
    expect(maxHpOf(m, {}, [m])).toBe(expected);
  });
});

describe('sostituzione in squadra piena', () => {
  it("l'oggetto della creatura sostituita torna nella borsa, non si perde", async () => {
    const { useGame } = await import('./store');
    const store = useGame.getState();
    store.hardReset();
    store.startRun('kael', 999);

    // Riempie la squadra fino al limite, con un oggetto sull'ultima.
    const run = () => useGame.getState().profile.run!;
    while (run().team.length < BALANCE.maxRecruits) {
      const p = structuredClone(useGame.getState().profile);
      p.run!.team.push(makeRunMon('goblin_grunt', 5));
      useGame.setState({ profile: p });
    }
    const victimUid = run().team[run().team.length - 1]!.uid;
    const withItem = structuredClone(useGame.getState().profile);
    withItem.run!.team.find((m) => m.uid === victimUid)!.itemId = 'item_kingsrock';
    withItem.run!.pending = { kind: 'ball', offers: ['dire_wolf'], level: 5 };
    useGame.setState({ profile: withItem });

    expect(run().bag).not.toContain('item_kingsrock');
    useGame.getState().resolveBall('dire_wolf', victimUid);

    expect(run().team.some((m) => m.uid === victimUid)).toBe(false);
    expect(run().bag).toContain('item_kingsrock'); // recuperato
    expect(run().team.length).toBe(BALANCE.maxRecruits);
  });
});
