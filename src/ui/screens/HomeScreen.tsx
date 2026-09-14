/** Schermata iniziale: meta-progressione e avvio della run. */

import { useGame } from '@state/store';
import { BALANCE } from '@content/balance';

export function HomeScreen() {
  const profile = useGame((s) => s.profile);
  const navigate = useGame((s) => s.navigate);
  const toggleNuzlocke = useGame((s) => s.toggleNuzlocke);
  const hardReset = useGame((s) => s.hardReset);

  const runActive = profile.run?.active ?? false;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center">
      <div>
        <h1 className="font-display text-4xl tracking-wide text-gold drop-shadow">Fantaraugh</h1>
        <p className="mt-1 text-xs text-white/50">
          Recluta, evolvi, conquista 8 medaglie. Poi i Quattro Supremi e il Campione.
        </p>
      </div>

      <div className="card w-full max-w-xs text-left text-sm">
        <Row label="Essenze" value={`${profile.essence} ✦`} />
        <Row label="Record medaglie" value={`${profile.records.bestBadges}/${BALANCE.badgeCount}`} />
        <Row label="Campione" value={`${profile.records.championWins}×`} />
        <Row label="Run tentate" value={`${profile.records.runs}`} />
        <Row label="Bestiario" value={`${profile.seen.length} creature`} />
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {runActive ? (
          <button className="btn-primary" onClick={() => navigate('map')}>
            Continua il viaggio
          </button>
        ) : (
          <button className="btn-primary" onClick={() => navigate('starter')}>
            Nuova run
          </button>
        )}
        <button className="btn-ghost" onClick={() => navigate('meta')}>
          Potenziamenti permanenti ✦
        </button>
        <button
          className={`border-2 border-black/50 px-3 py-2 text-sm ${
            profile.nuzlocke ? 'bg-blood text-white' : 'bg-white/10 text-white/60'
          }`}
          onClick={toggleNuzlocke}
        >
          Nuzlocke: {profile.nuzlocke ? 'ATTIVO' : 'spento'}
        </button>
        <p className="text-[10px] leading-snug text-white/35">
          In Nuzlocke una creatura che cade è perduta per sempre: ogni scelta pesa il doppio.
        </p>
      </div>

      <button className="text-[11px] text-white/30 underline" onClick={hardReset}>
        Azzera profilo
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-1 last:border-b-0">
      <span className="text-white/50">{label}</span>
      <span className="font-semibold text-parchment">{value}</span>
    </div>
  );
}
