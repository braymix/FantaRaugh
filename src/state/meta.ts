/** Profilo meta persistente: quel che sopravvive alla morte di una run. */

import type { MetaProfile } from './types';

export const PROFILE_VERSION = 5;

export function createMetaProfile(): MetaProfile {
  return {
    version: PROFILE_VERSION,
    essence: 0,
    lineBuffs: {},
    nuzlocke: false,
    tutorialSeen: false,
    records: { runs: 0, bestBadges: 0, championWins: 0 },
    seen: [],
    run: null,
  };
}
