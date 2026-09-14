# Fantaraugh — Documento di Design

Registro delle decisioni di design e del loro *perché*.
Ambientazione: **fantasy puro** (creature, dungeon, magia).

Il gioco è un **roguelite autobattler**: si costruisce una squadra durante la run e i
combattimenti si risolvono da soli. Le decisioni stanno prima e tra i fight.

---

## 1. Cosa è nostro e cosa viene da Pokelike

Pokelike è il riferimento per la *struttura* della run. Ma due pilastri restano
nostri, e sono la differenza del gioco:

| | Fantaraugh | Pokelike |
|---|---|---|
| Combattimento | **5v5 simultaneo** con barra d'azione (ATB) a tick | duelli 1v1 in sequenza |
| Identità unità | **6 ruoli** con attacco base, ultimate e passive | una sola mossa per creatura |

Da Pokelike arriva tutto il resto: tabella dei tipi, squadra costruita nella run,
catalogo unico (affronti ciò che puoi reclutare), evoluzioni, nodi ricchi, 8
medaglie → Quattro Supremi → Campione, oggetti con trade-off, anti-stall,
Nuzlocke, metaprogressione permanente.

## 2. Principio architetturale cardine

Il **motore di combattimento è TypeScript puro, deterministico e isolato dalla UI**
(`src/engine/`). Non importa React/Zustand, non tocca il DOM, non usa
`Math.random()` né `Date.now()`.

- Ogni scelta casuale passa da un **PRNG con seed** (mulberry32).
- `simulateBattle(state, seed, registry) -> BattleResult`. Il `registry` (stati,
  tuning, tabella dei tipi) è **iniettato dai contenuti**: la direzione delle
  dipendenze resta `ui → state → content → engine`.
- Output = stato finale + **log completo di `BattleEvent[]`**. La UI *riproduce* il
  log (`ui/battle/replay.ts`), non calcola nulla: un test verifica che lo stato
  ricostruito dagli eventi combaci con `finalUnits`.
- **Determinismo testato**: stesso stato + stesso seed ⇒ log identico. Ricaricare
  la pagina non cambia l'esito di un fight (niente reload-scumming).

## 3. Sistema di effetti componibile

Ultimate, attacchi base, passive dei ruoli ed effetti degli oggetti sono **tutti la
stessa struttura `Effect`** (`trigger` + `conditions` + `actions` + `targeting` +
`chance`/`cooldown`/`maxTriggersPerBattle`/`tags`). Nessun ramo `if (role === ...)`
nell'engine.

- **Modifiche di stat** = si applica uno *stato* con `statMods`: durata, stack, tag
  e rimozione via cleanse arrivano gratis. Slancio, Carica Arcana, Provocazione,
  Furtività e Agguato sono semplici stati.
- **Ordine delle stat** (stabile): `finale = (base + Σ add) * Π (1 + mul)`.
- **Descrizioni auto-generate** dai dati (`descriptions.ts`), sia in forma di frase
  sia **scomposte** (`describeEffectParts`): quando scatta → su chi → cosa fa →
  condizioni → chip. Il testo non può divergere dal comportamento.
- **Guardia anti-loop**: profondità massima di ricorsione dei trigger + tetto turni.

## 4. Barra d'azione (ATB) e i sei ruoli

Ogni unità accumula `speed` per tick; alla soglia agisce e si **sottrae** la soglia
(l'eccesso non va perso). Implementazione "a salto": si calcolano i tick minimi al
prossimo attore. I pareggi si risolvono per gauge poi slot/uid — **mai casualmente**.

I **kit di ruolo** (`content/rolekits.ts`) sono definiti una volta e condivisi da
tutte le creature di quel ruolo. Una creatura è quindi *statistiche + tipi + kit +
linea evolutiva*: aggiungerne una costa poche righe di dati.

| Ruolo | Meccanica | Come è realizzata |
|---|---|---|
| Curatore | cura il più ferito, overheal→scudo, e **chiude** i fight | `heal` con `overhealToShield`; passiva offensiva `Giudizio Luminoso` |
| Caster | AoE contrastata dalla Resistenza, cariche che potenziano l'ultimate | stato `arcane_charge` accumulato e **consumato** dal Cataclisma |
| Difensore | provocazione, scudi di squadra, energia dal danno | stato `taunt` rinnovato; energia extra su `onDamaged` |
| Combattente | colpi multipli, Slancio che cade sotto i critici | `momentum` su `onHit`, rimosso su `onDamaged` con `isCrit` |
| Ladro | velocissimo, agisce per primo, ruba buff, giustizia i feriti | `pushGauge` a inizio battaglia, `stealBuff`, `targetHpBelowPct` |
| Nascosto | furtività, bypassa la prima linea, agguato | `stealth` (flag), targeting `backRowEnemySingle`, re-stealth `onKill` |

> Il Curatore ha una passiva offensiva per una ragione precisa: senza capacità di
> chiudere un combattimento sarebbe una **scelta-trappola** come starter e
> premierebbe lo stallo. È lo stesso principio che motiva l'anti-stall (§8).

## 5. Tipi: il pilastro della copertura

Due assi **indipendenti**, per volontà di design:

- **fisico/magico** → quale statistica difensiva mitiga (Difesa o Resistenza);
- **tipo elementale** → il moltiplicatore (`×2`, `×0.5`, fino a `×4` su doppia
  debolezza, `×0` sulle immunità).

Dieci tipi (`content/typechart.ts`), ognuno con punti forti e debolezze. Se un
attacco non dichiara un elemento usa il **tipo primario di chi attacca**: così lo
stesso kit di ruolo funziona per una creatura di fuoco o di ghiaccio senza
duplicare contenuti, e prende automaticamente il **bonus stesso-tipo** (×1.5).

Le 8 palestre hanno un **tipo tematico**: la copertura di squadra è la decisione
strategica centrale. La schermata Squadra mostra l'**analizzatore di debolezze**
(quanti membri temono ogni tipo) per rendere il rischio esplicito.

## 6. La run: squadra costruita strada facendo

- Si scegli uno **starter** (uno per ruolo) a livello 5.
- La mappa è una catena ramificata di 37 tappe: **8 tratte** chiuse da una palestra,
  poi i **Quattro Supremi** (nessuna cura tra loro) e il **Campione**.
- La prima tappa offre sempre un **Richiamo** e uno scontro morbido: si parte da
  soli, e trovare un secondo compagno non può dipendere dai dadi.
- Tipi di nodo: selvatico (recluti chi batti), allenatore, oggetto, scambio,
  rifugio (cura), maestro di mosse, evento, richiamo, palestra, supremi, campione.
- Gli **HP non si rigenerano**: il logoramento è la minaccia vera e rende i rifugi
  una scelta di percorso, non un dettaglio.
- Il **catalogo è unico**: le creature che affronti sono quelle che puoi reclutare.
  I nemici usano lo stesso catalogo con un solo moltiplicatore di potenza globale.
- Squadra massima 5: quando è piena, reclutare impone di **scegliere chi sostituire**
  (chi esce è perso; il suo oggetto torna nella borsa).
- **Deposito da 1 posto**: salva una creatura dallo scarto. Chi è in deposito *riposa*
  (rientra a HP pieni) ma **non guadagna esperienza**, quindi resta indietro di
  livello. Lo scambio si decide **prima** di entrare in un nodo.

> Perché il deposito costa XP e non è un sesto membro: senza un costo diventerebbe
> una squadra da 6 con flessibilità perfetta. Il ritardo di livello lo rende una
> scelta di pianificazione — tieni da parte il contro-tipo per la palestra che vedi
> arrivare, sapendo che arriverà sottolivello. Il vincolo "si decide prima del
> combattimento" è ciò che trasforma l'anteprima del nodo in informazione utile.

## 7. Tre assi di crescita indipendenti

1. **Livello** (XP dai nodi);
2. **Evoluzione** automatica a soglie di livello — conserva ruolo e kit, migliora le
   statistiche e a volte aggiunge un secondo tipo. Gli sprite riusano la silhouette
   della linea schiarita per stadio: un'evoluzione si riconosce come "la stessa
   creatura, più potente";
3. **Tier della mossa finale** (1→3) dal Maestro di Mosse: una creatura di livello
   modesto con ultimate al tier 3 può battere una di livello alto al tier 1.

Gli **oggetti tenuti** (uno per creatura) hanno un **trade-off esplicito**, così non
esistono scelte dominate: Coda Lenta (+30% attacco, −25% velocità), Dadi Truccati
(spesso ti carichi, ma manchi più colpi), Amuleto Vampirico (ti curi colpendo, meno
HP massimi), Artiglio Rapido (agisci per primo, ma solo il 35% delle volte)…

## 8. Anti-stall

Oltre una soglia di turni i danni vengono amplificati; più oltre parte l'**overtime**
e tutti perdono una frazione di HP a turno. Motivo: impedire lo stallo puro e tenere
il ritmo. Conseguenza di design voluta: una squadra che tanka ma non chiude è
penalizzata. Testato con due unità inaffondabili che senza overtime non finirebbero.

## 9. Metaprogressione: la squadra muore, il giocatore cresce

La squadra esiste solo dentro la run. Alla fine restano:

- **Essenze ✦**, guadagnate per nodo/medaglia/vittoria (anche perdendo);
- **Potenziamenti permanenti per LINEA evolutiva** (5 statistiche × 15 punti,
  +6% ciascuno): migliorare uno stadio migliora tutta la linea, in tutte le run future;
- **Tratti di sinergia di tipo**: più membri condividono un tipo, più bonus — in
  tensione con la necessità di copertura;
- **Bestiario** delle creature incontrate;
- **Nuzlocke** opzionale: chi cade è perso per sempre.

## 10. Bilanciamento — curva misurata

`npm run sim` gioca run complete con una politica "giocatore ragionevole" (cura se
malconcio, fa crescere la squadra, poi combatte) e riporta medaglie, nodi e danno per
ruolo. Un agente cieco misurerebbe il caso peggiore, non il gioco.

Curva attuale (media su tutti gli starter):

| Potenziamenti permanenti | Medaglie | Campione |
|---|---|---|
| 0 (prime run) | 1.1 / 8 | 0% |
| 6 punti | 4.7 / 8 | 0% |
| 10 punti | 6.7 / 8 | 7% |
| 15 punti (massimo) | 7.8 / 8 | **27%** |

Letta come design: le prime partite finiscono presto (e insegnano), la
metaprogressione apre davvero la strada, ma il Campione resta un traguardo anche al
massimo — e il margine che manca è **abilità** (copertura dei tipi, scelta del
percorso, assegnazione degli oggetti, ordine di squadra), cose che il simulatore non
modella. Knob principali: `enemyPowerScale`, `xpPerThreat`, `levelPerBadge`,
`lineBuffStep`.

Findings ancora aperti: i sei starter sono ora tutti giocabili (1.0–1.5 medaglie a
mani nude), ma il Difensore parte leggermente più forte; da monitorare.

## 11. Estetica e presentazione

- **Pixel art "fine"**: font `Pixelify Sans`, `image-rendering: pixelated`, angoli
  quasi netti, bordi 2px, ombra a scalino.
- **Sprite procedurali** (`src/ui/art/`): primitive pixel + archetipi di silhouette
  (umanoide, bestia, volante, aracnide, non-morto). Una creatura dichiara palette +
  archetipo + copricapo + arma; la griglia 24×24 diventa un PNG data-URL memoizzato.
  Gli sprite restano *dati* versionabili, senza pipeline di asset.
- **Juice**: scossa sul colpo, lampo sul critico, respiro d'attesa, alone su chi
  agisce; tutto disattivato con `prefers-reduced-motion`.
- **Leggibilità**: schede effetto strutturate, stati con nome (non solo icona),
  efficacia di tipo scritta nel log, legenda "Come si gioca" sempre accessibile.

## 12. Costanti e contenuti

Tutte le costanti di bilanciamento stanno in `src/content/balance.ts`. I contenuti
(creature, oggetti, stati, tabella dei tipi, kit di ruolo, mappa) sono **dati** in
`src/content/`: aggiungere una linea evolutiva costa un descrittore.

## 13. Fuori scope (per ora)

Battle Tower come modalità separata, sfide giornaliere, account/cloud save, audio,
acquisti reali. La fusione di creature resta un'idea aperta: con le linee evolutive
e i potenziamenti di linea già in gioco, andrebbe ripensata da zero.
