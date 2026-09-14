/**
 * Il tutorial è l'unica schermata che un bambino vede prima di giocare: se una
 * creatura non ha sprite resta un riquadro vuoto e la lezione non si capisce.
 * Questi test bloccano proprio quel caso, oltre a tenere onesto il triangolo
 * dei tipi che il tutorial insegna.
 */

import { describe, expect, it } from 'vitest';
import { CREATURE_MAP } from '@content/creatures';
import { typeEffectiveness } from '@content/typechart';
import { SPRITE_IDS } from '../art/sprites';
import { TUTORIAL_STEPS } from './Tutorial';

const spriteIds = TUTORIAL_STEPS.flatMap((s) => s.sprites ?? []);

describe('tutorial', () => {
  it('mostra solo creature esistenti', () => {
    for (const id of spriteIds) expect(CREATURE_MAP[id], id).toBeDefined();
  });

  it('mostra solo creature con uno sprite dedicato', () => {
    for (const id of spriteIds) expect(SPRITE_IDS, id).toContain(id);
  });

  it('ogni schermata ha un titolo, del testo e un solo tipo di illustrazione', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.title.length).toBeGreaterThan(0);
      expect(step.lines.length).toBeGreaterThan(0);
      expect(Boolean(step.icon) !== Boolean(step.sprites)).toBe(true);
    }
  });

  it('il triangolo fuoco/natura/acqua che insegna è quello vero', () => {
    expect(typeEffectiveness('fuoco', ['natura'])).toBeGreaterThan(1);
    expect(typeEffectiveness('natura', ['acqua'])).toBeGreaterThan(1);
    expect(typeEffectiveness('acqua', ['fuoco'])).toBeGreaterThan(1);
  });

  it("la schermata del triangolo mostra un fuoco, una natura e un'acqua", () => {
    const step = TUTORIAL_STEPS.find((s) => s.title === 'Forte e debole');
    expect(step).toBeDefined();
    const types = (step!.sprites ?? []).flatMap((id) => CREATURE_MAP[id]!.types);
    for (const t of ['fuoco', 'natura', 'acqua']) expect(types, t).toContain(t);
  });
});
