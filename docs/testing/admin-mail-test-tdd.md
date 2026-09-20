# Evidenze TDD: test email dal backoffice

## Origine e percorsi utente

Nessun piano esterno: i percorsi derivano dalle richieste di inviare una prova email dal sito in produzione e, successivamente, di togliere il limite orario.

- Come Capo Gruppo, voglio inviare un messaggio diagnostico a una mia casella dalle Impostazioni, senza accesso alla console.
- Come utente non autorizzato, non devo poter usare l'azione di invio.
- Come Capo Gruppo, voglio poter ripetere la prova senza un limite orario applicativo, pur rispettando la quota Gmail.
- Come Capo Gruppo, voglio un esito comprensibile senza esposizione di segreti o falsa promessa di recapito in Posta in arrivo.

## Ciclo RED → GREEN

| Fase | Comando | Evidenza |
|---|---|---|
| RED iniziale | `node .\node_modules\vitest\vitest.mjs run modules/mail/admin-mail-test.test.ts 'app/(backoffice)/impostazioni/mail-test-action.test.ts'` | 2 suite fallite perché servizio e azione non esistevano. |
| RED interfaccia | `node .\node_modules\vitest\vitest.mjs run components/settings/mail-test-form.test.tsx` | 1 test fallito per componente assente. |
| GREEN iniziale | `node .\node_modules\vitest\vitest.mjs run modules/mail/admin-mail-test.test.ts 'app/(backoffice)/impostazioni/mail-test-action.test.ts' components/settings/mail-test-form.test.tsx` | 3 file e 9 test superati. |
| RED rimozione limite | Stesso comando | Il test di quattro invii consecutivi è fallito finché esisteva il limite orario. |
| GREEN finale | Stesso comando | 3 file e 8 test superati dopo la rimozione del limite. |
| Regressione | `node .\node_modules\vitest\vitest.mjs run --coverage` | 51 file e 187 test superati; copertura complessiva: istruzioni 92,58%, rami 84,25%, funzioni 93,40%, linee 95,02%. |
| Qualità | `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` e `node .\node_modules\eslint\bin\eslint.js .` | Entrambi completati con exit code 0. |
| Build | `node .\node_modules\next\dist\bin\next build` | Exit code 0. Durante la generazione statica il DB locale era inaccessibile (`EACCES`); il fallback branding esistente ha consentito la build. |

## Garanzie

| # | Garanzia | Test | Tipo | Risultato |
|---|---|---|---|---|
| 1 | Il destinatario viene validato come indirizzo singolo e normalizzato prima di chiamare il provider. | `modules/mail/admin-mail-test.test.ts` | Unitario | PASS |
| 2 | Quattro prove consecutive non sono bloccate da un limite orario applicativo. | `modules/mail/admin-mail-test.test.ts` | Unitario | PASS |
| 3 | L'azione verifica `users:manage` prima dell'invio. | `app/(backoffice)/impostazioni/mail-test-action.test.ts` | Integrazione azione/servizio simulato | PASS |
| 4 | Errori di input e quota hanno messaggi chiari; errori SMTP grezzi non arrivano al browser. | `app/(backoffice)/impostazioni/mail-test-action.test.ts` | Integrazione azione/servizio simulato | PASS |
| 5 | Il modulo mostra un destinatario modificabile e un pulsante di invio, senza indicare limiti orari inesistenti. | `components/settings/mail-test-form.test.tsx` | Rendering componente | PASS |

## Limiti noti e checkpoint

- Nessuna email reale è stata spedita dai test; il recapito e la collocazione in Spam vanno verificati manualmente dopo il deploy. L'esito positivo dell'azione indica soltanto accettazione da Gmail SMTP.
- Il modulo non impone limiti orari, ma usa il provider e la quota Gmail già configurati per l'app. L'accesso resta riservato ai Capo Gruppo e il contenuto è fisso.
- Checkpoint RED/GREEN iniziali: `ed1665e`, `8913e78`, `1c389ad`.
- Checkpoint RED/GREEN per la rimozione del limite: `50e3e6e`, `cd46357`.
