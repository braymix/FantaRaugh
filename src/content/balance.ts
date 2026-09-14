/**
 * TUTTE le costanti di bilanciamento vivono qui. Nessun numero magico sparso
 * nell'engine o nei contenuti: se un valore influenza il gioco, sta in questo
 * file, così è possibile ribilanciare senza cacciare costanti nel codice.
 */

export const BALANCE = {
  /** Dimensione squadra (configurabile come richiesto). */
  teamSize: 5,

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
  xpExponent: 1.5,
  maxLevel: 60,
  /** Quanto scalano i modificatori dell'arma per livello (0.08 = +8%/livello). */
  weaponStatPerLevel: 0.08,
  /** Quanto scala la potenza numerica di un perk per livello. */
  perkPowerPerLevel: 0.06,
  /** Bonus alla resa dell'arma se il ruolo ha affinità con essa. */
  weaponAffinityBonus: 0.15,
  /** XP assegnata a fine fight, per livello di minaccia del nodo. */
  xpPerThreat: 40,
  /** Oro assegnato a fine fight, per livello di minaccia. */
  goldPerThreat: 25,

  // --- Meta: energia/tentativi (interfacce pronte, non monetizzate) ---
  energyMax: 20,
  energyPerRun: 3,
  /** Minuti per rigenerare 1 punto energia. */
  energyRefillMinutes: 10,

  // --- Roguelite: "ritenti e cresci" ---
  /** Livello nemici del primo layer di un dungeon di ascensione 0. */
  dungeonBaseLevel: 3,
  /** Quanto sale il livello dei nemici per ogni ascensione (boss battuto). */
  ascensionLevelStep: 3,
  /** XP di consolazione a fine run persa, per ogni nodo già ripulito (+1). */
  defeatConsolationXpPerNode: 60,
  /** Oro di consolazione a fine run persa, per ogni nodo già ripulito. */
  defeatConsolationGoldPerNode: 12,
  /**
   * Potenza globale dei nemici (HP/ATK/DIF/RES e relativa crescita). Unico knob
   * per rendere i nemici competitivi a pari livello: alto ⇒ dungeon più duro ⇒
   * più tentativi/crescita necessari (roguelite).
   */
  enemyPowerScale: 2.6,

  // --- Rarità: slot perk sulle armi e moltiplicatore di potenza effetti ---
  raritySlots: {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
    mythic: 5,
  },
  rarityPowerMult: {
    common: 1.0,
    rare: 1.15,
    epic: 1.3,
    legendary: 1.5,
    mythic: 1.75,
  },
} as const;

export type RarityKey = keyof typeof BALANCE.raritySlots;
