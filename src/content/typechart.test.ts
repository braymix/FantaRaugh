import { describe, expect, it } from 'vitest';
import { MON_TYPES, TYPE_CHART, effectivenessLabel, teamWeaknesses, typeEffectiveness } from './typechart';

describe('tabella dei tipi', () => {
  it('debolezza singola ×2, resistenza ×0.5, neutro ×1', () => {
    expect(typeEffectiveness('fuoco', ['natura'])).toBe(2);
    expect(typeEffectiveness('fuoco', ['acqua'])).toBe(0.5);
    expect(typeEffectiveness('fuoco', ['luce'])).toBe(1);
  });

  it('i doppi tipi moltiplicano: doppia debolezza ×4, doppia resistenza ×0.25', () => {
    expect(typeEffectiveness('fuoco', ['natura', 'ghiaccio'])).toBe(4);
    expect(typeEffectiveness('fuoco', ['acqua', 'roccia'])).toBe(0.25);
    // Debolezza + resistenza si annullano.
    expect(typeEffectiveness('fuoco', ['natura', 'acqua'])).toBe(1);
  });

  it('le immunità azzerano il danno e vincono su tutto', () => {
    expect(typeEffectiveness('veleno', ['acciaio'])).toBe(0);
    expect(typeEffectiveness('veleno', ['natura', 'acciaio'])).toBe(0);
  });

  it('ogni tipo ha almeno un punto forte e uno debole (nessun tipo inutile)', () => {
    for (const t of MON_TYPES) {
      expect(TYPE_CHART[t].strong.length).toBeGreaterThan(0);
      expect(TYPE_CHART[t].weak.length).toBeGreaterThan(0);
    }
  });

  it('teamWeaknesses conta i membri vulnerabili a ogni tipo', () => {
    const w = teamWeaknesses([['natura'], ['natura'], ['acqua']]);
    expect(w.fuoco).toBe(2); // i due di natura
    expect(w.fulmine).toBe(1); // solo quello d'acqua
  });

  it('le etichette descrivono il moltiplicatore', () => {
    expect(effectivenessLabel(0)).toBe('Immune');
    expect(effectivenessLabel(4)).toBe('Devastante');
    expect(effectivenessLabel(2)).toBe('Superefficace');
    expect(effectivenessLabel(1)).toBe('Normale');
    expect(effectivenessLabel(0.5)).toBe('Poco efficace');
  });
});
