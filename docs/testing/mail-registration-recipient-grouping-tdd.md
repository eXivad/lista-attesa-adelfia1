# Evidenze TDD: destinatari della conferma iscrizione

## Origine e percorsi utente

Nessun piano esterno: i percorsi derivano dalla richiesta di raggruppare la conferma di nuova iscrizione.

- Come famiglia, voglio che entrambi i genitori ricevano la stessa conferma e siano visibili nel campo `To`.
- Come Gruppo, voglio ricevere la stessa conferma tramite `Bcc`, senza esporre la mailing list interna alla famiglia.
- Come gestore, voglio deduplicare un indirizzo presente sia tra i genitori sia nella mailing list.
- Come gestore, voglio che quota, limiti prudenziali e risultato SMTP continuino a considerare tutti i destinatari effettivi.

## Ciclo RED → GREEN

| Fase | Comando | Evidenza |
|---|---|---|
| RED | `node .\node_modules\vitest\vitest.mjs run providers/mail/gmail-smtp-mail-provider.test.ts modules/applicants/services/registration.service.test.ts repositories/prisma/applicant-registration.repository.test.ts` | 3 file eseguiti, 4 test falliti perché destinatari familiari e interni erano ancora fusi e il provider effettuava due invii. |
| GREEN | `node .\node_modules\vitest\vitest.mjs run providers/mail/gmail-smtp-mail-provider.test.ts modules/applicants/services/registration.service.test.ts repositories/prisma/applicant-registration.repository.test.ts providers/mail/gmail-mail-templates.test.ts` | 4 file e 27 test superati. |
| Regressione | `node .\node_modules\vitest\vitest.mjs run --coverage` | 51 file e 188 test superati. Copertura: istruzioni 91,93%, rami 83,85%, funzioni 93,50%, linee 94,21%. |
| Qualità | `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` e `node .\node_modules\eslint\bin\eslint.js .` | Entrambi superati. |
| Build | `node .\node_modules\next\dist\bin\next build` | Exit code 0. Il DB locale era inaccessibile durante la generazione statica (`EACCES`); il fallback branding esistente ha consentito di completare la build. |

## Garanzie

| # | Garanzia | Test | Tipo | Risultato |
|---|---|---|---|---|
| 1 | La conferma usa un solo invio SMTP, con i genitori deduplicati in `To` e la mailing list in `Bcc`. | `providers/mail/gmail-smtp-mail-provider.test.ts` | Integrazione provider/trasporto simulato | PASS |
| 2 | Un indirizzo presente in entrambi i gruppi non viene ripetuto in `Bcc`. | `providers/mail/gmail-smtp-mail-provider.test.ts` e `repositories/prisma/applicant-registration.repository.test.ts` | Unitario e integrazione repository | PASS |
| 3 | La quota viene riservata per il totale di `To` e `Bcc`, non per il solo messaggio SMTP. | `providers/mail/gmail-smtp-mail-provider.test.ts` | Unitario | PASS |
| 4 | Un rifiuto parziale di Gmail rende fallito l'intero invio raggruppato. | `providers/mail/gmail-smtp-mail-provider.test.ts` | Unitario | PASS |
| 5 | Gli errori SMTP del messaggio raggruppato vengono sanitizzati e non espongono indirizzi o dettagli grezzi. | `providers/mail/gmail-smtp-mail-provider.test.ts` | Unitario | PASS |
| 6 | L'outbox conserva tutti i destinatari, mentre il servizio mantiene distinti `To` e `Bcc`. | test repository e servizio di registrazione | Integrazione | PASS |

## Copertura, limiti e checkpoint

- Nessuna email reale è stata inviata durante i test; dopo il deploy occorre verificare intestazioni, cartella Spam e bounce su caselle controllate.
- Raggruppare riduce i messaggi SMTP ma non il numero di destinatari conteggiati dalla quota Gmail.
- Questo primo ciclo riguardava la conferma di nuova iscrizione. Il comportamento è stato successivamente esteso ad accettazione e rifiuto nel ciclo documentato in `mail-status-recipient-grouping-tdd.md`; inviti, reset e diagnostica conservano il proprio comportamento.
- Checkpoint RED: `eeb1b7a`.
- Checkpoint GREEN: `9bd8925`.
