# Evidenze TDD V1

Lo sviluppo ha seguito cicli RED → GREEN → verifica. I test sono stati creati prima dei moduli corrispondenti; le prime esecuzioni fallivano con `Cannot find module`, quindi sono state introdotte le implementazioni minime e rifinite.

Copertura funzionale principale:

- Codice Fiscale, età, numero pratica, branche e macchina a quattro stati.
- Schema iscrizione e modifica, due tutori A/B e privacy.
- Registrazione, duplicati/blocchi HMAC, outbox e fallimento email non distruttivo.
- Query lista con ordine cronologico invariabile.
- Modifica, cancellazione, compare-and-set e transizioni terminali.
- Creazione anno, apertura, nuova iscrizione durante chiamate e chiusura con snapshot prima del reset.
- Configurazione branche, inviti Capo, rate limiting, dashboard, import e retention.
- Contratto Power Automate e componenti principali di login/iscrizione.
- Campi di residenza, dashboard globale, lista arricchita e colori branca fissi introdotti dalle CR.
- Dialog di conferma, navigazione responsive, autorizzazioni STAFF/ADMIN e branding configurabile.

Comandi di verifica:

```powershell
pnpm test
pnpm run test:coverage
pnpm run typecheck
pnpm run lint
pnpm run test:e2e
```

I test che richiedono PostgreSQL devono essere eseguiti su un database di test isolato. Gli E2E backoffice vengono saltati se `E2E_RESET_SECRET`, `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD` non sono presenti; la matrice STAFF richiede anche le variabili `E2E_STAFF_*`. L'endpoint fixture richiede `E2E_ALLOW_RESET=true`, è protetto dal secret e rifiuta database il cui nome non termina con `_test` o `_ci`.

Ultima verifica locale del 5 settembre 2026 su PostgreSQL 18 isolato:

- 33 file di test e 121 test unitari/integrativi superati.
- 12 E2E superati su Chromium mobile e desktop; 2 casi mutanti sono saltati intenzionalmente sul progetto mobile ed eseguiti una volta su desktop.
- Gli E2E coprono iscrizione pubblica, filtri/ricerca/paginazione e ordine stabile, ciclo completo chiamate e autorizzazioni STAFF/ADMIN.
- Coverage: 93,29% statement, 85,19% branch, 92,45% funzioni e 95,50% linee.
- Build di produzione, ESLint, TypeScript e validazione/migrazioni Prisma superati.
