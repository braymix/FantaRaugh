# Fantaraugh

RPG a squadre turn-based **roguelite** con **combattimenti automatici deterministici**,
ruoli con meccaniche distintive, sistema di effetti componibile e dungeon a grafo
ramificato. Web app (PWA), mobile-first, estetica **pixel-art**, offline-ready.
Fantasy puro.

> Vertical slice giocabile: schiera la squadra, equipaggia armi e perk, entra in un
> dungeon generato da un seed, guarda i combattimenti riprodursi dal log di eventi.
> **Ritenti e cresci**: se cadi tieni l'XP e riparti più forte; battuto il boss sale
> l'Ascensione e la sfida con lei.

## Avvio rapido

```bash
npm install
npm run dev        # sviluppo (Vite)
npm test           # test unitari (Vitest) — 53 test, incluso il determinismo
npm run sim -- 1000  # simulazione di bilanciamento su 1000 battaglie
npm run build      # build di produzione + service worker PWA
npm run preview    # anteprima della build
npm run lint       # ESLint
npm run typecheck  # controllo dei tipi
```

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

**C'è**: engine ATB completo, sistema di effetti + 6 ruoli, 6 eroi / 6 armi / 12 perk
/ 8 nemici, dungeon a 5 layer con boss, schermate squadra / dungeon / battaglia,
salvataggio localStorage, 53 test, simulatore di bilanciamento, PWA offline.

**Non ancora** (interfacce/hook predisposti): casse giornaliere, energia monetizzata,
acquisti, fusione (vedi opzioni in `DESIGN.md`), audio, animazioni elaborate, backend.
