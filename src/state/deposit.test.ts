import { beforeEach, describe, expect, it } from 'vitest';
import { BALANCE } from '@content/balance';
import { CREATURE_MAP } from '@content/creatures';
import { maxHpOf } from './party';
import { grantTeamXp, makeRunMon } from './run';
import { useGame } from './store';

/** Riempie la squadra fino al limite, partendo da una run pulita. */
function fillTeam(): void {
  const p = structuredClone(useGame.getState().profile);
  while (p.run!.team.length < BALANCE.maxRecruits) {
    p.run!.team.push(makeRunMon('goblin_grunt', 5));
  }
  useGame.setState({ profile: p });
}

const run = () => useGame.getState().profile.run!;

describe('deposito (1 posto)', () => {
  beforeEach(() => {
    useGame.getState().hardReset();
    useGame.getState().startRun('kael', 4242);
  });

  it('manda una creatura in deposito liberando uno slot di squadra', () => {
    fillTeam();
    const victim = run().team[4]!.uid;
    useGame.getState().depositMon(victim);

    expect(run().team.length).toBe(BALANCE.maxRecruits - 1);
    expect(run().deposit?.uid).toBe(victim);
    expect(run().team.some((m) => m.uid === victim)).toBe(false);
  });

  it('rifiuta se il deposito è già occupato', () => {
    fillTeam();
    useGame.getState().depositMon(run().team[4]!.uid);
    const occupied = run().deposit!.uid;

    useGame.getState().depositMon(run().team[0]!.uid);
    expect(run().deposit!.uid).toBe(occupied); // invariato
    expect(useGame.getState().toast).toMatch(/già occupato/i);
  });

  it('non si può restare senza squadra', () => {
    expect(run().team.length).toBe(1);
    useGame.getState().depositMon(run().team[0]!.uid);
    expect(run().team.length).toBe(1);
    expect(run().deposit).toBeNull();
  });

  it('lo scambio va deciso PRIMA del combattimento: bloccato con una scelta aperta', () => {
    fillTeam();
    const withPending = structuredClone(useGame.getState().profile);
    withPending.run!.pending = { kind: 'tutor' };
    useGame.setState({ profile: withPending });

    useGame.getState().depositMon(run().team[4]!.uid);
    expect(run().deposit).toBeNull();
    expect(useGame.getState().toast).toMatch(/scelta in corso/i);
  });

  it('rientrando in squadra riposa: torna a HP pieni', () => {
    fillTeam();
    // Ferisce la creatura, poi la deposita e la richiama.
    const hurt = structuredClone(useGame.getState().profile);
    hurt.run!.team[4]!.hp = 1;
    useGame.setState({ profile: hurt });
    const uid = run().team[4]!.uid;

    useGame.getState().depositMon(uid);
    expect(run().deposit!.hp).toBe(1); // in deposito resta ferita
    useGame.getState().withdrawMon();

    const back = run().team.find((m) => m.uid === uid)!;
    expect(back.hp).toBe(maxHpOf(back, useGame.getState().profile.lineBuffs, run().team));
    expect(run().deposit).toBeNull();
  });

  it('a squadra piena lo scambio è reciproco: chi esce va in deposito', () => {
    fillTeam();
    const stored = run().team[4]!.uid;
    useGame.getState().depositMon(stored);
    // Riporta la squadra a 5 con un nuovo membro.
    const refill = structuredClone(useGame.getState().profile);
    refill.run!.team.push(makeRunMon('dire_wolf', 5));
    useGame.setState({ profile: refill });
    expect(run().team.length).toBe(BALANCE.maxRecruits);

    const swapOut = run().team[0]!.uid;
    useGame.getState().withdrawMon(swapOut);

    expect(run().team.length).toBe(BALANCE.maxRecruits);
    expect(run().team.some((m) => m.uid === stored)).toBe(true);
    expect(run().deposit!.uid).toBe(swapOut);
  });

  it('chi è in deposito NON guadagna esperienza: resta indietro di livello', () => {
    fillTeam();
    useGame.getState().depositMon(run().team[4]!.uid);
    const storedBefore = structuredClone(run().deposit!);

    // L'XP va solo alla squadra schierata.
    const team = run().team;
    grantTeamXp(team, 50_000);

    expect(team[0]!.level).toBeGreaterThan(BALANCE.starterLevel);
    expect(run().deposit!.level).toBe(storedBefore.level);
    expect(run().deposit!.xp).toBe(storedBefore.xp);
  });

  it('la creatura in deposito non scende in campo', () => {
    fillTeam();
    const stored = run().team[4]!.uid;
    useGame.getState().depositMon(stored);
    const names = run().team.map((m) => CREATURE_MAP[m.defId]?.name);
    expect(names.length).toBe(BALANCE.maxRecruits - 1);
    expect(run().team.find((m) => m.uid === stored)).toBeUndefined();
  });
});

describe('tutorial e salvataggi', () => {
  it('la prima volta il tutorial non è ancora stato visto', () => {
    useGame.getState().hardReset();
    expect(useGame.getState().profile.tutorialSeen).toBe(false);
  });

  it('chiuderlo lo segna come visto; si può rivedere', () => {
    useGame.getState().hardReset();
    useGame.getState().closeTutorial();
    expect(useGame.getState().profile.tutorialSeen).toBe(true);
    useGame.getState().replayTutorial();
    expect(useGame.getState().profile.tutorialSeen).toBe(false);
  });
});
