/**
 * Regole del gioco, su due livelli:
 *  - "Semplice": le stesse schermate del tutorial, in forma di elenco. Frasi
 *    brevissime e parole concrete, pensate per essere capite da un bambino.
 *  - "Tutte le regole": il riferimento completo, con i numeri.
 *
 * Il livello semplice riusa i DATI del tutorial (TUTORIAL_STEPS): così le due
 * cose non possono raccontare versioni diverse del gioco.
 */

import { useState } from 'react';
import type { Role } from '@engine/types';
import { ROLE_META, statusIcon } from '../format';
import { Sprite } from './Sprite';
import { TUTORIAL_STEPS } from './Tutorial';

const ROLE_HINT: Record<Role, string> = {
  healer: 'Cura il più ferito; la cura in eccesso diventa scudo.',
  caster: 'Danno magico ad area: lo contrasta la Resistenza, non la Difesa.',
  defender: 'Provoca: gli attacchi singoli vanno su di lui. Guadagna energia subendo danno.',
  blade: 'Colpi multipli; accumula Slancio, che perde se subisce un critico.',
  thief: 'Velocissimo, agisce per primo, ruba buff e finisce i feriti.',
  assassin: 'Furtivo: non bersagliabile finché non attacca. Colpisce la retrovia.',
};

const STATUSES: [string, string][] = [
  ['taunt', 'Provocazione: attira gli attacchi singoli.'],
  ['stealth', 'Furtività: non bersagliabile da attacchi singoli.'],
  ['stun', 'Stordimento: salta il turno.'],
  ['poison', 'Veleno: danno a inizio turno.'],
  ['bleed', 'Sanguinamento: danno a inizio turno.'],
  ['burn', 'Ustione: danno da fuoco a inizio turno.'],
  ['regen', 'Rigenerazione: cura a inizio turno.'],
  ['momentum', 'Slancio: +attacco per stack.'],
  ['arcane_charge', 'Carica Arcana: potenzia il prossimo incantesimo.'],
  ['ambush', 'Agguato: forte bonus ai critici.'],
];

export function RulesSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'semplice' | 'complete'>('semplice');

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/75" onClick={onClose}>
      <div
        className="max-h-[90%] w-full overflow-y-auto border-t-2 border-gold/50 bg-night-800 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-lg text-gold">Regole del gioco</span>
          <button className="btn-ghost" onClick={onClose}>
            Chiudi
          </button>
        </div>

        <div className="mb-4 flex border-2 border-black/50">
          {(['semplice', 'complete'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-2 py-2 text-xs ${tab === t ? 'bg-arcane text-white' : 'bg-white/5 text-white/50'}`}
            >
              {t === 'semplice' ? 'Semplice' : 'Tutte le regole'}
            </button>
          ))}
        </div>

        {tab === 'semplice' ? <SimpleRules /> : <FullRules />}
      </div>
    </div>
  );
}

/** Le schermate del tutorial, in elenco: si rilegge quando serve. */
function SimpleRules() {
  return (
    <div className="space-y-3">
      {TUTORIAL_STEPS.map((step) => (
        <div key={step.title} className="border-2 border-black/40 bg-black/30 p-3">
          <div className="mb-1 flex items-center gap-2">
            {step.sprites ? (
              <span className="flex items-end gap-1">
                {step.sprites.map((id) => (
                  <Sprite key={id} defId={id} scale={1} />
                ))}
              </span>
            ) : (
              <span className="text-2xl">{step.icon}</span>
            )}
            <span className="font-display text-base text-gold">{step.title}</span>
          </div>
          {step.lines.map((l, k) => (
            <p key={k} className="text-sm leading-snug text-parchment">
              {l}
            </p>
          ))}
          {step.tip && <p className="mt-1 text-sm text-gold">💡 {step.tip}</p>}
        </div>
      ))}
    </div>
  );
}

/** Riferimento completo, con i dettagli e i numeri. */
function FullRules() {
  return (
    <>
        <Section title="Il combattimento è automatico">
          <p>
            Non si scelgono le mosse: si costruisce la squadra. L'esito dipende da creature, tipi,
            oggetti, livelli e schieramento. Puoi mettere in pausa, cambiare velocità o saltare.
          </p>
        </Section>

        <Section title="Il viaggio">
          <p>
            Scegli uno <b>starter</b>, poi percorri la mappa un nodo alla volta reclutando compagni
            (max 5). Obiettivo: <b>7 medaglie</b>, poi i <b>3 leader</b> (senza cure tra loro)
            e il <b>Capo</b>. Ogni scelta di percorso ha un costo: un oggetto è un allenatore in
            meno, e quindi meno livelli.
          </p>
          <Row icon="⚔️" label="Selvatico" text="Vinci e puoi reclutare la creatura battuta." />
          <Row icon="🔮" label="Richiamo" text="Recluta gratis una creatura tra quelle proposte." />
          <Row icon="🎯" label="Allenatore" text="Più duro, più esperienza." />
          <Row icon="📦" label="Oggetto" text="Uno di tre oggetti tenuti, ognuno con un compromesso." />
          <Row icon="🏕️" label="Rifugio" text="Cura tutta la squadra: gli HP NON si rigenerano da soli." />
          <Row icon="📜" label="Maestro" text="Potenzia la mossa finale di una creatura (tier 1→3)." />
          <Row icon="🔄" label="Scambio" text="Cedi una creatura per una di livello superiore." />
          <Row icon="🏅" label="Comandante" text="Leader di una regione: qui la copertura decide." />
        </Section>

        <Section title="Squadra e deposito">
          <p>
            La squadra tiene <b>5 creature</b>. Quando è piena, reclutare impone di scegliere chi
            sostituire: chi esce è perso (il suo oggetto torna nella borsa).
          </p>
          <p>
            C'è <b>un posto in deposito</b> per salvare una creatura dallo scarto. Chi è in deposito
            <b> riposa</b> (rientra a HP pieni) ma <b className="text-amber-200">non guadagna
            esperienza</b>: resta indietro di livello. Lo scambio si decide <b>prima</b> di entrare in
            un nodo — leggi l'anteprima della tappa e anticipa (il comandante di fuoco si vede arrivare).
          </p>
        </Section>

        <Section title="I tipi: la decisione più importante">
          <p>
            Ogni creatura ha uno o due tipi e colpisce col proprio tipo. Un attacco può fare
            <b> ×2</b> (superefficace), <b>×0.5</b> (poco efficace), fino a <b>×4</b> su una doppia
            debolezza o <b>×0</b> se il bersaglio è immune. Colpire col proprio tipo dà un bonus del
            50%.
          </p>
          <p>
            Nella schermata Squadra c'è l'<b>analizzatore di debolezze</b>: se tre membri temono lo
            stesso tipo, il comandante di quel tipo può spazzarti via. Specializzarsi conviene (i
            <b> tratti</b> danno bonus a chi condivide un tipo) ma espone: è la tensione centrale.
          </p>
        </Section>

        <Section title="Evoluzioni e crescita">
          <p>
            Le creature <b>evolvono automaticamente</b> a certi livelli, conservando ruolo e mosse ma
            migliorando le statistiche (e a volte guadagnando un secondo tipo). La potenza cresce su
            tre assi indipendenti: <b>livello</b>, <b>evoluzione</b> e <b>tier della mossa finale</b>.
          </p>
        </Section>

        <Section title="Le tre barre di ogni combattente">
          <Row icon="▬" label="Salute" text="La parte azzurra a destra è lo scudo: assorbe prima degli HP." />
          <Row icon="▬" label="Energia (viola)" text="Si riempie combattendo e subendo danno: piena ⇒ parte l'ultimate ✦." />
          <Row icon="▬" label="Azione (bianca)" text="Si carica in base alla Velocità: piena ⇒ è il suo turno. Chi è più veloce agisce più spesso." />
        </Section>

        <Section title="Prima linea e retrovia">
          <Row icon="▮" label="Prima linea" text="Assorbe gli attacchi singoli: metti qui chi ha difesa e HP alti." />
          <Row icon="▯" label="Retrovia" text="Protetta dagli attacchi singoli, ma non da quelli ad area né dagli assassini." />
        </Section>

        <Section title="I sei ruoli">
          {(Object.keys(ROLE_HINT) as Role[]).map((r) => (
            <Row key={r} icon={ROLE_META[r].icon} label={ROLE_META[r].label} text={ROLE_HINT[r]} />
          ))}
        </Section>

        <Section title="Stati">
          {STATUSES.map(([id, text]) => (
            <Row key={id} icon={statusIcon(id)} label="" text={text} />
          ))}
        </Section>

        <Section title="Leggere una scheda effetto">
          <p>
            Ogni abilità e perk mostra <b>quando scatta → su chi → cosa fa</b>, più eventuali condizioni
            ("solo se…") e i chip con costo energia, probabilità, ricarica e tag. Le percentuali sono
            riferite all'Attacco: "Danno fisico 120% ATK" significa 1,2 volte l'attacco.
          </p>
        </Section>

        <Section title="Roguelite">
          <p>
            Se cadi, la squadra tiene l'esperienza guadagnata e riparte più forte. Ritenta finché non
            batti il boss: poi l'Ascensione sale e i dungeon diventano più duri.
          </p>
        </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="mb-1 border-b border-white/10 pb-0.5 text-[11px] uppercase tracking-wider text-gold/80">
        {title}
      </div>
      <div className="space-y-1 text-[11px] leading-snug text-white/70">{children}</div>
    </div>
  );
}

function Row({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-4 shrink-0 text-center text-white/60">{icon}</span>
      <span>
        {label && <b className="text-parchment">{label}: </b>}
        {text}
      </span>
    </div>
  );
}
