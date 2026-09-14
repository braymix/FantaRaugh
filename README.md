# Fantaraugh

**Roguelite autobattler** fantasy: recluti creature strada facendo, le fai evolvere e
conquisti 8 medaglie, poi i Quattro Supremi e il Campione. I combattimenti sono
**5v5 simultanei, automatici e deterministici**: le decisioni stanno prima e tra i
fight. Web app (PWA), mobile-first, estetica **pixel-art**, offline-ready.

> Scegli uno **starter**, percorri una mappa ramificata scegliendo i nodi (selvatici,
> allenatori, oggetti, rifugi, maestri, palestre), costruisci la copertura di **tipi**
> giusta e guarda i fight riprodursi dal log di eventi.
>
> La squadra muore con la run: restano le **essenze**, che si spendono su
> potenziamenti permanenti delle **linee evolutive**. Ritenti, potenzi, riparti.

## Avvio rapido

```bash
npm install
npm run dev        # sviluppo (Vite)
npm test           # test unitari (Vitest) — 75 test, incluso il determinismo
npm run sim -- 25    # simula run complete e riporta medaglie/nodi per starter
npm run build      # build di produzione + service worker PWA
npm run preview    # anteprima della build
npm run lint       # ESLint
npm run typecheck  # controllo dei tipi
```

## Le meccaniche in breve

- **Combattimento**: 5v5 simultaneo con barra d'azione (ATB). Sei **ruoli** con
  meccaniche proprie (Curatore, Caster, Difensore, Combattente, Ladro, Nascosto).
- **Tipi**: 10 tipi con debolezze, resistenze e immunità (fino a ×4 e ×0), più il
  bonus stesso-tipo. Le 8 palestre sono a tema: la copertura decide.
- **Squadra nella run**: parti solo, recluti chi batti (max 5, poi devi sostituire).
  Gli HP **non** si rigenerano: i rifugi sono una scelta di percorso.
- **Tre assi di crescita**: livello, evoluzione automatica, tier della mossa finale.
- **Oggetti tenuti** con trade-off espliciti: niente scelte dominate.
- **Anti-stall**: i fight lunghi accelerano e poi si chiudono da soli.
- **Meta**: essenze → potenziamenti permanenti per linea evolutiva; tratti di
  sinergia di tipo; **Nuzlocke** opzionale.

## Grafica

Estetica pixel-art: font `Pixelify Sans`, bordi netti e ombre "a scalino". Gli sprite
di eroi e nemici sono **generati proceduralmente** da descrittori in
`src/ui/art/sprites.ts` (palette + archetipo + copricapo + arma) e resi come PNG
data-URL con `image-rendering: pixelated`. Per iterare sull'arte c'è una galleria di
sviluppo: `npm run dev` e apri `/sprites.html`.

## Architettura

```
src/
  engine/    logica pura, deterministica, testabile — zero dipendenze da UI/framework
  content/   dati: eroi, armi, perk, nemici, stati, dungeon, costanti (balance.ts)
  state/     store Zustand, salvataggi (StorageAdapter), meta-progressione, loadout
  ui/        componenti React (Tailwind) + replay del log di battaglia
  sim/       script CLI per il bilanciamento batch
```

Regola d'oro: `ui → state → content → engine`. L'engine non importa mai niente verso
l'alto; riceve i dati che gli servono tramite un `Registry` iniettato.

- **Determinismo**: `simulateBattle(state, seed, registry)` con PRNG con seed. Stesso
  input ⇒ stesso `BattleResult` (stato finale + `BattleEvent[]`).
- **La UI non calcola**: riproduce il log (`ui/battle/replay.ts`). Si può saltare
  l'animazione e vedere subito il risultato.

Dettagli e decisioni di design: vedi [`DESIGN.md`](./DESIGN.md).

## Deploy su Render (Static Site)

Il repo include [`render.yaml`](./render.yaml). Su Render: **New +** → **Blueprint** →
seleziona il repo → Render legge `render.yaml` e crea uno Static Site
(`npm ci && npm run build`, pubblica `./dist`).

In alternativa, a mano: **New +** → **Static Site** →
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Aggiungi una rewrite rule `/*` → `/index.html`.

**Persistenza / "il DB non persiste":** questa demo **non ha backend né database**.
Lo stato del giocatore è salvato in `localStorage` (client-side, `src/state/storage.ts`)
e persiste nel browser dell'utente. Su uno Static Site non c'è disco effimero né
servizio che si riavvia: i salvataggi non spariscono. Un DB reale servirà solo quando
si vorrà sincronizzare tra dispositivi/account — l'interfaccia `StorageAdapter` è già
pronta per sostituire localStorage con un backend senza toccare il resto.

## Aggiungere contenuti

Tutto è dato. Per un nuovo eroe basta aggiungere un `UnitDef` in
`src/content/heroes.ts`; per un perk, un `Effect` in `src/content/perks.ts`; ecc.
Nessuna modifica all'engine.

## Cosa c'è e cosa no (questa sessione)

**C'è**: engine ATB deterministico, sistema di effetti + 6 kit di ruolo, tabella dei
tipi, 43 creature su 19 linee evolutive, 14 oggetti con trade-off, mappa a 37 tappe
con 8 palestre a tema + Quattro Supremi + Campione, reclutamenti/scambi/maestro di
mosse, Nuzlocke, metaprogressione con potenziamenti di linea e tratti di tipo, sprite
pixel procedurali, analizzatore di debolezze, legenda di gioco, salvataggio
localStorage, **75 test**, simulatore di run complete, PWA offline.

**Non ancora**: Battle Tower come modalità separata, sfide giornaliere, account/cloud
save, audio, acquisti reali.
