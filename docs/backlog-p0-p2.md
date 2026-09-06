# Audit backlog P0–P2

Audit aggiornato al 6 settembre 2026, basato sulla specifica funzionale, sul codice, sui test e sulla configurazione locale. Gli stati significano:

- ✅ implementato e verificato in misura adeguata;
- 🟡 implementato in parte oppure non ancora validato end-to-end/operativamente;
- ❌ non implementato.

## Change Request v1

Le 17 CR del documento `CR_Lista_Attesa_AGESCI_Adelfia1_v1.md` sono implementate e verificate:

- CR-01/02: residenza completa del minore e CAP dei tutori, inclusi persistenza, modifica e import;
- CR-03/04/07/08/09: dashboard e lista aggiornate;
- CR-05/06/10/11/12: navigazione responsive e dialog di conferma accessibili, senza `confirm`/`alert` nativi;
- CR-13/14: label età esplicite e palette branche fissa;
- CR-15/16/17: nome e logo del gruppo configurabili e applicati alle superfici pubbliche e riservate.

## P0 — Core indispensabile

| # | Task | Stato | Evidenza / lavoro residuo |
|---:|---|:---:|---|
| 1 | Setup Next.js + TypeScript | ✅ | Next.js App Router e TypeScript configurati. |
| 2 | Tailwind + shadcn/ui | ✅ | Tailwind 4, `components.json` e componenti UI riutilizzabili. |
| 3 | Prisma + PostgreSQL | ✅ | Schema Prisma, adapter PostgreSQL e migrazioni versionate. |
| 4 | Better Auth | ✅ | Email/password, sessioni e adapter Prisma. |
| 5 | RBAC | ✅ | Capability server-side separate per `ADMIN` e `STAFF`. |
| 6 | Modello dati | ✅ | Entità e vincoli principali presenti nello schema. |
| 7 | Form pubblico mobile-first | ✅ | Wizard in sei passaggi e validazione client/server. |
| 8 | Privacy | ✅ | Versione attiva, consenso e timestamp registrati. |
| 9 | Validazione CF minima | ✅ | Normalizzazione e controllo di 16 caratteri alfanumerici. |
| 10 | Anti-duplicato | ✅ | Vincolo univoco, controllo applicativo e registro HMAC per i rifiutati. |
| 11 | Generazione `registrationNumber` | ✅ | Contatore transazionale e formato `LA-AAAA-NNNNNN`. |
| 12 | Lista cronologica | ✅ | Ordinamento `createdAt ASC, id ASC` garantito; riga e card mostrano anno di nascita, sesso e timestamp completo. |
| 13 | Filtri | ✅ | Sesso, anno di nascita e stato. |
| 14 | Paginazione | ✅ | Paginazione esplicita da 20 elementi. |
| 15 | Ricerca | ✅ | Minore, CF, pratica e contatti/nome dei tutori senza cambiare ordine. |
| 16 | Dettaglio | ✅ | Minore, entrambi i tutori, privacy, stato e branca calcolata. |
| 17 | Modifica | ✅ | Form esplicito, conferma, validazione e autorizzazione server-side. |
| 18 | Cancellazione | ✅ | Conferma e cancellazione transazionale con cascade. |
| 19 | State machine a quattro stati | ✅ | Quattro soli stati e transizioni terminali protette. |
| 20 | Test core | ✅ | Suite Vitest con soglie di coverage all’80%. |

Risultato P0: **20 complete, 0 parziali, 0 mancanti**.

## P1 — Operatività annuale

| # | Task | Stato | Evidenza / lavoro residuo |
|---:|---|:---:|---|
| 21 | Gestione anno associativo | ✅ | Creazione, anno corrente unico e storico. |
| 22 | Config branche | ✅ | Età e ingresso modificabili solo da Admin; colori fissati dal dominio secondo CR-14. |
| 23 | Apertura chiamate | ✅ | Selezione per solo anno di nascita e aggiornamento transazionale. |
| 24 | Nuove iscrizioni eleggibili | ✅ | Inserimento diretto in `DA_CHIAMARE` durante chiamate aperte. |
| 25 | Chiusura chiamate | ✅ | Snapshot prima del reset e residui riportati in attesa. |
| 26 | Statistiche anonime | ✅ | Snapshot aggregati per branca, sesso e anno di nascita. |
| 27 | Gestione Capi | ✅ | Invito, modifica, ruolo, reset ed eliminazione completa. |
| 28 | Inviti 24h | 🟡 | Token, scadenza, monouso e reinvio implementati; consegna reale Gmail non ancora validata. |
| 29 | Reset password | 🟡 | Flusso Better Auth implementato; consegna reale Gmail non ancora validata. |
| 30 | Adapter email | ✅ | Nodemailer/Gmail OAuth 2.0 con TLS e quota persistente; connessione reale verificata e messaggio diagnostico ricevuto con SPF, DKIM e DMARC superati. |
| 31 | Email iscrizione | 🟡 | Outbox, template multipart e invio non bloccante implementati; consegna Gmail non collaudata. |
| 32 | Email accettazione | 🟡 | Outbox, template e invio implementati; consegna Gmail non collaudata. |
| 33 | Email rifiuto | 🟡 | Outbox, template e invio implementati; consegna Gmail non collaudata. |
| 34 | Mailing list | ✅ | Gestione Admin e inclusione dei destinatari nelle email operative. |
| 35 | Import storico | ✅ | CSV/XLSX, dry-run, duplicati e timestamp coperti; import reale completato dopo backup e riconciliato con 151 iscritti e 165 tutori. |
| 36 | Test E2E completi | ✅ | Fixture deterministiche e database isolato coprono iscrizione pubblica, filtri/ordine, ciclo chiamate e matrice STAFF/ADMIN. |

Risultato P1: **11 complete, 5 parziali, 0 mancanti**.

## P2 — Miglioramenti

| # | Task | Stato | Evidenza / lavoro residuo |
|---:|---|:---:|---|
| 37 | Dashboard avanzata | ✅ | Metriche operative globali, più anziani, ultimi iscritti e grafico; la metrica email fallite è stata rimossa dalla CR-03. |
| 38 | Grafico 12 mesi | ✅ | Aggregazione PostgreSQL e grafico responsive. |
| 39 | PWA | ❌ | Manifest, service worker e installabilità non presenti. |
| 40 | Retry email da UI | ❌ | Outbox e stato errore esistono, ma manca l’azione di retry amministrativa. |
| 41 | Cronologia chiamate | ❌ | Le partecipazioni annuali sono persistite, ma manca una cronologia operativa consultabile. |
| 42 | Migliorie accessibilità | 🟡 | Semantica, touch target, reduced motion e Axe sul flusso pubblico presenti; manca un audit completo di tutti i flussi e della navigazione da tastiera. |
| 43 | Migliorie performance | 🟡 | Paginazione, indici e query concorrenti presenti; mancano misurazioni, budget e test di carico. |
| 44 | Configurazioni avanzate | ❌ | Non presenti oltre a branche e mailing list V1. |
| 45 | Template email editabili | ❌ | Contratto dati presente, nessuna gestione template da UI/database. |

Risultato P2: **2 complete, 2 parziali, 5 mancanti**.

## Risultato complessivo

Su 45 task: **33 complete, 7 parziali e 5 mancanti**. Inoltre, le 17 CR successive sono complete.

Ordine consigliato per chiudere il backlog:

1. collaudare sui flussi reali iscrizione, accettazione, rifiuto, invito Capo e reset password, inclusa la gestione dei bounce;
2. aggiungere il retry amministrativo dell'outbox, rigenerando invece token e link per inviti e reset password;
3. proseguire con accessibilità/performance, cronologia chiamate, PWA, configurazioni e template.
