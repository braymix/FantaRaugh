/**
 * Simulatore di bilanciamento. Per questo design la domanda giusta non è
 * "win rate di un singolo fight" ma **quanto lontano arriva una run**: quante
 * medaglie, quanti nodi, con che starter.
 *
 * Gioca partite complete con una politica da "giocatore ragionevole" (cura se
 * malconcio, fa crescere la squadra, poi combatte) riusando la logica reale
 * della run: un agente cieco misurerebbe il caso peggiore, non il gioco.
 * Uso: `npm run sim -- [numeroRun]`
 */

import { BALANCE } from '@content/balance';
import { CREATURE_MAP, STARTER_IDS } from '@content/creatures';
import { generateRunMap, type MapNode } from '@content/runmap';
import type { Role } from '@engine/types';
import { healFull, maxHpOf } from '@state/party';
import { essenceForNode, grantTeamXp, makeRunMon, runFight, xpForNode } from '@state/run';
import type { RunState } from '@state/types';

const ROLE_LABEL: Record<Role, string> = {
  healer: 'Curatore',
  caster: 'Caster',
  defender: 'Difensore',
  blade: 'Combattente',
  thief: 'Ladro',
  assassin: 'Nascosto',
};

interface RunReport {
  badges: number;
  nodes: number;
  champion: boolean;
  essence: number;
  damageByRole: Record<Role, number>;
}

function playRun(starterId: string, seed: number): RunReport {
  const map = generateRunMap(seed);
  const starter = makeRunMon(starterId, BALANCE.starterLevel);
  const run: RunState = {
    seed,
    team: [starter],
    deposit: null,
    bag: [],
    currentNodeId: null,
    clearedNodeIds: [],
    badges: 0,
    nuzlocke: false,
    active: true,
    pending: null,
  };
  healFull(starter, {}, run.team);

  const damageByRole: Record<Role, number> = {
    healer: 0, caster: 0, defender: 0, blade: 0, thief: 0, assassin: 0,
  };
  let essence = 0;
  let nodes = 0;

  for (;;) {
    const options = run.currentNodeId === null ? map.startIds : (map.nodes[run.currentNodeId]?.next ?? []);
    if (options.length === 0) break;
    // Politica "giocatore ragionevole": cura se la squadra è malconcia, altrimenti
    // fa crescere la squadra, poi accetta i combattimenti. Un agente cieco
    // misurerebbe il caso peggiore, non il gioco.
    const hurt = run.team.some((m) => m.hp < maxHpOf(m, {}, run.team) * 0.55);
    const score = (n: MapNode): number => {
      if (n.kind === 'heal') return hurt ? 100 : 20;
      if (n.kind === 'ball') return run.team.length < BALANCE.maxRecruits ? 90 : 25;
      if (n.kind === 'item') return 60;
      if (n.kind === 'tutor') return 55;
      if (n.kind === 'wild') return hurt ? 30 : 70;
      if (n.kind === 'trainer') return hurt ? 10 : 50;
      if (n.kind === 'event') return 40;
      if (n.kind === 'trade') return 30;
      return 80; // palestra / supremi / campione: obbligati
    };
    const nextId = [...options].sort((a, b) => score(map.nodes[b]!) - score(map.nodes[a]!))[0]!;
    const node: MapNode = map.nodes[nextId]!;

    if (node.encounter.length > 0) {
      const outcome = runFight(run, map, node, {});
      // Attribuisce il danno ai ruoli della squadra schierata.
      const alive = run.team.filter((m) => !m.fainted);
      for (const [uid, dmg] of Object.entries(outcome.result.stats.damageByUid)) {
        if (!uid.startsWith('P')) continue;
        const idx = Number(uid.slice(1));
        const role = alive[idx] ? CREATURE_MAP[alive[idx]!.defId]?.role : undefined;
        if (role) damageByRole[role] += dmg;
      }
      for (const mon of run.team) {
        const hp = outcome.hpByUid[mon.uid];
        if (hp !== undefined) mon.hp = hp;
      }
      if (!outcome.won) break;
      for (const uid of outcome.faintedUids) {
        const mon = run.team.find((m) => m.uid === uid);
        if (mon) mon.hp = 1;
      }
      grantTeamXp(run.team, xpForNode(node));
      essence += essenceForNode(node);
      if (node.kind === 'commander') run.badges += 1;
      // Reclutamento automatico dopo una selvatica, se c'è posto.
      if (node.kind === 'wild' && node.encounter[0] && run.team.length < BALANCE.maxRecruits) {
        const mon = makeRunMon(node.encounter[0].defId, Math.max(1, node.level - BALANCE.recruitLevelPenalty));
        run.team.push(mon);
        healFull(mon, {}, run.team);
      }
      run.clearedNodeIds.push(nextId);
      run.currentNodeId = nextId;
      nodes++;
      if (node.kind === 'boss') {
        return { badges: run.badges, nodes, champion: true, essence, damageByRole };
      }
    } else {
      if (node.kind === 'heal') for (const mon of run.team) healFull(mon, {}, run.team);
      if (node.kind === 'ball' && node.offers[0] && run.team.length < BALANCE.maxRecruits) {
        const mon = makeRunMon(node.offers[0], node.level);
        run.team.push(mon);
        healFull(mon, {}, run.team);
      }
      if (node.kind === 'tutor') {
        const best = run.team[0];
        if (best && best.moveTier < BALANCE.moveTierMax) best.moveTier += 1;
      }
      if (node.kind === 'item' && node.offers[0]) {
        const target = run.team.find((m) => !m.itemId);
        if (target) target.itemId = node.offers[0];
      }
      essence += essenceForNode(node);
      run.clearedNodeIds.push(nextId);
      run.currentNodeId = nextId;
      nodes++;
    }
  }

  return { badges: run.badges, nodes, champion: false, essence, damageByRole };
}

function main(): void {
  const runsPerStarter = Number(process.argv[2] ?? 60);
  console.log('\n=== FANTARAUGH — Report di bilanciamento (run complete) ===');
  console.log(`Run per starter: ${runsPerStarter} · medaglie totali: ${BALANCE.badgeCount}\n`);

  const totals: Record<Role, number> = { healer: 0, caster: 0, defender: 0, blade: 0, thief: 0, assassin: 0 };
  let allBadges = 0;
  let allChampions = 0;
  let allRuns = 0;

  for (const starterId of STARTER_IDS) {
    let badges = 0;
    let nodes = 0;
    let champions = 0;
    for (let i = 1; i <= runsPerStarter; i++) {
      const r = playRun(starterId, i * 7919);
      badges += r.badges;
      nodes += r.nodes;
      if (r.champion) champions++;
      for (const role of Object.keys(totals) as Role[]) totals[role] += r.damageByRole[role];
      allBadges += r.badges;
      allChampions += r.champion ? 1 : 0;
      allRuns++;
    }
    const name = CREATURE_MAP[starterId]?.name ?? starterId;
    const bar = '█'.repeat(Math.round((badges / runsPerStarter / BALANCE.badgeCount) * 20));
    console.log(
      `  ${name.padEnd(11)} medaglie ${(badges / runsPerStarter).toFixed(1).padStart(4)}/${BALANCE.badgeCount}` +
        `  nodi ${(nodes / runsPerStarter).toFixed(1).padStart(5)}  campione ${((champions / runsPerStarter) * 100).toFixed(0)}%  ${bar}`,
    );
  }

  console.log(`\nMedia generale: ${(allBadges / allRuns).toFixed(2)} medaglie · campione ${((allChampions / allRuns) * 100).toFixed(1)}%`);
  console.log('\nDanno totale per ruolo (tutte le run):');
  const maxDmg = Math.max(1, ...Object.values(totals));
  for (const role of Object.keys(totals) as Role[]) {
    const bar = '█'.repeat(Math.round((totals[role] / maxDmg) * 24));
    console.log(`  ${ROLE_LABEL[role].padEnd(12)} ${Math.round(totals[role] / allRuns).toString().padStart(7)}  ${bar}`);
  }
  console.log('');
}

main();
