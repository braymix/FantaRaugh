/**
 * Stato del gioco, diviso in due piani (come in Pokelike):
 *  - META persistente: essenze e potenziamenti permanenti sulle linee evolutive;
 *  - RUN temporanea: la squadra si costruisce durante il viaggio e muore con esso.
 */

import type { Row, StatKey } from '@engine/types';

/** Una creatura della squadra corrente. Esiste solo dentro la run. */
export interface RunMon {
  uid: string;
  defId: string;
  level: number;
  xp: number;
  /** HP correnti: si trascinano da un combattimento al successivo. */
  hp: number;
  /** Oggetto tenuto (uno solo). */
  itemId: string | null;
  /** Tier della mossa finale (1..3), alzato dal Maestro di Mosse. */
  moveTier: number;
  row: Row;
  /** In Nuzlocke, chi cade è perso per sempre. */
  fainted: boolean;
}

/** Decisione in sospeso generata da un nodo: la run attende una scelta. */
export type PendingChoice =
  | { kind: 'recruit'; defId: string; level: number }
  | { kind: 'item'; offers: string[] }
  | { kind: 'ball'; offers: string[]; level: number }
  | { kind: 'tutor' }
  | { kind: 'trade'; defId: string; level: number };

export interface RunState {
  seed: number;
  team: RunMon[];
  /**
   * Deposito (1 posto): salva una creatura dallo scarto. Lo scambio con la
   * squadra si decide PRIMA di entrare in un nodo — a combattimento avviato
   * lo schieramento è quello che è.
   */
  deposit: RunMon | null;
  /** Oggetti raccolti e non ancora assegnati. */
  bag: string[];
  currentNodeId: string | null;
  clearedNodeIds: string[];
  badges: number;
  nuzlocke: boolean;
  active: boolean;
  /** Se la squadra è piena, il reclutamento richiede di scegliere chi sostituire. */
  pending: PendingChoice | null;
}

/** Punti di potenziamento permanente, per linea evolutiva e statistica. */
export type LineBuffs = Record<string, Partial<Record<StatKey, number>>>;

export interface MetaProfile {
  version: number;
  /** Valuta meta: si guadagna giocando, si spende sui potenziamenti di linea. */
  essence: number;
  lineBuffs: LineBuffs;
  /** Preferenza: la prossima run parte in Nuzlocke. */
  nuzlocke: boolean;
  records: {
    runs: number;
    bestBadges: number;
    championWins: number;
  };
  /** Creature incontrate almeno una volta (collezione/bestiario). */
  seen: string[];
  run: RunState | null;
}
