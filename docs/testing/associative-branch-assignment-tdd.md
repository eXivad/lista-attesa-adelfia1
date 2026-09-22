# Assegnazione branca per anno associativo — evidenze TDD

## Origine e percorso utente

Non è stato usato un piano esterno. I requisiti derivano dalla verifica richiesta sul criterio di assegnazione della branca.

Come Capo, voglio che la branca mostrata per un iscritto dipenda dall'anno iniziale dell'anno associativo corrente e dall'anno di nascita, così che giorno, mese e cambio di anno solare non alterino l'assegnazione.

Per il 2026/2027 la regola verificata è `età associativa = 2026 - anno di nascita`:

- L/C: dal 2018 al 2015;
- E/G: dal 2014 al 2011;
- R/S: dal 2010 al 2005.

## Rapporto di esecuzione

### RED

Comando:

```text
node .\node_modules\vitest\vitest.mjs run modules/branches/domain/branch.test.ts repositories/prisma/applicant-query.repository.test.ts
```

Risultato: 4 test falliti su 7. Il calcolo precedente richiedeva date complete e lista/dettaglio non restituivano `associativeYearStart`.

Checkpoint: `96fac78 test(branches): reproduce associative year assignment bug`.

### GREEN

Lo start year dell'anno corrente viene letto nella stessa transazione delle query di lista e dettaglio. La branca viene calcolata con `associativeYearStart - birthYear`; senza anno associativo corrente non viene assegnata alcuna branca.

Comando mirato: lo stesso comando della fase RED.

Risultato: 7 test su 7 superati; typecheck superato.

Checkpoint: `7fd173c fix(branches): calculate placement from associative year`.

## Specifica dei test

| # | Garanzia | Test | Tipo | Risultato |
|---|---|---|---|---|
| 1 | Le coorti 2018–2015, 2014–2011 e 2010–2005 sono rispettivamente L/C, E/G e R/S nel 2026/2027 | `modules/branches/domain/branch.test.ts` | Unitario | PASS |
| 2 | Gli anni fuori dalle soglie configurate non ricevono una branca | `modules/branches/domain/branch.test.ts` | Unitario | PASS |
| 3 | In assenza di un anno associativo corrente non viene inventato un riferimento temporale | `modules/branches/domain/branch.test.ts` | Unitario | PASS |
| 4 | Lista e dettaglio recuperano lo start year identificato da `currentKey = 1` | `repositories/prisma/applicant-query.repository.test.ts` | Integrazione repository | PASS |

## Verifiche complessive

- Suite: 51 file e 193 test superati.
- Copertura: 92,04% statement, 83,69% branch, 93,59% function, 94,30% line.
- ESLint: superato.
- TypeScript: superato.
- Build Next.js 16.3.4: superata.

Durante la build il database locale non era raggiungibile e il caricamento del branding ha registrato `ECONNREFUSED`; il fallback previsto ha consentito alla build di terminare correttamente con codice 0. Non sono state eseguite prove E2E con un database reale perché la modifica è coperta a livello di dominio e repository e non cambia il flusso di interazione.
