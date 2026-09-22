# Diagnostica email nelle impostazioni — evidenza TDD

## Origine e percorso utente

Nessun piano esterno: i criteri derivano dalla richiesta di rendere la funzione diagnostica meno esposta e di rimuovere il destinatario predefinito.

Come Capo Gruppo, voglio trovare la diagnostica email chiusa per impostazione predefinita e aprirla volontariamente, così da evitare invii accidentali. Quando la apro, il destinatario deve essere inserito manualmente.

## Evidenze

| Garanzia | Test o comando | Tipo | Risultato |
|---|---|---|---|
| La diagnostica è racchiusa in un `details` inizialmente chiuso | `components/settings/mail-test-form.test.tsx` | Componente | PASS |
| Il campo destinatario non contiene un valore predefinito e disabilita l'autocompletamento | `components/settings/mail-test-form.test.tsx` | Componente | PASS |
| L'action mantiene autorizzazione, validazione e gestione sicura degli errori | Suite Vitest completa | Integrazione | PASS |
| La pagina e il confine Server/Client compilano correttamente | `tsc --noEmit --incremental false` e `next build` | Statico/build | PASS |

## Ciclo RED/GREEN

- RED: `vitest run components/settings/mail-test-form.test.tsx` — 1 test fallito perché mancava il contenitore `details`. Commit `13a872c`.
- GREEN: lo stesso test è passato dopo l'introduzione del pannello richiudibile e la rimozione di `defaultRecipient`. Commit `d7214ab`.

## Copertura e limiti noti

`vitest run --coverage`: 197 test superati; statement 92,17%, branch 83,87%, funzioni 93,50%, linee 94,42%.

L'apertura e la chiusura sono affidate al comportamento nativo di `details`/`summary`; il test verifica il markup iniziale chiuso, mentre l'interazione nativa del browser non viene duplicata con JavaScript applicativo.
