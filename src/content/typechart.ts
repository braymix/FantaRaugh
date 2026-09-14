/**
 * Tabella dei tipi: il pilastro della copertura di squadra.
 *
 * Si affianca all'asse fisico/magico senza sostituirlo:
 *  - fisico/magico decide QUALE statistica difensiva mitiga (Difesa o Resistenza);
 *  - il tipo decide il MOLTIPLICATORE (debolezza/resistenza/immunità).
 * Una squadra che condivide troppe debolezze viene travolta da una palestra
 * costruita su quel tipo: è una scelta di design voluta, non un difetto.
 */

import type { MonType } from '@engine/types';

export const MON_TYPES: MonType[] = [
  'fuoco',
  'acqua',
  'natura',
  'fulmine',
  'ghiaccio',
  'roccia',
  'ombra',
  'luce',
  'acciaio',
  'veleno',
];

interface Matchup {
  strong: MonType[]; // ×2
  weak: MonType[]; // ×0.5
  immune?: MonType[]; // ×0
}

/** Per ogni tipo ATTACCANTE, come si comporta contro i tipi DIFENSORI. */
export const TYPE_CHART: Record<MonType, Matchup> = {
  fuoco: { strong: ['natura', 'ghiaccio', 'acciaio'], weak: ['acqua', 'roccia', 'fuoco'] },
  acqua: { strong: ['fuoco', 'roccia'], weak: ['natura', 'acqua', 'fulmine'] },
  natura: { strong: ['acqua', 'roccia'], weak: ['fuoco', 'natura', 'ghiaccio', 'veleno', 'acciaio'] },
  fulmine: { strong: ['acqua', 'ombra'], weak: ['natura', 'fulmine', 'roccia'] },
  ghiaccio: { strong: ['natura', 'roccia'], weak: ['fuoco', 'acqua', 'ghiaccio', 'acciaio'] },
  roccia: { strong: ['fuoco', 'fulmine', 'ghiaccio'], weak: ['acqua', 'natura', 'acciaio'] },
  ombra: { strong: ['luce'], weak: ['ombra', 'acciaio'] },
  luce: { strong: ['ombra', 'veleno'], weak: ['luce', 'acciaio'] },
  acciaio: { strong: ['ghiaccio', 'roccia'], weak: ['fuoco', 'fulmine', 'acciaio'] },
  veleno: { strong: ['natura', 'luce'], weak: ['roccia', 'veleno'], immune: ['acciaio'] },
};

/**
 * Moltiplicatore di un attacco di tipo `attack` contro un difensore con `defense`
 * (uno o due tipi): i contributi si moltiplicano, quindi una doppia debolezza
 * arriva a ×4 e una doppia resistenza a ×0.25.
 */
export function typeEffectiveness(attack: MonType, defense: MonType[]): number {
  const m = TYPE_CHART[attack];
  let mult = 1;
  for (const d of defense) {
    if (m.immune?.includes(d)) return 0;
    if (m.strong.includes(d)) mult *= 2;
    else if (m.weak.includes(d)) mult *= 0.5;
  }
  return mult;
}

/** Etichetta leggibile del moltiplicatore, per la UI. */
export function effectivenessLabel(mult: number): string {
  if (mult === 0) return 'Immune';
  if (mult >= 4) return 'Devastante';
  if (mult >= 2) return 'Superefficace';
  if (mult <= 0.25) return 'Quasi nullo';
  if (mult <= 0.5) return 'Poco efficace';
  return 'Normale';
}

/** Debolezze aggregate di una squadra: quanti membri sono vulnerabili a ogni tipo. */
export function teamWeaknesses(teamTypes: MonType[][]): Record<MonType, number> {
  const out = {} as Record<MonType, number>;
  for (const atk of MON_TYPES) {
    out[atk] = teamTypes.filter((types) => typeEffectiveness(atk, types) > 1).length;
  }
  return out;
}
