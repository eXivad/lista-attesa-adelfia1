# Evidenza TDD — dark mode email secondo Litmus

Data: 21 settembre 2026

## Fonti e obiettivo

Le user journey sono state ricavate dalla segnalazione e dalle indicazioni di:

- https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers
- https://www.hteumeuleu.com/2021/fixing-gmail-dark-mode-css-blend-modes/

Obiettivo: mantenere l'intestazione viola con testo bianco in Gmail iOS/iPadOS, lasciando che il contenuto neutro si adatti alla modalità scelta e senza imporre un tema scuro fisso.

## User journey

- Come destinatario in Gmail iOS/iPadOS, voglio che intestazione e pulsanti mantengano viola e bianco, senza inversioni rosa/nere.
- Come destinatario in un client compatibile con `prefers-color-scheme`, voglio una vera versione chiara o scura coerente con la preferenza di sistema.
- Come destinatario in un client senza targeting dark mode, voglio contenuto leggibile anche quando il client applica inversioni proprie.

## Evidenza RED

Comando:

```text
node .\node_modules\vitest\vitest.mjs run providers/mail/gmail-mail-templates.test.ts
```

Esito: 6 test superati e 1 fallito. Il test falliva perché mancavano doctype, classe body dedicata e blend selettivo senza breakpoint.

Checkpoint: `5e41baf test(mail): reproduce Gmail iOS full inversion`

## Evidenza GREEN

Il template ora contiene:

- metadati `color-scheme` e `supported-color-schemes`;
- `@media (prefers-color-scheme: dark)`;
- regole duplicate con `[data-ogsc]` per i client Outlook compatibili;
- selettore Gmail `u + .email-body` senza dipendenza dalla larghezza;
- doppio blend `screen`/`difference` limitato a intestazione e pulsanti;
- gradienti soltanto sugli sfondi viola e sul supporto del logo;
- superfici avorio/antracite al posto di bianco e nero puri.

## Specifica dei test

| Garanzia | Tipo | Risultato |
|---|---|---|
| Doctype e body consentono il targeting Gmail | Unit | PASS |
| Il blend è presente una sola volta nella diagnostica, quindi non blocca il contenuto | Unit | PASS |
| Inviti e reset proteggono anche il testo bianco dei pulsanti | Unit | PASS |
| Logo, testo dinamico, escaping e firme restano corretti | Unit | PASS |
| Le versioni light e dark standard hanno colori distinti | Browser QA | PASS |
| Rendering proprietario Gmail iOS/iPadOS | Prova reale | IN ATTESA |

## Verifiche finali

```text
Test template:      8/8 superati
Suite completa:     190/190 superati
Statements:         92,00%
Branches:           83,48%
Functions:          93,59%
Lines:              94,26%
Template email:     100% statements, functions e lines
TypeScript:         superato
ESLint:             superato
Build Next.js:      superata
```

Browser QA a viewport mobile 430 px:

```text
Light: header rgb(76, 29, 149), contenuto rgb(250, 250, 249), titolo rgb(41, 37, 36)
Dark:  header rgb(76, 29, 149), contenuto rgb(28, 25, 23), titolo rgb(245, 245, 244)
```

Il browser non replica la trasformazione proprietaria di Gmail iOS. La verifica conclusiva richiede una nuova email diagnostica letta su iPhone e iPad.
