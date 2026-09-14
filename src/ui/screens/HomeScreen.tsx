/** Schermata iniziale: stato del giocatore e avvio delle attività. */

import { useState } from 'react';
import { useGame } from '@state/store';

export function HomeScreen() {
  const profile = useGame((s) => s.profile);
  const navigate = useGame((s) => s.navigate);
  const newDungeon = useGame((s) => s.newDungeon);
  const hardReset = useGame((s) => s.hardReset);
  const [seedText, setSeedText] = useState('');

  const runActive = profile.run?.active ?? false;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <h1 className="font-display text-4xl tracking-wide text-gold drop-shadow">Fantaraugh</h1>
        <p className="mt-1 text-sm text-white/50">Eroi, dungeon e magia. Combattimenti automatici, build infinite.</p>
      </div>

      <div className="card w-full max-w-xs text-left text-sm">
        <Row label="Ascensione" value={`${profile.ascension}`} />
        <Row label="Boss battuti" value={`${profile.bossKills}`} />
        <Row label="Tentativi" value={`${profile.runsAttempted}`} />
        <Row label="Energia" value={`${profile.energy.current}/${profile.energy.max}`} />
        <Row label="Oro" value={`${profile.currencies.gold} 🪙`} />
        <Row label="Gemme" value={`${profile.currencies.gems} 💎`} />
      </div>
      <p className="-mt-3 max-w-xs text-[11px] leading-snug text-white/40">
        Roguelite: se cadi, la squadra tiene l'esperienza guadagnata e riparte un po'
        più forte. Ritenta finché non batti il boss — poi l'Ascensione sale e la sfida
        con lei.
      </p>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {runActive ? (
          <button className="btn-primary" onClick={() => navigate('dungeon')}>
            Continua il dungeon
          </button>
        ) : (
          <button className="btn-primary" onClick={() => newDungeon(seedText ? parseSeed(seedText) : undefined)}>
            Nuova run (−{3} energia)
          </button>
        )}
        <button className="btn-ghost" onClick={() => navigate('team')}>
          Squadra & Collezione
        </button>
        {!runActive && (
          <input
            value={seedText}
            onChange={(e) => setSeedText(e.target.value)}
            placeholder="Seed opzionale (dungeon deterministico)"
            className="rounded-lg bg-night-800 px-3 py-2 text-xs text-parchment placeholder:text-white/30"
          />
        )}
      </div>

      <button className="text-[11px] text-white/30 underline" onClick={hardReset}>
        Reimposta profilo
      </button>
    </div>
  );
}

function parseSeed(text: string): number {
  const n = Number(text);
  if (Number.isFinite(n)) return n >>> 0;
  // Stringa non numerica → hash stabile.
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1 last:border-b-0">
      <span className="text-white/50">{label}</span>
      <span className="font-semibold text-parchment">{value}</span>
    </div>
  );
}
