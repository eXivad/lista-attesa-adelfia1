# Evidenze TDD: destinatari delle email di accettazione e rifiuto

## Origine e percorsi utente

Nessun piano esterno: i percorsi derivano dalla richiesta di replicare sugli esiti il raggruppamento già applicato alla conferma di nuova iscrizione.

- Come famiglia, voglio ricevere accettazione o rifiuto in un unico messaggio con entrambi i genitori in `To`.
- Come Gruppo, voglio ricevere lo stesso esito tramite `Bcc`, senza esporre la mailing list interna.
- Come gestore, voglio deduplicare gli indirizzi presenti sia tra i genitori sia nella mailing list.
- Come gestore, voglio che outbox e quota continuino a includere tutti i destinatari effettivi.

## Ciclo RED → GREEN

| Fase | Comando | Evidenza |
|---|---|---|
| RED | `node .\node_modules\vitest\vitest.mjs run providers/mail/gmail-smtp-mail-provider.test.ts modules/applicants/services/applicant-mutation.service.test.ts repositories/prisma/applicant-mutation.repository.test.ts` | 3 file eseguiti, 4 test falliti: il provider produceva ancora due messaggi per esito e servizio/repository fondevano destinatari familiari e interni. |
| GREEN | `node .\node_modules\vitest\vitest.mjs run providers/mail/gmail-smtp-mail-provider.test.ts modules/applicants/services/applicant-mutation.service.test.ts repositories/prisma/applicant-mutation.repository.test.ts providers/mail/gmail-mail-templates.test.ts` | 4 file e 31 test superati. |
| Regressione | `node .\node_modules\vitest\vitest.mjs run --coverage` | 51 file e 187 test superati. Copertura: istruzioni 91,93%, rami 83,48%, funzioni 93,50%, linee 94,21%. |
| Qualità | `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` e `node .\node_modules\eslint\bin\eslint.js .` | Entrambi superati. |
| Build | `node .\node_modules\next\dist\bin\next build` | Build Next.js di produzione completata con exit code 0. |

## Garanzie

| # | Garanzia | Test | Tipo | Risultato |
|---|---|---|---|---|
| 1 | Accettazione e rifiuto producono ciascuno un solo invio SMTP. | `providers/mail/gmail-smtp-mail-provider.test.ts` | Integrazione provider/trasporto simulato | PASS |
| 2 | I genitori sono in `To` e la mailing list interna è in `Bcc`. | test provider, servizio e repository | Integrazione | PASS |
| 3 | Un indirizzo presente in entrambi i gruppi viene mantenuto soltanto in `To`. | `repositories/prisma/applicant-mutation.repository.test.ts` | Unitario | PASS |
| 4 | L'outbox conserva l'elenco completo dei destinatari, anche se servizio e provider mantengono separata la visibilità. | test repository e servizio | Integrazione | PASS |
| 5 | Gli inviti, i reset e il messaggio diagnostico mantengono il comportamento esistente. | `providers/mail/gmail-smtp-mail-provider.test.ts` | Regressione | PASS |

## Limiti e checkpoint

- Nessuna email reale è stata inviata: dopo il deploy occorre controllare intestazioni, Spam e bounce su caselle autorizzate.
- Un solo messaggio SMTP continua a consumare quota per la somma dei destinatari in `To` e `Bcc`.
- Checkpoint RED: `f518ea8`.
- Checkpoint GREEN: `0b7e732`.
