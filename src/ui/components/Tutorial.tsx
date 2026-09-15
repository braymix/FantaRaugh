/**
 * Tutorial guidato, pensato per essere capito da un bambino.
 *
 * Regole di scrittura che mi sono dato: una sola idea per schermata, frasi
 * brevissime, parole concrete ("fa più male", non "moltiplicatore di danno"),
 * zero termini tecnici (niente ruolo, passiva, statistiche, tier). Le immagini
 * sono gli sprite veri del gioco, così quel che impari lo riconosci giocando.
 */

import { useState } from 'react';
import { CREATURE_MAP } from '@content/creatures';
import { Sprite } from './Sprite';

export interface Step {
  /** Emoji grande, oppure sprite di creature vere del gioco. */
  icon?: string;
  sprites?: string[];
  title: string;
  lines: string[];
  /** Il "trucco" da ricordare. */
  tip?: string;
}

export const TUTORIAL_STEPS: Step[] = [
  {
    icon: '👋',
    title: 'Ciao!',
    lines: ['Questo gioco funziona così:', 'tu scegli la squadra.', 'Le creature combattono da sole.'],
  },
  {
    sprites: ['kael', 'seraphine', 'umbra'],
    title: 'Il tuo primo amico',
    lines: ['Prima scegli una creatura.', 'Sarà il tuo primo amico.', 'Cresce insieme a te.'],
  },
  {
    icon: '🗺️',
    title: 'Scegli la strada',
    lines: ['Sulla mappa ci sono tante caselle.', 'Tu scegli dove andare.', 'Una casella alla volta.'],
    tip: 'Guarda bene la casella prima di entrare!',
  },
  {
    icon: '⚔️',
    title: 'Chi combatte?',
    lines: ['Combattono le tue creature.', 'Tu guardi e fai il tifo.', 'Puoi andare piano o veloce.'],
    tip: 'Se hai fretta, premi "Salta".',
  },
  {
    sprites: ['pyra', 'vesper', 'winter_wolf'],
    title: 'Forte e debole',
    lines: ['È come sasso-carta-forbici:', '🔥 il fuoco brucia l’erba 🌿', '🌿 l’erba beve l’acqua 💧', '💧 l’acqua spegne il fuoco 🔥'],
    tip: 'Se usi quello forte, fai molto più male!',
  },
  {
    icon: '🔮',
    title: 'Nuovi amici',
    lines: ['Se batti una creatura selvatica,', 'puoi portarla con te.', 'Nella squadra ci stanno 5 amici.'],
    tip: 'Se sono già 5, devi lasciarne andare uno.',
  },
  {
    icon: '🏕️',
    title: 'Le ferite restano',
    lines: ['Le ferite non guariscono da sole!', 'Vai alla tenda per curare tutti.'],
    tip: 'Non arrivare al capo con poca vita.',
  },
  {
    icon: '🏅',
    title: 'Le medaglie',
    lines: ['Devi sconfiggere 7 comandanti.', 'Ogni comandante dà una medaglia.', 'Poi i 3 leader del dungeon.', 'E alla fine il Capo 🐉'],
  },
  {
    icon: '✦',
    title: 'Se perdi?',
    lines: ['Non è grave! Si ricomincia.', 'Ogni volta guadagni stelline ✦', 'Le stelline ti fanno più forte', 'per sempre.'],
    tip: 'Perdere serve: diventi più forte.',
  },
  {
    icon: '🎮',
    title: 'Pronto!',
    lines: ['Ora tocca a te.', 'Buona fortuna!'],
    tip: 'Le regole sono sempre nel pulsante "?".',
  },
];

export function Tutorial({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const step = TUTORIAL_STEPS[i]!;
  const last = i === TUTORIAL_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-night-900">
      {/* Salta */}
      <div className="flex justify-end p-3">
        <button className="border-2 border-white/20 px-2 py-1 text-xs text-white/60" onClick={onClose}>
          Salta tutto
        </button>
      </div>

      {/* Contenuto */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-2 text-center">
        {step.sprites ? (
          <div className="mb-4 flex items-end gap-3">
            {step.sprites.map((id) => (
              <Sprite key={id} defId={id} role={CREATURE_MAP[id]?.role} scale={3} />
            ))}
          </div>
        ) : (
          <div className="mb-4 text-6xl">{step.icon}</div>
        )}

        <h2 className="mb-4 font-display text-3xl text-gold">{step.title}</h2>

        <div className="space-y-1.5">
          {step.lines.map((l, k) => (
            <p key={k} className="text-lg leading-snug text-parchment">
              {l}
            </p>
          ))}
        </div>

        {step.tip && (
          <div className="mt-5 border-2 border-gold/50 bg-gold/10 px-3 py-2 text-base text-gold">
            💡 {step.tip}
          </div>
        )}
      </div>

      {/* Pallini di avanzamento */}
      <div className="flex justify-center gap-1.5 pb-3">
        {TUTORIAL_STEPS.map((_, k) => (
          <span key={k} className={`h-2 w-2 ${k === i ? 'bg-gold' : 'bg-white/20'}`} />
        ))}
      </div>

      {/* Navigazione */}
      <div className="flex gap-2 border-t-2 border-black/50 bg-night-800 p-3">
        <button className="btn-ghost" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
          Indietro
        </button>
        <button className="btn-primary flex-1 text-lg" onClick={() => (last ? onClose() : setI(i + 1))}>
          {last ? 'Gioca!' : 'Avanti'}
        </button>
      </div>
    </div>
  );
}

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length;
