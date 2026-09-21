# Evidenza TDD — template email e modalità scura

Data: 21 settembre 2026

## Ambito

- Allineamento dei test ai testi aggiornati delle email di registrazione e accettazione.
- Aggiunta di una palette scura esplicita al layout HTML condiviso da tutti i template.
- Conservazione degli stili inline e degli attributi `bgcolor` come fallback per i client email meno completi.
- Protezione del logo con fondo bianco anche in modalità scura.

## Fase RED

Comando:

```text
node .\node_modules\vitest\vitest.mjs run providers/mail/gmail-mail-templates.test.ts
```

Esito: 5 test superati e 1 fallito. Il solo fallimento riguardava l'assenza dei metadati `color-scheme` e della palette dark richiesta.

Commit: `0845513 test(mail): cover updated copy and dark mode`

## Fase GREEN

Il layout comune ora include:

- metadati `color-scheme` e `supported-color-schemes`;
- regole `prefers-color-scheme: dark` con colori controllati;
- selettori `data-ogsc` per i client Outlook compatibili;
- classi semantiche per sfondo, contenuto, intestazione, link, pulsanti, note e logo.

## Verifiche finali

```text
Test mirati:       6/6 superati
Suite completa:    188/188 superati
Statements:        91,94%
Branches:          83,48%
Functions:         93,53%
Lines:             94,21%
Template email:    100% statements, functions e lines
TypeScript:        superato
ESLint:            superato
Build Next.js:     superata
```

Nota: il rendering HTML delle email dipende dalle funzionalità offerte dal singolo client. I client che ignorano `prefers-color-scheme` possono applicare trasformazioni proprietarie; gli stili inline e i colori espliciti riducono gli effetti indesiderati ma non possono eliminarli in ogni combinazione di app e sistema operativo.
