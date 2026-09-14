import { describe, expect, it } from 'vitest';
import { CREATURE_MAP } from '@content/creatures';
import { ITEMS } from '@content/items';
import { REGISTRY } from '@content/registry';
import { ROLE_KITS } from '@content/rolekits';
import { describeEffect, describeEffectParts } from './descriptions';
import { levelStats } from './build';

describe('descrizioni generate dai dati', () => {
  it("descrive l'ultimate del Caster con danno e stato", () => {
    const text = describeEffect(ROLE_KITS.caster.ability, REGISTRY);
    expect(text).toContain('danno magico');
    expect(text).toContain('Ustione');
  });

  it('include la percentuale di probabilità quando presente', () => {
    const scorch = ROLE_KITS.caster.passives.find((p) => p.id === 'kit_caster_scorch')!;
    expect(describeEffect(scorch, REGISTRY)).toContain('40%');
  });

  it('ogni oggetto con effetto produce una descrizione non vuota', () => {
    for (const item of ITEMS) {
      if (!item.effect) continue;
      expect(describeEffect(item.effect, REGISTRY).trim().length).toBeGreaterThan(5);
    }
  });
});

describe('descrizioni strutturate (per la UI)', () => {
  it('scompone un effetto in trigger, bersaglio, azioni e chip', () => {
    const scorch = ROLE_KITS.caster.passives.find((p) => p.id === 'kit_caster_scorch')!;
    const parts = describeEffectParts(scorch, REGISTRY);
    expect(parts.triggerLabel).toBe('Quando colpisci');
    expect(parts.actions[0]!.text).toContain('Ustione');
    expect(parts.chips).toContain('40%');
  });

  it('le attive dichiarano il costo in energia e il moltiplicatore di attacco', () => {
    const parts = describeEffectParts(ROLE_KITS.blade.ability, REGISTRY);
    expect(parts.triggerLabel).toBe('Azione del turno');
    expect(parts.chips.some((c) => c.includes('⚡'))).toBe(true);
    expect(parts.actions[0]!.text).toContain('ATK');
    expect(parts.actions[0]!.text).toContain('colpi');
  });

  it('le condizioni sono esposte separatamente', () => {
    const finisher = ROLE_KITS.thief.passives.find((p) => p.id === 'kit_thief_finisher')!;
    const parts = describeEffectParts(finisher, REGISTRY);
    expect(parts.conditions.length).toBeGreaterThan(0);
    expect(parts.conditions[0]).toContain('50%');
  });
});

describe('crescita per livello', () => {
  it('il livello aumenta le statistiche', () => {
    const thane = CREATURE_MAP['thane']!;
    const l1 = levelStats(thane.baseStats, thane.growth, 1);
    const l10 = levelStats(thane.baseStats, thane.growth, 10);
    expect(l1.maxHp).toBe(thane.baseStats.maxHp);
    expect(l10.maxHp).toBeGreaterThan(l1.maxHp);
    expect(l10.atk).toBeGreaterThan(l1.atk);
  });
});
