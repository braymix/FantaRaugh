import { describe, expect, it } from 'vitest';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { generateRunMap } from '@content/runmap';
import { healFull } from './party';
import { grantXp, xpForNextLevel } from './progression';
import { essenceForNode, grantTeamXp, makeRunMon, nodeSeed, runFight } from './run';
import type { RunState } from './types';

function freshRun(starterId = 'kael', seed = 12345): RunState {
  const starter = makeRunMon(starterId, BALANCE.starterLevel);
  const run: RunState = {
    seed,
    team: [starter],
    bag: [],
    currentNodeId: null,
    clearedNodeIds: [],
    badges: 0,
    nuzlocke: false,
    active: true,
    pending: null,
  };
  healFull(starter, {}, run.team);
  return run;
}

describe('progressione XP', () => {
  it('accumulare XP fa salire di livello', () => {
    const e = { level: 1, xp: 0 };
    grantXp(e, xpForNextLevel(1));
    expect(e.level).toBe(2);
  });

  it('XP in eccesso trabocca ai livelli successivi', () => {
    const e = { level: 1, xp: 0 };
    grantXp(e, xpForNextLevel(1) + xpForNextLevel(2));
    expect(e.level).toBe(3);
  });
});

describe('evoluzioni', () => {
  it('al livello soglia la creatura evolve mantenendo la linea', () => {
    const team = [makeRunMon('thane', 13)];
    const evolved = grantTeamXp(team, xpForNextLevel(13) * 1.2);
    expect(team[0]!.level).toBeGreaterThanOrEqual(14);
    expect(team[0]!.defId).toBe('thanys');
    expect(evolved[0]).toMatchObject({ from: 'thane', to: 'thanys' });
    expect(CREATURE_MAP['thanys']!.line).toBe('thane');
  });

  it('un salto di livelli può attraversare più stadi in sequenza', () => {
    const team = [makeRunMon('thane', 13)];
    // XP enorme: deve incatenare le evoluzioni senza saltarne nessuna.
    grantTeamXp(team, 5_000_000);
    expect(team[0]!.defId).toBe('thanarok');
  });

  it('una creatura reclutata a livello alto nasce già evoluta', () => {
    const mon = makeRunMon('thane', 35);
    expect(mon.defId).toBe('thanarok');
  });
});

describe('combattimenti della run', () => {
  it('nodeSeed è deterministico e distingue i nodi', () => {
    expect(nodeSeed(100, 'a')).toBe(nodeSeed(100, 'a'));
    expect(nodeSeed(100, 'a')).not.toBe(nodeSeed(100, 'b'));
  });

  it('lo starter supera il primo nodo di una run', () => {
    const map = generateRunMap(12345);
    const run = freshRun('kael', map.seed);
    // Primo nodo combattivo raggiungibile dalla partenza.
    const first = map.startIds.map((id) => map.nodes[id]!).find((n) => n.encounter.length > 0);
    if (!first) return; // mappa senza fight iniziali: nulla da verificare
    const outcome = runFight(run, map, first, {});
    expect(outcome.won).toBe(true);
    expect(Object.keys(outcome.hpByUid).length).toBeGreaterThan(0);
  });

  it('gli HP residui si trascinano tra i combattimenti', () => {
    const map = generateRunMap(777);
    const run = freshRun('thane', map.seed);
    const fight = Object.values(map.nodes).find((n) => n.encounter.length > 0 && n.segment === 0)!;
    const full = run.team[0]!.hp;
    const outcome = runFight(run, map, fight, {});
    const after = outcome.hpByUid[run.team[0]!.uid];
    expect(after).toBeDefined();
    expect(after!).toBeLessThanOrEqual(full);
  });

  it('le essenze premiano di più palestre e Campione', () => {
    const map = generateRunMap(3);
    const gym = Object.values(map.nodes).find((n) => n.kind === 'gym')!;
    const wild = Object.values(map.nodes).find((n) => n.kind === 'wild');
    expect(essenceForNode(gym)).toBe(BALANCE.essencePerBadge);
    expect(essenceForNode(map.nodes['champion']!)).toBe(BALANCE.essenceOnChampion);
    if (wild) expect(essenceForNode(wild)).toBeLessThan(essenceForNode(gym));
  });
});
