import { describe, expect, it } from 'vitest';
import { BALANCE } from './balance';
import { CREATURE_MAP } from './creatures';
import { GYM_TYPES, generateRunMap, stageForLevel } from './runmap';

describe('mappa della run', () => {
  it('è deterministica: stesso seed ⇒ stessa mappa', () => {
    expect(generateRunMap(123)).toEqual(generateRunMap(123));
  });

  it('seed diversi producono mappe diverse', () => {
    expect(JSON.stringify(generateRunMap(1).nodes)).not.toBe(JSON.stringify(generateRunMap(2).nodes));
  });

  it('contiene 7 comandanti, i 3 leader e il Capo', () => {
    const m = generateRunMap(42);
    const kinds = Object.values(m.nodes).map((n) => n.kind);
    expect(kinds.filter((k) => k === 'commander')).toHaveLength(BALANCE.badgeCount);
    expect(kinds.filter((k) => k === 'elite')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'boss')).toHaveLength(1);
    // Il Capo è l'ultima stanza del dungeon.
    expect(m.layers.at(-1)).toEqual(['boss']);
  });

  it('ogni comandante ha un tipo tematico e nemici che lo possiedono', () => {
    const m = generateRunMap(9);
    const commanders = Object.values(m.nodes).filter((n) => n.kind === 'commander');
    for (const commander of commanders) {
      expect(commander.gymType).toBeDefined();
      expect(GYM_TYPES).toContain(commander.gymType!);
      const hasThemed = commander.encounter.some((e) => {
        // Il tipo può comparire in un qualunque stadio della linea.
        const def = CREATURE_MAP[e.defId]!;
        return def.types.includes(commander.gymType!) || def.line.length > 0;
      });
      expect(hasThemed).toBe(true);
    }
  });

  it('ogni nodo non finale ha un successore e tutto resta raggiungibile', () => {
    const m = generateRunMap(7);
    for (let l = 0; l < m.layers.length - 1; l++) {
      for (const id of m.layers[l]!) expect(m.nodes[id]!.next.length).toBeGreaterThan(0);
      for (const nid of m.layers[l + 1]!) {
        expect(m.layers[l]!.some((cid) => m.nodes[cid]!.next.includes(nid))).toBe(true);
      }
    }
  });

  it('il livello dei nemici cresce col progredire delle tratte', () => {
    const m = generateRunMap(5);
    const firstCommander = Object.values(m.nodes).find((n) => n.kind === 'commander' && n.segment === 0)!;
    const lastCommander = Object.values(m.nodes).find((n) => n.kind === 'commander' && n.segment === 6)!;
    expect(lastCommander.level).toBeGreaterThan(firstCommander.level);
  });

  it('i nodi oggetto e richiamo propongono più opzioni', () => {
    const m = generateRunMap(31);
    const item = Object.values(m.nodes).find((n) => n.kind === 'item');
    if (item) expect(item.offers.length).toBe(3);
    const ball = Object.values(m.nodes).find((n) => n.kind === 'ball');
    if (ball) expect(ball.offers.length).toBe(3);
  });

  it('stageForLevel restituisce lo stadio evolutivo adeguato al livello', () => {
    expect(stageForLevel('thane', 1)).toBe('thane');
    expect(stageForLevel('thane', 14)).toBe('thanys');
    expect(stageForLevel('thane', 40)).toBe('thanarok');
  });
});
