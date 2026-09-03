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

Comandi di verifica:

```powershell
npm test
npm run test:coverage
npm run typecheck
npm run lint
npm run test:e2e
```

I test che richiedono PostgreSQL e credenziali reali sono configurati ma devono essere eseguiti su un database di test isolato. Gli E2E backoffice vengono saltati se `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD` non sono presenti.

Ultima verifica locale del 3 settembre 2026 su PostgreSQL 18 isolato:

- 27 file di test e 92 test unitari superati.
- 10 E2E superati su Chromium mobile e desktop, inclusi login backoffice e iscrizione pubblica completa in sei passi.
- Coverage: 93,03% statement, 84,05% branch, 92,07% funzioni e 95,48% linee.
- Build di produzione, ESLint, TypeScript e validazione/migrazioni Prisma superati.
