# Fantaraugh — Documento di Design

Registro delle decisioni di design e del loro *perché*. Aggiornato man mano.
Ambientazione: **fantasy puro** (eroi, armi, mostri, dungeon, magia).

---

## 1. Principio architetturale cardine

Il **motore di combattimento è TypeScript puro, deterministico e isolato dalla UI**
(`src/engine/`). Non importa React/Zustand, non tocca il DOM, non usa
`Math.random()` né `Date.now()`.

- Ogni scelta casuale passa da un **PRNG con seed** (mulberry32, `prng.ts`).
- Firma: `simulateBattle(state, seed, registry) -> BattleResult`.
  - Il `registry` (stati + costanti di tuning) è **iniettato dai contenuti**: così
    l'engine non importa mai `content/`, e la direzione delle dipendenze resta
    `ui → state → content → engine`.
- Output = **stato finale + log completo di `BattleEvent[]`**. La UI *riproduce* il
  log (`ui/battle/replay.ts`), non calcola nulla. Un test lo verifica: lo stato
  ricostruito dagli eventi combacia con `finalUnits` dell'engine.
- **Determinismo garantito e testato**: stesso stato + stesso seed ⇒ log identico.

Perché: test veloci, replay, bilanciamento batch (`src/sim/`), e in futuro lo
spostamento del calcolo sul server (anti-cheat) senza riscrivere nulla.

## 2. Sistema di effetti componibile

Abilità, passive dei ruoli, intrinseci delle armi, perk e modificatori dei nemici
sono **tutti la stessa struttura `Effect`** (`trigger` + `conditions` + `actions`
+ `targeting` + `chance`/`cooldown`/`maxTriggersPerBattle`/`tags`). Nessun ramo
`if (role === ...)` nell'engine.

- **Modifiche di stat** = si applica uno *stato* (`StatusDef`) con `statMods`. Così
  ogni buff/debuff ha gratis: durata, stack, tag, e rimozione via cleanse. Le
  meccaniche di ruolo (Slancio, Carica Arcana, Provocazione, Furtività, Agguato)
  sono semplici stati.
- **Ordine di applicazione delle stat** (stabile, documentato in `stats.ts`):
  `finale = (base + Σ additivi) * Π (1 + moltiplicativo)`. Gli `statMods` valgono
  `× numero di stack`.
- **Tag** come collante tra effetti (es. `bonusVsTag` → "+% danno a chi sanguina").
- **Descrizioni auto-generate** dai dati (`descriptions.ts`): unica fonte di verità,
  il testo non può divergere dal comportamento. Un effetto può fornire una
  `description` manuale che ha precedenza.
- **Guardia anti-loop**: profondità massima di ricorsione dei trigger
  (`maxTriggerDepth`) + tetto turni (`maxTurns`). Testata con effetti che si
  rimbalzano.

## 3. Barra d'azione (ATB a tick)

Ogni unità accumula `speed` per tick; alla soglia (`actionThreshold = 1000`) agisce
e si **sottrae** la soglia (l'eccesso non va perso). Implementazione "a salto"
(`nextActor`): si calcolano i tick minimi al prossimo attore invece di iterare tick
per tick. I pareggi si risolvono per `gauge` poi `slot`/`uid` — **mai casualmente**.
Effetti come `pushGauge` (anticipo/ritardo) sono una leva prevista fin da subito.

> Nota UI: essendo "a salto", il log include un'istantanea del gauge di tutte le
> unità a ogni `turnStart`, così la UI disegna le barre d'azione senza ricalcolare.

## 4. I sei ruoli (espressi con effetti)

| Ruolo | Meccanica | Come è realizzata |
|---|---|---|
| Curatore | cura il più ferito, overheal→scudo, cleanse, rigenerazione | `heal` con `overhealToShield`, targeting `lowestHpPctAllyOrSelf`, `regen` a inizio battaglia |
| Caster | AoE magica, cariche che potenziano l'ultimate, ustioni | stato `arcane_charge` (+atk/stack) accumulato ogni turno e **consumato** dall'ultimate (`removeStatus`); `burn` su colpo |
| Difensore | provocazione, intercetto retrovia, energia dal danno | stato `taunt` (flag) rinnovato ogni turno; energia extra su `onDamaged` (unica costante di ruolo nell'engine); rappresaglia `atk_down` |
| Combattente | colpi multipli, Slancio che cresce e cade sotto i critici | stato `momentum` (+atk/stack) su `onHit`, rimosso su `onDamaged` con condizione `isCrit` |
| Ladro | velocissimo, agisce prima, ruba buff, giustizia i feriti | `pushGauge` a inizio battaglia, azione `stealBuff`, effetto `onHit` con `targetHpBelowPct` |
| Nascosto | furtività, bypassa la prima linea, agguato, rientra in stealth | stato `stealth` (flag untargetable-singolo), targeting `backRowEnemySingle`, `ambush` su `onBeforeAttack`, re-stealth su `onKill` |

## 5. Decisioni segnalate (e scelte adottate)

1. **Pre-turno di Ladro/Nascosto** modellato come effetto `onBattleStart`
   (`pushGauge`/`stealth`), **non** come fase fuori dal loop ATB: mantiene purezza
   e determinismo, resta testabile.
2. **Anteprima nodo parziale**: mostra ruoli nemici + minaccia + tipo ricompensa,
   **non** le statistiche esatte. Meno "solving" a tavolino, più tensione nella
   scelta del percorso.
3. **Fusione**: fuori scope per questa sessione (solo tipi/hook). Vedi §7.

## 6. Meta-gioco & loop roguelite

**Loop "ritenti e cresci"** (roguelite): la squadra parte a livello basso (3). In una
run si ripuliscono i nodi guadagnando XP *permanente*; se si cade, si riceve una
**consolazione** proporzionale ai nodi ripuliti (XP + oro), così ogni tentativo
lascia crescita. Si ritenta finché non si batte il boss; battuto il boss, l'
**Ascensione** sale e i dungeon successivi scalano di livello — sempre una prossima
sfida. Implementazione: `state/store.ts` (`enterNode`/`newDungeon`), `state/run.ts`
(`grantDefeatConsolation`), `profile.ascension`/`bossKills`/`runsAttempted`.

Altri sistemi (solo tipi/hook in questa fase):

- `StorageAdapter` (localStorage/memory) dietro cui sta il salvataggio versionato.
- Valute (soft `gold`, premium `gems`) — **nessun acquisto reale**.
- Energia/tentativi: rigenerazione a tempo, costo per run. Interfacce pronte.
- Livelli **indipendenti** per eroe / arma / ogni perk; XP dai fight.
- Casse giornaliere / login: non implementate (hook previsti nel profilo).

## 7. Fusione — opzioni di design (da decidere in una sessione futura)

Obiettivo: combinare due entità dello stesso tipo per una superiore, senza
banalizzare la progressione. Tre opzioni proposte:

- **Opzione A — Ascensione a costo crescente.** Fondere due copie *identiche* alza
  il "grado stella" (cap di livello + moltiplicatore stat), consumando la seconda
  copia. *Conserva*: l'entità base. *Perde*: la copia. *Eredita*: nulla. Anti-abuso:
  servono copie identiche, quindi la scarsità regola il ritmo.
- **Opzione B — Innesto con eredità parziale.** L'entità A assorbe B: mantiene la
  propria identità/effetti, ma eredita **un** perk/stat scelto da B e un po' di XP.
  *Conserva*: A e la sua build. *Perde*: B. *Eredita*: un tratto selezionato.
  Anti-abuso: si può ereditare solo 1 tratto e con un "tassa" di materiali.
- **Opzione C — Fusione trasmutativa (rischio).** A + B → una **nuova** entità di
  rarità superiore con effetti pescati da entrambe secondo regole; c'è varianza.
  *Conserva*: nulla di garantito. *Perde*: A e B. *Eredita*: mix probabilistico.
  Anti-abuso: alto costo e imprevedibilità scoraggiano il fusion-spam.

Raccomandazione iniziale: **Opzione B** (leggibile, premia la costruzione mirata,
facile da bilanciare). Da confermare.

## 8. Bilanciamento — stato e risultati del simulatore

`npm run sim` esegue 1000 battaglie della squadra di partenza e riporta win rate,
durata media e danno per ruolo. Dopo la ritaratura per il roguelite:

- I nemici hanno un **moltiplicatore di potenza globale** (`balance.enemyPowerScale`,
  attualmente 2.6) che li rende competitivi a pari livello. Unico knob per alzare/
  abbassare la durezza dell'intero gioco.
- **Curva di sfida** (squadra iniziale, ascensione 0): primo scontro ~100%; nella run
  greedy si ripuliscono ~4/5 nodi ma il **boss è un muro** (0% a Lv3 → ~10% Lv6 →
  ~32% Lv10 → ~52% Lv15 → ~75% Lv20). Esattamente il "ritenti e cresci": progresso
  costante ogni run, boss superato dopo qualche livello.
- **Sim generico** (incontri misti, ~1000 battaglie): win rate ~82%, durata media
  ~50 turni. Il **Nascosto** resta il miglior DPS (~2.8× rispetto al Caster, sceso da
  ~6×): burst voluto, divario ora accettabile.
- Curatore/Difensore contribuiscono via cura/mitigazione, non danno (atteso).

Prossimi passi di tuning (col sim): rifinire il rapporto tra i DPS, tarare
`ascensionLevelStep` sulla curva XP, aggiungere modificatori di stanza per varietà.

## 9b. Estetica pixel & deploy

- **Look pixel-art "fine"**: font `Pixelify Sans` (pixel ma leggibile, non troppo
  grosso), `image-rendering: pixelated`, angoli quasi netti (borderRadius ridotto in
  `tailwind.config.js`), bordi 2px e ombra "a scalino" (`shadow-pixel`).
- **Offline**: il font è cache-ato a runtime dal service worker (vedi
  `vite.config.ts`), così l'app resta coerente anche offline dopo la prima visita.
- **Deploy (Render, Static Site)**: `render.yaml` incluso. Nessun backend/DB: lo stato
  è in `localStorage` (persiste nel browser dell'utente). Su un Static Site non c'è
  disco effimero né servizio che si riavvia, quindi il salvataggio non "sparisce".

## 9. Costanti

Tutte le costanti di bilanciamento stanno in `src/content/balance.ts`. Nessun numero
magico sparso in engine/UI. I contenuti (eroi/armi/perk/nemici/dungeon) sono **dati**
in `src/content/`: aggiungere un eroe = scrivere un oggetto, senza toccare l'engine.
