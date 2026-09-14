import { describe, expect, it } from 'vitest';
import { encounterToPlacements, generateDungeon } from './dungeon';

describe('generatore di dungeon', () => {
  it('è deterministico: stesso seed ⇒ stesso dungeon', () => {
    const a = generateDungeon(123);
    const b = generateDungeon(123);
    expect(a).toEqual(b);
  });

  it('seed diversi producono dungeon diversi', () => {
    const a = generateDungeon(1);
    const b = generateDungeon(2);
    expect(JSON.stringify(a.nodes)).not.toBe(JSON.stringify(b.nodes));
  });

  it('l\'ultimo layer è un boss', () => {
    const d = generateDungeon(42);
    const boss = d.nodes[d.bossId]!;
    expect(boss.type).toBe('boss');
    expect(boss.encounter.length).toBeGreaterThanOrEqual(1);
  });

  it('ogni nodo (tranne il boss) ha almeno un successore e ogni layer è raggiungibile', () => {
    const d = generateDungeon(7);
    for (let l = 0; l < d.layers.length - 1; l++) {
      for (const id of d.layers[l]!) {
        expect(d.nodes[id]!.next.length).toBeGreaterThan(0);
      }
      // Ogni nodo del layer successivo è puntato da almeno uno del corrente.
      for (const nid of d.layers[l + 1]!) {
        const reachable = d.layers[l]!.some((cid) => d.nodes[cid]!.next.includes(nid));
        expect(reachable).toBe(true);
      }
    }
  });

  it('le anteprime dei fight rivelano i ruoli ma non le statistiche', () => {
    const d = generateDungeon(9);
    const fight = Object.values(d.nodes).find((n) => n.type === 'fight');
    expect(fight).toBeDefined();
    expect(fight!.preview.enemyRoles.length).toBeGreaterThan(0);
    // Nessun campo con stat esatte nell'anteprima.
    expect(Object.keys(fight!.preview)).not.toContain('stats');
  });

  it('encounterToPlacements produce placement validi', () => {
    const d = generateDungeon(5);
    const boss = d.nodes[d.bossId]!;
    const placements = encounterToPlacements(boss);
    expect(placements.length).toBe(boss.encounter.length);
    expect(placements.every((p) => p.def && p.level > 0)).toBe(true);
  });
});
