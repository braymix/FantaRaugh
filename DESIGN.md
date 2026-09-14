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

## 6. Meta-gioco (solo tipi/hook in questa fase)

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
durata media e danno per ruolo. Findings attuali (da iterare):

- **Win rate ~100%** a livello di partenza contro incontri di pari/poco superiore
  livello: gli eroi sono nettamente più forti dei nemici "trash". Il divario si
  riduce solo a differenze di livello estreme (≈88% a nemici +32 livelli). → I nemici
  vanno riscalati (growth più ripida) e/o va introdotta pressione (numero, modificatori
  di stanza).
- **Nascosto sovra-tunato**: da solo produce ~6× il danno degli altri DPS anche
  dopo un primo ritocco (ambush e ultimate ridotti). È voluto che sia burst, ma il
  divario è eccessivo. → Prossimi passi: ridurre ulteriormente ambush/ultimate o
  aumentare la sopravvivenza dei bersagli in retrovia; usare il sim per convergere.
- Curatore/Difensore contribuiscono via cura/mitigazione, non danno (atteso).

Il simulatore è lo strumento con cui si itererà questo bilanciamento.

## 9. Costanti

Tutte le costanti di bilanciamento stanno in `src/content/balance.ts`. Nessun numero
magico sparso in engine/UI. I contenuti (eroi/armi/perk/nemici/dungeon) sono **dati**
in `src/content/`: aggiungere un eroe = scrivere un oggetto, senza toccare l'engine.
