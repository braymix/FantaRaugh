/**
 * Tipi core dell'engine di combattimento.
 *
 * Regola d'oro: qui NON si importa React/Zustand/DOM. Questi tipi descrivono lo
 * stato puro della battaglia e il modello dati degli effetti. Sia i contenuti
 * (eroi/armi/perk/nemici) sia le meccaniche di ruolo sono espressi con le stesse
 * strutture (Effect/Action/Condition/StatusDef): nessun ramo `if (role === ...)`
 * dentro il motore.
 */

export type Side = 'player' | 'enemy';
export type Row = 'front' | 'back';
export type DamageType = 'physical' | 'magical';

export type Role =
  | 'healer' // Curatore
  | 'caster' // Caster
  | 'defender' // Difensore
  | 'blade' // Combattente (lama)
  | 'thief' // Ladro
  | 'assassin'; // Nascosto

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

/** Tag semantici condivisi: permettono agli effetti di interagire tra loro. */
export type Tag =
  | 'fire'
  | 'bleed'
  | 'poison'
  | 'control'
  | 'area'
  | 'holy'
  | 'shadow'
  | 'physical'
  | 'magical'
  | 'buff'
  | 'debuff';

// --- Statistiche -----------------------------------------------------------

export type StatKey =
  | 'maxHp'
  | 'atk'
  | 'def'
  | 'speed'
  | 'critRate'
  | 'critDamage'
  | 'accuracy'
  | 'resistance'
  | 'energyMax';

export interface BaseStats {
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  critRate: number; // 0..1
  critDamage: number; // moltiplicatore, es. 1.5 = danno critico +50%
  accuracy: number; // 0..1
  resistance: number; // punti "armatura magica", mitiga danno magico e debuff
  energyMax: number;
}

/**
 * Modificatore di statistica.
 * mode 'add' = flat additivo; mode 'mul' = frazione moltiplicativa (0.3 = +30%).
 * Ordine di applicazione (stabile e documentato in stats.ts):
 *   finale = (base + Σadd) * Π(1 + mul)
 */
export interface StatMod {
  stat: StatKey;
  mode: 'add' | 'mul';
  value: number;
}

// --- Stati (buff/debuff) ---------------------------------------------------

export interface StatusFlags {
  taunt: boolean; // redirige gli attacchi singoli sul portatore
  stealth: boolean; // non bersagliabile da attacchi singoli finché non attacca
  stunned: boolean; // salta il proprio turno
  untargetable: boolean; // non bersagliabile in alcun modo
}

/**
 * Definizione di uno stato (dato di contenuto). Un'istanza applicata a un'unità
 * è una StatusInstance. Gli statMods vengono applicati moltiplicati per il
 * numero di stack.
 */
/** Effetto a tempo eseguito a inizio turno del portatore, per stack. */
export interface StatusTick {
  damagePctMaxHp?: number; // danno = frazione degli HP max, per stack (veleno/sanguinamento)
  healPctMaxHp?: number; // cura = frazione degli HP max, per stack (rigenerazione)
}

export interface StatusDef {
  id: string;
  name: string;
  kind: 'buff' | 'debuff';
  tags: Tag[];
  maxStacks: number;
  statMods?: StatMod[];
  /** Danno/cura a inizio turno del portatore (es. veleno, rigenerazione). */
  tick?: StatusTick;
  flags?: Partial<StatusFlags>;
}

export interface StatusInstance {
  defId: string;
  duration: number; // turni residui (del portatore)
  stacks: number;
  sourceUid: string;
}

// --- Sistema di effetti componibile ---------------------------------------

export type Trigger =
  | 'active' // azione attiva del turno (abilità/attacco base)
  | 'onBattleStart'
  | 'onTurnStart'
  | 'onTurnEnd'
  | 'onBeforeAttack' // reagisce l'attaccante, prima di colpire
  | 'onBeforeDefend' // reagisce il bersaglio, prima di essere colpito
  | 'onHit'
  | 'onCrit'
  | 'onKill'
  | 'onDamaged'
  | 'onHealed'
  | 'onDeath'
  | 'onAllyDeath'
  | 'onStatusApplied';

export type Condition =
  | { kind: 'selfHpBelowPct'; value: number }
  | { kind: 'selfHpAbovePct'; value: number }
  | { kind: 'targetHpBelowPct'; value: number }
  | { kind: 'targetHpAbovePct'; value: number }
  | { kind: 'targetHasTag'; tag: Tag }
  | { kind: 'targetHasStatus'; statusId: string }
  | { kind: 'selfHasStatus'; statusId: string }
  | { kind: 'selfMissingStatus'; statusId: string }
  | { kind: 'stackAtLeast'; stack: string; value: number }
  | { kind: 'targetIsRow'; row: Row }
  | { kind: 'alliesDeadAtLeast'; value: number }
  | { kind: 'isCrit' }; // valido nei trigger che portano info di colpo

export type TargetRule =
  | 'self'
  | 'triggerSource' // la controparte nel contesto del trigger (es. chi mi ha colpito)
  | 'singleEnemy' // scelta secondo l'IA di ruolo (rispetta taunt/stealth)
  | 'lowestHpEnemy'
  | 'lowestHpPctAlly'
  | 'lowestHpPctAllyOrSelf'
  | 'allEnemies'
  | 'allAllies'
  | 'alliesExceptSelf'
  | 'frontRowEnemies'
  | 'backRowEnemySingle' // bypassa la prima linea (assassino)
  | 'randomEnemy';

export type Action =
  | {
      kind: 'damage';
      power: number; // moltiplicatore su atk
      damageType: DamageType;
      tags?: Tag[];
      hits?: number; // colpi multipli (default 1)
      defIgnorePct?: number; // ignora una frazione della stat difensiva (0..1)
      bonusVsTag?: { tag: Tag; pct: number }; // +danno se il bersaglio ha il tag
    }
  | { kind: 'heal'; power: number; overhealToShield?: boolean }
  | { kind: 'shield'; power: number }
  | {
      kind: 'applyStatus';
      statusId: string;
      duration: number;
      stacks?: number;
      onSelf?: boolean; // applica al lanciatore invece che al bersaglio
    }
  | { kind: 'cleanse'; count?: number } // rimuove debuff dai bersagli
  | { kind: 'removeStatus'; statusId: string; onSelf?: boolean } // rimuove uno stato specifico
  | { kind: 'pushGauge'; amount: number } // frazione di soglia; + anticipa, - ritarda
  | { kind: 'gainEnergy'; amount: number }
  | { kind: 'addStack'; stack: string; amount: number; max: number }
  | { kind: 'consumeStack'; stack: string } // azzera un contatore
  | { kind: 'stealBuff'; count?: number }; // Ladro: sposta un buff dal bersaglio a sé

export interface Effect {
  id: string;
  name: string;
  trigger: Trigger;
  targeting: TargetRule;
  actions: Action[];
  conditions?: Condition[];
  tags?: Tag[];
  chance?: number; // 0..1, valutata col PRNG
  cooldown?: number; // turni tra un innesco e l'altro
  maxTriggersPerBattle?: number;
  energyCost?: number; // per le azioni attive (abilità)
  /** Descrizione manuale opzionale; se assente viene generata dai dati. */
  description?: string;
}

// --- Definizione unità (contenuto) ----------------------------------------

export interface GrowthCurve {
  /** Incremento per livello, additivo sulle stat base. */
  perLevel: Partial<Record<StatKey, number>>;
}

export interface UnitDef {
  id: string;
  name: string;
  role: Role;
  rarity: Rarity;
  baseStats: BaseStats;
  growth: GrowthCurve;
  ability: Effect; // attiva, gated dall'energia
  passives: Effect[];
  /** Attacco base opzionale; se assente si usa quello di default del ruolo. */
  basicAttack?: Effect;
}

// --- Unità runtime ---------------------------------------------------------

export interface Unit {
  uid: string; // id univoco nell'istanza di battaglia (deterministico)
  defId: string;
  name: string;
  role: Role;
  side: Side;
  row: Row;
  slot: number; // posizione, usata per il tie-break deterministico
  level: number;
  base: BaseStats; // base già scalata per livello
  hp: number;
  energy: number;
  shield: number;
  gauge: number;
  alive: boolean;
  statuses: StatusInstance[];
  stacks: Record<string, number>;
  ability: Effect;
  basicAttack: Effect;
  passives: Effect[];
  cooldowns: Record<string, number>; // effectId -> turni residui
  triggerCounts: Record<string, number>; // effectId -> inneschi in questa battaglia
  lastAttackerUid: string | null;
}

// --- Snapshot / log / risultato -------------------------------------------

export interface UnitSnapshot {
  uid: string;
  defId: string;
  name: string;
  role: Role;
  side: Side;
  row: Row;
  hp: number;
  maxHp: number;
  energy: number;
  energyMax: number;
  shield: number;
  speed: number;
  alive: boolean;
  statuses: { id: string; name: string; stacks: number; duration: number; kind: 'buff' | 'debuff' }[];
}

export type BattleEvent =
  | { t: 'battleStart'; seed: number; units: UnitSnapshot[] }
  | { t: 'turnStart'; uid: string; gauge: number; turn: number }
  | {
      t: 'abilityUsed';
      uid: string;
      effectId: string;
      name: string;
      targets: string[];
      isUltimate: boolean;
    }
  | { t: 'effectTriggered'; uid: string; effectId: string; name: string }
  | {
      t: 'damage';
      source: string;
      target: string;
      amount: number;
      crit: boolean;
      damageType: DamageType;
      tags: Tag[];
      absorbed: number;
      hpAfter: number;
    }
  | { t: 'miss'; source: string; target: string }
  | { t: 'heal'; source: string; target: string; amount: number; overheal: number; hpAfter: number }
  | { t: 'shield'; source: string; target: string; amount: number }
  | {
      t: 'statusApplied';
      source: string;
      target: string;
      statusId: string;
      name: string;
      stacks: number;
      duration: number;
      kind: 'buff' | 'debuff';
    }
  | { t: 'statusExpired'; target: string; statusId: string }
  | { t: 'statusTick'; target: string; statusId: string; amount: number; hpAfter: number }
  | { t: 'cleanse'; source: string; target: string; removed: string[] }
  | { t: 'gauge'; target: string; delta: number; gaugeAfter: number }
  | { t: 'energy'; target: string; delta: number; energyAfter: number }
  | { t: 'stack'; target: string; stack: string; amount: number; total: number }
  | { t: 'stealBuff'; source: string; target: string; statusId: string; name: string }
  | { t: 'death'; uid: string }
  | { t: 'battleEnd'; winner: Side | 'draw'; turns: number };

export interface BattleStats {
  turns: number;
  damageByUid: Record<string, number>;
  healingByUid: Record<string, number>;
  damageByRole: Record<Role, number>;
  damageTakenByUid: Record<string, number>;
}

export interface BattleResult {
  seed: number;
  winner: Side | 'draw';
  events: BattleEvent[];
  finalUnits: UnitSnapshot[];
  stats: BattleStats;
}

export interface BattleState {
  units: Unit[];
  turn: number;
  tickCount: number;
}

/**
 * Parametri numerici di tuning che l'engine consuma. I VALORI vivono in
 * content/balance.ts (dove il designer li trova tutti insieme); qui c'è solo la
 * forma. Passandoli come dato, l'engine non importa mai i contenuti.
 */
export interface EngineConfig {
  actionThreshold: number;
  minEffectiveSpeed: number;
  defMitigationK: number;
  resMitigationK: number;
  minDamage: number;
  energyOnBasicAttack: number;
  energyOnDamaged: number;
  defenderEnergyOnDamaged: number;
  maxTriggerDepth: number;
  maxTurns: number;
}

/**
 * Registro dei dati che l'engine risolve per id (stati + tuning). Viene fornito
 * dai contenuti: così l'engine resta ignaro di eroi/nemici concreti e lavora
 * solo su strutture generiche.
 */
export interface Registry {
  statuses: Record<string, StatusDef>;
  config: EngineConfig;
}
