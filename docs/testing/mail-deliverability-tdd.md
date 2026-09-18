# Evidenze TDD recapito email con destinatario visibile

## Origine e percorso utente

Nessun piano esterno. Il percorso deriva dalla verifica della consegna Outlook:

- Come famiglia o membro dello staff, voglio vedere il mio indirizzo nel campo `To`, senza conoscere gli altri destinatari, per ricevere un messaggio personale e pi\u00f9 riconoscibile.
- Come amministratore, voglio che gli indirizzi duplicati siano contati e contattati una sola volta.
- Come amministratore, voglio che il fallimento di un destinatario non impedisca il tentativo verso gli altri.
- Come destinatario, voglio che il client di posta possa mostrare il messaggio come importante.

## Ciclo RED \u2192 GREEN

| Fase | Esecuzione | Evidenza |
|---|---|---|
| RED | `vitest run providers/mail/gmail-smtp-mail-provider.test.ts` | 4 test falliti: un solo invio BCC invece di due invii `To`, nessuna priorit\u00e0 alta e interruzione sul primo errore. |
| GREEN | `vitest run providers/mail/gmail-smtp-mail-provider.test.ts` | 10 test superati. |
| Regressione | `vitest run --coverage` | 47 file e 173 test superati. |
| Qualit\u00e0 | `tsc --noEmit --incremental false` e `eslint .` | Entrambi superati senza errori o avvisi. |

## Garanzie

| # | Garanzia | Test | Tipo | Risultato |
|---|---|---|---|---|
| 1 | Ogni indirizzo normalizzato riceve un messaggio separato nel campo `To`; il campo BCC non viene usato. | `gmail-smtp-mail-provider.test.ts` \u2014 invio distinto per destinatario | Unitario | PASS |
| 2 | Gli indirizzi duplicati vengono inviati una sola volta e la quota conta i destinatari unici. | `gmail-smtp-mail-provider.test.ts` \u2014 invio distinto per destinatario | Unitario | PASS |
| 3 | I messaggi usano `priority: "high"`, da cui Nodemailer genera le intestazioni standard di alta priorit\u00e0. | `gmail-smtp-mail-provider.test.ts` \u2014 invio distinto per destinatario | Unitario | PASS |
| 4 | Un rifiuto o errore SMTP individuale non impedisce il tentativo verso gli indirizzi successivi; l'operazione resta segnalata come fallita. | `gmail-smtp-mail-provider.test.ts` \u2014 invio parziale ed errore individuale | Unitario | PASS |
| 5 | Limiti prudenziali, quota giornaliera e sanitizzazione degli errori continuano a essere applicati prima o durante l'invio. | `gmail-smtp-mail-provider.test.ts` | Unitario | PASS |

## Copertura e limiti noti

- Statement: 93,70%; branch: 86,23%; funzioni: 94,44%; linee: 95,63%.
- Non \u00e8 stato effettuato un invio reale automatico: la consegna nella posta in arrivo e la visualizzazione dell'indicatore di importanza dipendono dal provider e dal client del destinatario.
- L'alta priorit\u00e0 \u00e8 un suggerimento standard al client; non garantisce l'assenza di classificazione spam.
- Se almeno un destinatario fallisce, l'outbox complessiva resta fallita anche quando altri destinatari hanno ricevuto il messaggio. Un eventuale retry per singolo destinatario richiederebbe uno stato di consegna pi\u00f9 granulare.

## Checkpoint Git

- RED: `422618a test(mail): riproduci invio BCC-only`
- GREEN: `e80ccde fix(mail): invia messaggi con destinatario To`
