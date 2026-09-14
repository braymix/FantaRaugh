/**
 * TUTTE le costanti di bilanciamento vivono qui. Nessun numero magico sparso
 * nell'engine o nei contenuti: se un valore influenza il gioco, sta in questo
 * file, così è possibile ribilanciare senza cacciare costanti nel codice.
 */

export const BALANCE = {
  // --- Barra d'azione (ATB) ---
  /** Soglia del gauge: quando la superi, agisci. */
  actionThreshold: 1000,
  /** Velocità minima efficace (evita gauge fermo con debuff pesanti). */
  minEffectiveSpeed: 10,

  // --- Calcolo del danno ---
  /** Curva di mitigazione: mit = stat / (stat + K). Più alto K = difesa meno efficace. */
  defMitigationK: 300,
  resMitigationK: 300,
  /** Danno minimo garantito a colpo andato a segno. */
  minDamage: 1,

  // --- Energia (risorsa per l'ultimate) ---
  energyOnBasicAttack: 25,
  energyOnDamaged: 10,
  /** Energia extra guadagnata dal Difensore quando subisce danno. */
  defenderEnergyOnDamaged: 15,

  // --- Guardie di sicurezza ---
  /** Profondità massima di ricorsione dei trigger (anti-loop infinito). */
  maxTriggerDepth: 8,
  /** Tetto di turni: oltre, la battaglia è un pareggio (evita stalli infiniti). */
  maxTurns: 400,

  // --- Progressione ---
  /** XP necessaria a salire di livello: base * livello^esponente. */
  xpBase: 100,
  xpExponent: 1.45,
  maxLevel: 60,
  /** XP assegnata a fine fight, per livello di minaccia del nodo. */
  xpPerThreat: 300,
  /**
   * Potenza globale dei nemici (HP/ATK/DIF/RES e relativa crescita). Unico knob
   * per rendere i nemici competitivi a pari livello: alto ⇒ dungeon più duro ⇒
   * più tentativi/crescita necessari (roguelite).
   */
  enemyPowerScale: 0.95,

  // --- Tipi ---
  /** Bonus quando l'elemento del colpo coincide con un tipo di chi attacca. */
  sameTypeBonus: 1.5,

  // --- Anti-stall (ritmo dei combattimenti) ---
  /** Turno da cui i danni vengono amplificati. */
  stallSpeedUpTurn: 70,
  stallDamageMult: 1.6,
  /** Turno da cui parte l'overtime: tutti perdono HP ogni turno. */
  overtimeTurn: 140,
  overtimeDamagePct: 0.015,

  // --- Struttura della run (stile Pokelike) ---
  /** Livello dello starter a inizio run. */
  starterLevel: 5,
  /** Medaglie da conquistare prima dei Quattro Supremi. */
  badgeCount: 8,
  /** Nodi (oltre alla palestra) in ogni tratta verso una medaglia. */
  nodesPerSegment: 3,
  /** Quanto sale il livello dei nemici per ogni medaglia conquistata. */
  levelPerBadge: 3,
  /** Livello dei nemici nel primo tratto. */
  wildBaseLevel: 5,
  /** Bonus di livello dei nemici nei nodi allenatore / palestra / élite. */
  trainerLevelBonus: 2,
  gymLevelBonus: 4,
  eliteLevelBonus: 6,
  championLevelBonus: 8,
  /** Quante creature può contenere la squadra (oltre, va sostituita). */
  maxRecruits: 5,
  /**
   * Posti in deposito. Una creatura in deposito riposa (rientra a HP pieni) ma
   * NON guadagna esperienza: resta indietro di livello. È il costo che impedisce
   * al deposito di essere un sesto membro gratuito.
   */
  depositSlots: 1,
  /** Livello a cui entra una creatura reclutata rispetto al nodo. */
  recruitLevelPenalty: 1,
  /** Moltiplicatore di potenza dell'ultimate per tier del Maestro di Mosse. */
  moveTierMult: [1, 1.25, 1.5],
  moveTierMax: 3,

  // --- Metaprogressione permanente ---
  /** Essenze guadagnate per nodo ripulito / medaglia / vittoria finale. */
  essencePerNode: 2,
  essencePerBadge: 15,
  essenceOnChampion: 120,
  /** Costo di un punto di potenziamento permanente su una linea evolutiva. */
  lineBuffCost: 25,
  /** Quanto vale un punto di potenziamento (frazione sulla stat base). */
  lineBuffStep: 0.06,
  lineBuffMaxPoints: 15,
  /** Soglie di membri dello stesso tipo per i tratti di sinergia. */
  traitThresholds: [2, 3, 4],
  /** Bonus per soglia di tratto raggiunta (frazione moltiplicativa). */
  traitBonusPerTier: 0.08,

} as const;
