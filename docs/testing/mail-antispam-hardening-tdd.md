# Evidenze TDD per la riduzione dei segnali antispam

## Origine e percorsi utente

Le garanzie derivano dall'analisi di un messaggio transazionale classificato da Outlook con SCL 6 e destinazione Junk.

- Come destinatario, voglio ricevere una mail transazionale senza indicatori artificiali di urgenza, così da ridurre segnali assimilabili al phishing.
- Come destinatario, voglio vedere il logo del gruppo senza ricevere un allegato inutilmente grande.
- Come gestore, voglio che un logo non elaborabile non impedisca l'invio di una comunicazione importante.

## Ciclo RED → GREEN

| Fase | Comando | Evidenza |
|---|---|---|
| RED | `vitest run providers/mail/gmail-smtp-mail-provider.test.ts providers/mail/gmail-mail-logo.test.ts` | 3 test provider falliti per priorità alta e ottimizzatore assente; suite logo non caricabile perché modulo e dipendenza diretta non esistevano. |
| GREEN | stesso comando | 2 file e 16 test superati. |
| Regressione | `vitest run --coverage` | 48 file e 179 test superati. |
| Qualità | `tsc --noEmit --incremental false` e `eslint .` | Entrambi superati. |
| Produzione | `prisma generate` e `next build` | Prisma Client generato; build Next.js completata con exit code 0 e bundle Sharp valido. |

## Garanzie

| # | Garanzia | Test | Tipo | Risultato |
|---|---|---|---|---|
| 1 | I messaggi non impostano più `priority: high`; i client ricevono una priorità neutra. | `gmail-smtp-mail-provider.test.ts` — invio con priorità neutra | Unitario | PASS |
| 2 | Il logo viene ridimensionato entro 96×96, convertito in PNG ottimizzato e limitato a 64 KB. | `gmail-mail-logo.test.ts` | Unitario con elaborazione immagine reale | PASS |
| 3 | Il provider allega esclusivamente il risultato ottimizzato, non il logo originale. | `gmail-smtp-mail-provider.test.ts` — ottimizzazione logo | Integrazione provider/trasporto | PASS |
| 4 | Un'immagine non decodificabile viene omessa senza interrompere l'invio e senza esporre l'errore interno nei log. | entrambi i file di test | Unitario | PASS |

## Copertura e limiti

- Complessiva: statement 92,50%; branch 84,19%; funzioni 93,33%; linee 94,96%.
- Provider mail: statement 90,41%; branch 80,76%; funzioni 92,18%; linee 94,52%.
- Il codice non può correggere la reputazione del mittente, configurare SPF/DKIM/DMARC o sostituire il dominio condiviso `vercel.app`; sono attività infrastrutturali.
- L'accettazione SMTP non garantisce la collocazione nella posta in arrivo: serve una nuova prova reale Outlook dopo il deploy.
- Durante la generazione statica locale il database era inaccessibile alla sandbox; il fallback branding esistente ha consentito alla build di concludersi correttamente.

## Checkpoint Git

- RED: `3cc4941 test(mail): riproduci segnali antispam evitabili`
- GREEN: `f3e598f fix(mail): riduci segnali antispam evitabili`
