/**
 * Assembla il Registry passato all'engine: mappa degli stati + config numerica
 * derivata da balance.ts. È l'unico punto dove i contenuti "iniettano" i numeri
 * di bilanciamento nel motore, che resta così agnostico.
 */

import type { EngineConfig, Registry } from '@engine/types';
import { BALANCE } from './balance';
import { STATUS_MAP } from './statuses';
import { typeEffectiveness } from './typechart';

export const ENGINE_CONFIG: EngineConfig = {
  actionThreshold: BALANCE.actionThreshold,
  minEffectiveSpeed: BALANCE.minEffectiveSpeed,
  defMitigationK: BALANCE.defMitigationK,
  resMitigationK: BALANCE.resMitigationK,
  minDamage: BALANCE.minDamage,
  energyOnBasicAttack: BALANCE.energyOnBasicAttack,
  energyOnDamaged: BALANCE.energyOnDamaged,
  defenderEnergyOnDamaged: BALANCE.defenderEnergyOnDamaged,
  maxTriggerDepth: BALANCE.maxTriggerDepth,
  maxTurns: BALANCE.maxTurns,
  stallSpeedUpTurn: BALANCE.stallSpeedUpTurn,
  stallDamageMult: BALANCE.stallDamageMult,
  overtimeTurn: BALANCE.overtimeTurn,
  overtimeDamagePct: BALANCE.overtimeDamagePct,
  sameTypeBonus: BALANCE.sameTypeBonus,
};

export const REGISTRY: Registry = {
  statuses: STATUS_MAP,
  config: ENGINE_CONFIG,
  effectiveness: typeEffectiveness,
};
