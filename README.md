# CRM Lista d'Attesa — AGESCI Adelfia 1

Applicazione mobile-first per iscrizione pubblica e gestione riservata della lista d'attesa. Implementa il perimetro V1 P0/P1 della specifica: ordine cronologico immutabile, quattro soli stati, ciclo dell'anno associativo, statistiche anonime, Better Auth con RBAC, Power Automate, import e retention.

## Stack

- Next.js 16.3.4 e React 19.2.8
- TypeScript 6.0.3
- Tailwind CSS 4.3.3, componenti in stile shadcn/ui e font Roboto/Roboto Slab self-hosted con Fontsource 5.3.0
- PostgreSQL 18 e Prisma 7.10.0
- Better Auth 1.7.2
- Zod 4.5.4, React Hook Form 7.87.0
- Vitest 4.1.11 e Playwright 1.62.1

TypeScript 7 e Prisma 8 non sono usati nella V1: al momento dell'implementazione non erano compatibili rispettivamente con la toolchain ESLint di Next e con l'adapter Prisma documentato da Better Auth. Le versioni sono bloccate esattamente nel lockfile.

## Avvio locale

Prerequisiti: Node.js 24 LTS o successivo, pnpm 12.3.2 e Docker con Compose.

```powershell
Copy-Item .env.example .env
docker compose up -d
pnpm install
pnpm run prisma:generate
pnpm run db:migrate
pnpm run db:seed
pnpm run admin:bootstrap
pnpm run dev
```

Prima di `db:seed`, valorizzare `PRIVACY_POLICY_VERSION` e `PRIVACY_POLICY_URL` con il documento reale approvato dal Gruppo. `PRIVACY_POLICY_URL` deve essere un URL assoluto che inizi con `http://` o `https://`. Senza una privacy attiva la pagina pubblica resta intenzionalmente bloccata. Prima di `admin:bootstrap`, valorizzare tutti i campi `BOOTSTRAP_ADMIN_*`, inclusa una password di almeno 12 caratteri.

L'applicazione sarà disponibile su `http://localhost:3000`; PostgreSQL locale usa la porta `5432` e le credenziali di sviluppo presenti in `.env.example`.

## Configurazione

I segreti non vanno mai committati. Generare valori indipendenti e casuali di almeno 32 caratteri per:

- `BETTER_AUTH_SECRET`
- `IDENTIFIER_HMAC_KEY`
- `RATE_LIMIT_HMAC_KEY`

`BETTER_AUTH_URL` deve essere l'URL pubblico dell'app. `POWER_AUTOMATE_WEBHOOK_URL` deve essere HTTPS in produzione; se assente, le operazioni restano valide e la consegna viene registrata come fallita. Il payload è documentato in [docs/power-automate.md](docs/power-automate.md).

## Flussi implementati

- Iscrizione pubblica in sei passi, con due tutori, consenso/versione privacy e conferma pratica.
- CF normalizzato, unico e protetto da registro anti-reiscrizione HMAC.
- Rate limiting pubblico persistente: 5 tentativi ogni 15 minuti, senza conservare IP in chiaro.
- Login/logout, sessione di 7 giorni, reset e cambio password, profilo personale.
- Ruoli `ADMIN` (Capo Gruppo) e `STAFF` (Capo), verificati in ogni Server Action.
- Lista filtrabile/paginata e ricerca estesa, sempre ordinata per `createdAt, id` crescente.
- Dettaglio, modifica esplicita, cambio stato e cancellazione con conferma.
- Inviti Capi monouso da 24 ore, reinvio, modifica, reset ed eliminazione completa.
- Anno associativo separato dall'apertura chiamate; candidati calcolati solo dall'anno di nascita.
- Chiusura chiamate con snapshot anonimo precedente al reset degli inevasi.
- Dashboard, storico statistico e mailing list interna.

## Import storico

Il formato e la procedura sono in [docs/importazione-lista-attesa.md](docs/importazione-lista-attesa.md). La simulazione è predefinita:

```powershell
pnpm run import:waiting-list -- .\dati.xlsx --privacy-version=2026.1 --report=report.json
pnpm run import:waiting-list -- .\dati.xlsx --privacy-version=2026.1 --apply --report=report.json
```

## Retention

Anche la retention parte in simulazione. Usa `RETENTION_DAYS`, la massima età configurata e mantiene solo l'HMAC dei rifiutati:

```powershell
pnpm run retention
pnpm run retention -- --apply
```

Programmare il comando in produzione solo dopo aver verificato il report dry-run e il backup.

## Qualità

```powershell
pnpm test
pnpm run test:coverage
pnpm run typecheck
pnpm run lint
pnpm run test:e2e
pnpm audit
```

`pnpm run test:e2e` esegue prima un build di produzione. Gli E2E backoffice richiedono `E2E_ADMIN_EMAIL` e `E2E_ADMIN_PASSWORD` su un database di test isolato. Le evidenze TDD sono riepilogate in [docs/testing/v1-tdd.md](docs/testing/v1-tdd.md).

## Automazione GitHub

I workflow in `.github/workflows` eseguono quality gate, E2E con PostgreSQL isolato, audit delle dipendenze e analisi di sicurezza. Dependabot aggiorna sia pacchetti npm/pnpm sia GitHub Actions sul branch `dev`.

CodeQL e Dependency Review sono predisposti ma si attivano solo impostando la variabile repository `ENABLE_GITHUB_CODE_SECURITY=true`, dopo aver abilitato GitHub Code Security/Advanced Security nelle impostazioni del repository. Le Actions sono bloccate a commit SHA immutabili e aggiornate da Dependabot.

Lo stato puntuale delle task della specifica è documentato in [docs/backlog-p0-p2.md](docs/backlog-p0-p2.md).

## Produzione

1. Configurare PostgreSQL gestito con backup, TLS e utenza a privilegi minimi.
2. Impostare le variabili d'ambiente e il webhook Power Automate.
3. Eseguire `pnpm install --frozen-lockfile`, `pnpm run db:deploy`, `pnpm run db:seed` e `pnpm run build`.
4. Creare il primo Admin una sola volta con `pnpm run admin:bootstrap`.
5. Verificare HTTPS, email, privacy, retention e import su staging prima del go-live.

Le migrazioni versionate sono in `prisma/migrations`. Non usare `prisma migrate dev` in produzione: usare `prisma migrate deploy` (aggiungibile alla pipeline di deploy).
