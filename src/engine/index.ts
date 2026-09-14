/** Barrel dell'engine: unico punto d'ingresso pubblico per UI, contenuti e sim. */

export * from './types';
export { makeRng } from './prng';
export type { Rng } from './prng';
export { simulateBattle } from './battle';
export { buildBattleState, levelStats } from './build';
export type { Placement } from './build';
export { describeEffect } from './descriptions';
export { effectiveStat, effectiveStats } from './stats';
export { getFlags, hasStatus } from './status';
