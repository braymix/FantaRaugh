import { describe, expect, it } from 'vitest';
import { BALANCE } from '@content/balance';
import { generateDungeon } from '@content/dungeon';
import { createDefaultProfile } from './profile';
import { grantDefeatConsolation, grantNodeRewards, nodeSeed, runFight } from './run';
import { grantXp, xpForNextLevel } from './progression';

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

describe('run nel dungeon', () => {
  it('nodeSeed è deterministico', () => {
    expect(nodeSeed(100, 'n0_0')).toBe(nodeSeed(100, 'n0_0'));
    expect(nodeSeed(100, 'n0_0')).not.toBe(nodeSeed(100, 'n1_0'));
  });

  it('la squadra iniziale supera il primo scontro del dungeon', () => {
    const profile = createDefaultProfile();
    // Condizioni reali di partenza (ascensione 0): il primo nodo non è un muro.
    const dungeon = generateDungeon(12345, { baseLevel: BALANCE.dungeonBaseLevel });
    const first = dungeon.nodes[dungeon.startIds[0]!]!;
    profile.run = { dungeonSeed: dungeon.seed, currentNodeId: null, clearedNodeIds: [], carryHp: {}, active: true };
    const outcome = runFight(profile, dungeon, first);
    expect(outcome.won).toBe(true);
    expect(Object.keys(outcome.carryHp).length).toBeGreaterThan(0);
  });

  it('la sconfitta lascia comunque crescita (loop roguelite "ritenti e cresci")', () => {
    const profile = createDefaultProfile();
    const startLevelSum = profile.heroes.reduce((a, h) => a + h.level + h.xp, 0);
    const goldBefore = profile.currencies.gold;
    const summary = grantDefeatConsolation(profile, 2); // 2 nodi ripuliti prima di cadere
    expect(summary.xp).toBeGreaterThan(0);
    expect(summary.gold).toBeGreaterThan(0);
    expect(profile.currencies.gold).toBe(goldBefore + summary.gold);
    const endLevelSum = profile.heroes.reduce((a, h) => a + h.level + h.xp, 0);
    expect(endLevelSum).toBeGreaterThan(startLevelSum); // la squadra è più forte di prima
  });

  it('le ricompense danno XP alla squadra e valuta', () => {
    const profile = createDefaultProfile();
    const dungeon = generateDungeon(999);
    const goldBefore = profile.currencies.gold;
    const rewardNode = Object.values(dungeon.nodes).find((n) => n.rewardKind === 'gold' && n.encounter.length > 0);
    if (rewardNode) {
      const summary = grantNodeRewards(profile, rewardNode);
      expect(summary.xp).toBeGreaterThan(0);
      expect(profile.currencies.gold).toBeGreaterThanOrEqual(goldBefore);
    }
  });
});
