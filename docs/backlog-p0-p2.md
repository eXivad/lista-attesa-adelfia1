# Audit backlog P0–P2

Audit del 4 settembre 2026 basato sulla specifica funzionale, sul codice, sui test e sulla configurazione locale. Gli stati significano:

- ✅ implementato e verificato in misura adeguata;
- 🟡 implementato in parte oppure non ancora validato end-to-end/operativamente;
- ❌ non implementato.

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
| 12 | Lista cronologica | 🟡 | Ordinamento `createdAt ASC, id ASC` garantito; nella riga/card mancano però sesso e anno di nascita espliciti richiesti dal §24.3. |
| 13 | Filtri | ✅ | Sesso, anno di nascita e stato. |
| 14 | Paginazione | ✅ | Paginazione esplicita da 20 elementi. |
| 15 | Ricerca | ✅ | Minore, CF, pratica e contatti/nome dei tutori senza cambiare ordine. |
| 16 | Dettaglio | ✅ | Minore, entrambi i tutori, privacy, stato e branca calcolata. |
| 17 | Modifica | ✅ | Form esplicito, conferma, validazione e autorizzazione server-side. |
| 18 | Cancellazione | ✅ | Conferma e cancellazione transazionale con cascade. |
| 19 | State machine a quattro stati | ✅ | Quattro soli stati e transizioni terminali protette. |
| 20 | Test core | ✅ | Suite Vitest con soglie di coverage all’80%. |

Risultato P0: **19 complete, 1 parziale, 0 mancanti**.

## P1 — Operatività annuale

| # | Task | Stato | Evidenza / lavoro residuo |
|---:|---|:---:|---|
| 21 | Gestione anno associativo | ✅ | Creazione, anno corrente unico e storico. |
| 22 | Config branche | ✅ | Età, ingresso e colori modificabili solo da Admin. |
| 23 | Apertura chiamate | ✅ | Selezione per solo anno di nascita e aggiornamento transazionale. |
| 24 | Nuove iscrizioni eleggibili | ✅ | Inserimento diretto in `DA_CHIAMARE` durante chiamate aperte. |
| 25 | Chiusura chiamate | ✅ | Snapshot prima del reset e residui riportati in attesa. |
| 26 | Statistiche anonime | ✅ | Snapshot aggregati per branca, sesso e anno di nascita. |
| 27 | Gestione Capi | ✅ | Invito, modifica, ruolo, reset ed eliminazione completa. |
| 28 | Inviti 24h | 🟡 | Token, scadenza, monouso e reinvio implementati; consegna reale non validata senza Power Automate. |
| 29 | Reset password | 🟡 | Flusso Better Auth implementato; consegna reale non validata senza Power Automate. |
| 30 | Adapter Power Automate | 🟡 | Adapter, timeout, HTTPS e test presenti; webhook reale non configurato. |
| 31 | Email iscrizione | 🟡 | Outbox e invio non bloccante implementati; consegna Microsoft 365 non collaudata. |
| 32 | Email accettazione | 🟡 | Outbox e invio implementati; consegna Microsoft 365 non collaudata. |
| 33 | Email rifiuto | 🟡 | Outbox e invio implementati; consegna Microsoft 365 non collaudata. |
| 34 | Mailing list | ✅ | Gestione Admin e inclusione dei destinatari nelle email operative. |
| 35 | Import storico | 🟡 | CSV/XLSX, dry-run, duplicati e timestamp coperti; resta da eseguire e riconciliare il file reale. |
| 36 | Test E2E completi | 🟡 | Iscrizione pubblica, accesso anonimo e navigazione Admin presenti; mancano E2E completi per filtri/ordine, ciclo chiamate e matrice STAFF/ADMIN. |

Risultato P1: **8 complete, 8 parziali, 0 mancanti**.

## P2 — Miglioramenti

| # | Task | Stato | Evidenza / lavoro residuo |
|---:|---|:---:|---|
| 37 | Dashboard avanzata | ✅ | Metriche operative, più anziani, ultimi iscritti ed email fallite. |
| 38 | Grafico 12 mesi | ✅ | Aggregazione PostgreSQL e grafico responsive. |
| 39 | PWA | ❌ | Manifest, service worker e installabilità non presenti. |
| 40 | Retry email da UI | ❌ | Outbox e stato errore esistono, ma manca l’azione di retry amministrativa. |
| 41 | Cronologia chiamate | ❌ | Le partecipazioni annuali sono persistite, ma manca una cronologia operativa consultabile. |
| 42 | Migliorie accessibilità | 🟡 | Semantica, touch target, reduced motion e Axe sulla home presenti; manca un audit completo di tutti i flussi e della navigazione da tastiera. |
| 43 | Migliorie performance | 🟡 | Paginazione, indici e query concorrenti presenti; mancano misurazioni, budget e test di carico. |
| 44 | Configurazioni avanzate | ❌ | Non presenti oltre a branche e mailing list V1. |
| 45 | Template email editabili | ❌ | Contratto dati presente, nessuna gestione template da UI/database. |

Risultato P2: **2 complete, 2 parziali, 5 mancanti**.

## Risultato complessivo

Su 45 task: **29 complete, 11 parziali e 5 mancanti**.

Ordine consigliato per chiudere il backlog:

1. completare la lista P0 mostrando sesso e anno di nascita;
2. completare gli E2E P1 per ordine/filtri, chiamate e RBAC;
3. configurare e collaudare Power Automate/Microsoft 365;
4. eseguire l’import reale con dry-run, backup e riconciliazione;
5. affrontare P2 nell’ordine: retry email, accessibilità/performance, cronologia chiamate, PWA, configurazioni e template.
