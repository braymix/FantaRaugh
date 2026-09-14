import { describe, expect, it } from 'vitest';
import { HERO_MAP } from '@content/heroes';
import { PERKS } from '@content/perks';
import { REGISTRY } from '@content/registry';
import { describeEffect } from './descriptions';
import { levelStats } from './build';

describe('descrizioni generate dai dati', () => {
  it('descrive l\'ultimate del Caster con danno, stato e consumo carica', () => {
    const pyra = HERO_MAP['hero_pyra']!;
    const text = describeEffect(pyra.ability, REGISTRY);
    expect(text).toContain('danno magico');
    expect(text).toContain('Ustione');
    expect(text.length).toBeGreaterThan(20);
  });

  it('include la percentuale di probabilità quando presente', () => {
    const combustion = HERO_MAP['hero_pyra']!.passives.find((p) => p.id === 'pyra_combustion')!;
    const text = describeEffect(combustion, REGISTRY);
    expect(text).toContain('40%');
  });

  it('ogni perk produce una descrizione non vuota', () => {
    for (const perk of PERKS) {
      const text = describeEffect(perk.effect, REGISTRY);
      expect(text.trim().length).toBeGreaterThan(5);
    }
  });
});

describe('crescita per livello', () => {
  it('il livello aumenta le statistiche secondo la growth', () => {
    const thane = HERO_MAP['hero_thane']!;
    const l1 = levelStats(thane.baseStats, thane.growth, 1);
    const l10 = levelStats(thane.baseStats, thane.growth, 10);
    expect(l1.maxHp).toBe(thane.baseStats.maxHp);
    expect(l10.maxHp).toBeGreaterThan(l1.maxHp);
    expect(l10.atk).toBeGreaterThan(l1.atk);
  });
});
