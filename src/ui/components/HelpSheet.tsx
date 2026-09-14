/**
 * Legenda di gioco. Serve a rendere autoesplicative le meccaniche (barre, righe,
 * ruoli, stati, rarità) senza costringere il giocatore a indovinare.
 */

import { ROLE_META, statusIcon } from '../format';
import type { Role } from '@engine/types';

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

export function HelpSheet({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/75" onClick={onClose}>
      <div
        className="max-h-[88%] w-full overflow-y-auto border-t-2 border-gold/50 bg-night-800 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-lg text-gold">Come si gioca</span>
          <button className="btn-ghost" onClick={onClose}>
            Chiudi
          </button>
        </div>

        <Section title="Il combattimento è automatico">
          <p>
            Non si scelgono le mosse: si costruisce la squadra. L'esito dipende da eroi, armi, perk,
            livelli e schieramento. Puoi mettere in pausa, cambiare velocità o saltare l'animazione.
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
      </div>
    </div>
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
