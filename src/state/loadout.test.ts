import { describe, expect, it } from 'vitest';
import { createDefaultProfile } from './profile';
import { buildPlayerPlacements, composeHero } from './loadout';
import { HERO_MAP } from '@content/heroes';

describe('composizione loadout (eroe + arma + perk)', () => {
  it('l\'arma aumenta le statistiche base dell\'eroe', () => {
    const profile = createDefaultProfile();
    const thane = profile.heroes.find((h) => h.defId === 'hero_thane')!;
    const composed = composeHero(thane, profile)!;
    // L'Egida del Guardiano dà +def, +maxHp, +resistance: la def composta > base.
    expect(composed.def.baseStats.def).toBeGreaterThan(HERO_MAP['hero_thane']!.baseStats.def);
    expect(composed.def.baseStats.maxHp).toBeGreaterThan(HERO_MAP['hero_thane']!.baseStats.maxHp);
  });

  it('i perk equipaggiati diventano passive dell\'eroe', () => {
    const profile = createDefaultProfile();
    const umbra = profile.heroes.find((h) => h.defId === 'hero_umbra')!;
    const composed = composeHero(umbra, profile)!;
    const passiveIds = composed.def.passives.map((p) => p.id);
    // La Zanna d'Ombra monta Colpo del Boia + Fuoco Fatuo, e ha un intrinseco.
    expect(passiveIds).toContain('perk_executioner');
    expect(passiveIds).toContain('perk_wildfire');
    expect(passiveIds).toContain('wpn_shadowfang_intrinsic');
  });

  it('buildPlayerPlacements produce la squadra schierata', () => {
    const profile = createDefaultProfile();
    const placements = buildPlayerPlacements(profile);
    expect(placements.length).toBe(profile.team.length);
    expect(placements.every((p) => p.level > 0)).toBe(true);
  });
});
