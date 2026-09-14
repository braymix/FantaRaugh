/**
 * Simulatore di bilanciamento (CLI). Esegue N battaglie deterministiche della
 * squadra di partenza contro incontri generati, e riporta win rate, durata media
 * e danno medio per ruolo. Uso: `npm run sim -- [numeroBattaglie]`.
 *
 * Serve al bilanciamento batch: cambiare balance.ts e rilanciare per vedere
 * subito l'effetto su migliaia di scontri, senza aprire l'app.
 */

import { simulateBattle } from '@engine/battle';
import { buildBattleState, type Placement } from '@engine/build';
import { makeRng } from '@engine/prng';
import type { Role } from '@engine/types';
import { ENEMIES, BOSS_ID } from '@content/enemies';
import { REGISTRY } from '@content/registry';
import { createDefaultProfile } from '@state/profile';
import { buildPlayerPlacements } from '@state/loadout';

const ROLE_LABEL: Record<Role, string> = {
  healer: 'Curatore',
  caster: 'Caster',
  defender: 'Difensore',
  blade: 'Combattente',
  thief: 'Ladro',
  assassin: 'Nascosto',
};

const NON_BOSS = ENEMIES.filter((e) => e.id !== BOSS_ID);

const BOSS = ENEMIES.find((e) => e.id === BOSS_ID)!;

function randomEncounter(seed: number, level: number): Placement[] {
  const rng = makeRng(seed);
  const out: Placement[] = [];
  // ~1 incontro su 5 è un fight-boss, per dare uno spread al win rate.
  const isBoss = rng.chance(0.2);
  if (isBoss) out.push({ def: BOSS, level: level + 4, row: 'back' });
  const count = rng.int(3, 4);
  for (let i = 0; i < count; i++) {
    const def = NON_BOSS[rng.int(0, NON_BOSS.length - 1)]!;
    const row = def.role === 'caster' || def.role === 'thief' ? 'back' : 'front';
    out.push({ def, level: isBoss ? level + 3 : level, row });
  }
  if (!out.some((p) => p.row === 'front') && out[0]) out[0].row = 'front';
  return out;
}

function main(): void {
  const n = Number(process.argv[2] ?? 1000);
  const profile = createDefaultProfile();
  const player = buildPlayerPlacements(profile);
  const playerLevel = profile.heroes[0]?.level ?? 8;

  let wins = 0;
  let totalTurns = 0;
  const damageByRole: Record<Role, number> = { healer: 0, caster: 0, defender: 0, blade: 0, thief: 0, assassin: 0 };
  const healByRole: Record<Role, number> = { healer: 0, caster: 0, defender: 0, blade: 0, thief: 0, assassin: 0 };

  const roleOf = new Map(player.map((p, i) => [`P${i}`, p.def.role]));

  for (let seed = 1; seed <= n; seed++) {
    const enemy = randomEncounter(seed * 2654435761, playerLevel + 2);
    const state = buildBattleState(player, enemy);
    const res = simulateBattle(state, seed, REGISTRY);
    if (res.winner === 'player') wins++;
    totalTurns += res.stats.turns;
    for (const [uid, dmg] of Object.entries(res.stats.damageByUid)) {
      const role = roleOf.get(uid);
      if (role) damageByRole[role] += dmg;
    }
    for (const [uid, heal] of Object.entries(res.stats.healingByUid)) {
      const role = roleOf.get(uid);
      if (role) healByRole[role] += heal;
    }
  }

  const pct = (x: number) => `${((x / n) * 100).toFixed(1)}%`;
  const avg = (x: number) => (x / n).toFixed(0);

  console.log('\n=== FANTARAUGH — Report di bilanciamento ===');
  console.log(`Battaglie simulate: ${n}`);
  console.log(`Livello squadra: ${playerLevel}`);
  console.log(`Win rate: ${pct(wins)} (${wins}/${n})`);
  console.log(`Durata media: ${avg(totalTurns)} turni`);
  console.log('\nDanno medio per ruolo (per battaglia):');
  const roles = Object.keys(damageByRole) as Role[];
  const activeRoles = roles.filter((r) => player.some((p) => p.def.role === r));
  const maxDmg = Math.max(1, ...activeRoles.map((r) => damageByRole[r] / n));
  for (const r of activeRoles) {
    const d = damageByRole[r] / n;
    const bar = '█'.repeat(Math.round((d / maxDmg) * 24));
    const healNote = healByRole[r] > 0 ? `  (+${avg(healByRole[r])} cura)` : '';
    console.log(`  ${ROLE_LABEL[r].padEnd(12)} ${avg(damageByRole[r])}`.padEnd(28) + ` ${bar}${healNote}`);
  }
  console.log('');
}

main();
