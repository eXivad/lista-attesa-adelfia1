# Migrazione dei template a React Email — evidenze TDD

Data: 22 settembre 2026

## Obiettivo

Migrare tutti i messaggi transazionali dal markup HTML costruito manualmente a un componente React Email condiviso, mantenendo invariati destinatari, logo CID, quota Gmail, OAuth 2.0 e osservabilità del provider Nodemailer.

## Ciclo RED → GREEN

| Fase | Comando | Esito |
|---|---|---|
| RED | `node .\node_modules\vitest\vitest.mjs run providers/mail/gmail-mail-templates.test.ts providers/mail/gmail-smtp-mail-provider.test.ts` | 3 verifiche del nuovo contratto React Email fallite come previsto; 21 test già verdi. |
| GREEN mirato | stesso comando | 2 file e 24 test superati. |
| Regressione | `node .\node_modules\vitest\vitest.mjs run` | 51 file e 194 test superati. |
| Copertura | `node .\node_modules\vitest\vitest.mjs run --coverage` | Soglie superate: istruzioni 92,16%, rami 83,87%, funzioni 93,50%, linee 94,41%. |
| Type-check | `node .\node_modules\typescript\bin\tsc --noEmit --incremental false` | Superato. |
| Lint | `node .\node_modules\eslint\bin\eslint.js .` | Superato senza segnalazioni. |
| Build | generazione Prisma e `next build` | Superata. Il database locale non era raggiungibile durante il prerender; il fallback di branding previsto ha gestito gli `ECONNREFUSED` senza interrompere la build. |

## Garanzie coperte

- rendering asincrono React Email completato prima della chiamata a Nodemailer;
- documento XHTML, primitive tabellari e preheader nascosto compatibili con i client email;
- alternativa `text/plain` generata dallo stesso HTML e priva del testo del preheader;
- escaping React dei dati dinamici e validazione HTTPS dei link;
- pulsanti con fallback Outlook e link testuale alternativo;
- palette del sito in modalità chiara e scura, con regole dedicate a Outlook e Gmail iOS;
- logo inline CID con sfondo protetto dalle inversioni di colore;
- stessi flussi per iscrizione, accettazione, rifiuto, invito staff, reset password e diagnostica;
- destinatari `To` e `Bcc`, quote, autenticazione e log SMTP non modificati.

## Riferimenti di implementazione

- [Integrazione React Email con Nodemailer](https://react.email/docs/integrations/nodemailer)
- [Render HTML e testo semplice](https://react.email/docs/utilities/render)
- [CLI di anteprima React Email](https://react.email/docs/cli)
