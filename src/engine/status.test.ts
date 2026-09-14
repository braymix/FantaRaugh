import { describe, expect, it } from 'vitest';
import { applyStatus, cleanseDebuffs, getFlags, hasStatus } from './status';
import { makeUnit, testRegistry } from './test-helpers';

describe('gestione degli stati', () => {
  const registry = testRegistry();

  it('applyStatus accumula stack fino al massimo e rinfresca la durata', () => {
    const u = makeUnit({ side: 'player' });
    applyStatus(u, 'momentum', 3, 4, 'src', registry); // momentum maxStacks 6
    applyStatus(u, 'momentum', 5, 4, 'src', registry);
    const st = u.statuses.find((s) => s.defId === 'momentum');
    expect(st?.stacks).toBe(6); // cap
    expect(st?.duration).toBe(5); // durata più lunga
  });

  it('cleanseDebuffs rimuove solo i debuff, fino a count', () => {
    const u = makeUnit({ side: 'player' });
    applyStatus(u, 'poison', 3, 1, 'src', registry); // debuff
    applyStatus(u, 'atk_up', 3, 1, 'src', registry); // buff
    applyStatus(u, 'bleed', 3, 1, 'src', registry); // debuff
    const removed = cleanseDebuffs(u, 1, registry);
    expect(removed.length).toBe(1);
    expect(hasStatus(u, 'atk_up')).toBe(true); // il buff resta
    // un debuff rimosso, l'altro resta
    expect(u.statuses.filter((s) => registry.statuses[s.defId]?.kind === 'debuff').length).toBe(1);
  });

  it('getFlags aggrega i flag degli stati attivi', () => {
    const u = makeUnit({ side: 'player' });
    expect(getFlags(u, registry).taunt).toBe(false);
    applyStatus(u, 'taunt', 2, 1, 'src', registry);
    applyStatus(u, 'stealth', 2, 1, 'src', registry);
    const f = getFlags(u, registry);
    expect(f.taunt).toBe(true);
    expect(f.stealth).toBe(true);
    expect(f.stunned).toBe(false);
  });
});
