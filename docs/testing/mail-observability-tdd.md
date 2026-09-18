# Evidenze TDD dei log Gmail SMTP

## Obiettivo

Rendere diagnosticabili in produzione l'autenticazione Gmail OAuth 2.0 e ogni fase dell'invio SMTP, mantenendo segreti e dati personali fuori dai log.

## Ciclo RED → GREEN

| Fase | Esecuzione | Evidenza |
|---|---|---|
| RED | `vitest run providers/mail/gmail-smtp-mail-provider.test.ts` | 6 test falliti perché mancavano gli eventi di autenticazione, configurazione, branding e consegna. Due controlli aggiuntivi hanno poi verificato il successo OAuth implicito nell'accettazione SMTP e il rifiuto di destinatari non validi. |
| GREEN | `vitest run providers/mail/gmail-smtp-mail-provider.test.ts` | 12 test superati. |
| Regressione | `vitest run --coverage` | 47 file e 175 test superati. |
| Qualità | `tsc --noEmit --incremental false` e `eslint .` | Entrambi superati senza errori o avvisi. |

## Garanzie verificate

| # | Garanzia | Risultato |
|---|---|---|
| 1 | La verifica SMTP registra avvio, autenticazione riuscita oppure causa classificata del fallimento. | PASS |
| 2 | Un invio accettato da Gmail registra il successo OAuth desunto dall'accettazione SMTP e il successo del singolo destinatario. | PASS |
| 3 | Ogni operazione usa un `operationId` per correlare autenticazione, quota, destinatari ed esito complessivo. | PASS |
| 4 | Gli indirizzi sono mascherati; token, credenziali, risposta SMTP grezza, oggetto, corpo e dati del minore non vengono registrati. | PASS |
| 5 | Configurazione non valida, branding di fallback, quota, limiti, destinatari non validi e rifiuti SMTP hanno eventi e codici causa dedicati. | PASS |
| 6 | Un errore del logger non interrompe l'invio dell'email. | PASS |

## Copertura

- Complessiva: statement 92,96%; branch 84,54%; funzioni 93,26%; linee 95,42%.
- Provider Gmail SMTP: statement 90%; branch 77,67%; funzioni 88,09%; linee 95,09%.

## Limiti interpretativi

- `mail.delivery.recipient.succeeded` significa che Gmail SMTP ha accettato il messaggio, non che la casella del destinatario lo abbia collocato nella posta in arrivo.
- I log non includono la risposta SMTP grezza: viene usata solo internamente per classificare il problema senza rischiare di esporre token o dettagli personali.
- I timestamp sono quelli aggiunti dalla piattaforma di esecuzione; il provider aggiunge l'identificativo di correlazione.

## Checkpoint Git

- RED: `5bc8fe3 test(mail): definisci log diagnostici sicuri`
- GREEN: `375c236 feat(mail): aggiungi log diagnostici SMTP`
