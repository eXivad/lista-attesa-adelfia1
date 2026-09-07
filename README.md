# Lista d’attesa — AGESCI Adelfia 1

[![CI](https://github.com/eXivad/lista-attesa-adelfia1/actions/workflows/ci.yml/badge.svg)](https://github.com/eXivad/lista-attesa-adelfia1/actions/workflows/ci.yml)

Applicazione web mobile-first per raccogliere e gestire la lista d’attesa di un Gruppo scout AGESCI. Il progetto comprende il modulo pubblico, il backoffice riservato ai Capi, la gestione dell’anno associativo, le statistiche, l’invio email tramite Gmail OAuth 2.0 e gli strumenti amministrativi per importazione e retention.

Il nome e il logo del Gruppo sono configurabili dal backoffice. Visitando `/`, un utente anonimo viene portato direttamente a `/iscrizione`; un utente autenticato viene portato a `/dashboard`.

## Funzionalità principali

- Iscrizione pubblica guidata in sei passaggi con riepilogo e consenso privacy.
- Informativa privacy PDF incorporata nel passaggio di accettazione, con versioni gestite dal backoffice.
- Lista rigorosamente cronologica, paginata, filtrabile e ricercabile.
- Dettaglio e modifica dei dati di minore e genitori/tutori.
- Stati `IN_ATTESA`, `DA_CHIAMARE`, `ACCETTATO` e `RIFIUTATO` con transizioni controllate.
- Gestione dell’anno associativo, apertura/chiusura chiamate e configurazione delle branche.
- Statistiche annuali anonime e dashboard operativa.
- Autenticazione email/password, ruoli `ADMIN` e `STAFF`, inviti e recupero password.
- Email transazionali con Nodemailer, Gmail SMTP e OAuth 2.0.
- Limite giornaliero prudenziale degli invii registrato su PostgreSQL.
- Importazione CSV/XLSX completa o storica con dry-run, rilevamento duplicati e transazione atomica.
- Retention configurabile con modalità dry-run.
- Branding dinamico con nome e logo del Gruppo.

Lo stato dettagliato di P0, P1 e P2 è disponibile in [docs/backlog-p0-p2.md](docs/backlog-p0-p2.md).

## Stack

| Area | Tecnologia |
|---|---|
| Applicazione | Next.js 16.3.4, React 19.2.8, TypeScript 6.0.3 |
| UI | Tailwind CSS 4.3.3, Radix UI, componenti in stile shadcn/ui |
| Form e validazione | React Hook Form 7.87.0, Zod 4.5.4 |
| Database | PostgreSQL 18, Prisma 7.10.0, adapter `pg` |
| Autenticazione | Better Auth 1.7.2 |
| Email | Nodemailer 10.0.0, Gmail SMTP OAuth 2.0 |
| Test | Vitest 4.1.11, Playwright 1.62.1, axe-core |
| Package manager | pnpm 12.3.2 |

Le versioni sono bloccate nel lockfile per rendere installazione e CI riproducibili.

## Struttura del progetto

```text
app/                    Route, layout, Route Handler e Server Action Next.js
components/             Componenti React e UI riutilizzabile
lib/server/             Composizione server, sessione, ambiente e servizi
lib/security/           Rate limiting e primitive di sicurezza
modules/                Dominio, schemi Zod e casi d’uso
providers/              Adapter esterni, incluso Gmail SMTP
repositories/prisma/    Persistenza PostgreSQL tramite Prisma
prisma/                 Schema, migrazioni e seed
scripts/                Comandi amministrativi
e2e/                    Test end-to-end Playwright
docs/                   Specifiche e guide operative
```

L’applicazione usa una separazione tra dominio, repository e provider per limitare la dipendenza da Prisma, Gmail e dalla piattaforma di hosting.

## Prerequisiti

Per lo sviluppo locale servono:

- Git;
- Node.js `>= 24.15.0`;
- pnpm `12.3.2`;
- Docker Desktop o un’installazione Docker con Compose.

Verificare le versioni:

```powershell
node --version
pnpm --version
docker --version
docker compose version
```

Se pnpm non è installato, seguire la [documentazione ufficiale di pnpm](https://pnpm.io/installation) e installare la versione dichiarata nel campo `packageManager` di `package.json`.

## Avvio locale da zero

### 1. Clonare il repository

```powershell
git clone https://github.com/eXivad/lista-attesa-adelfia1.git
Set-Location lista-attesa-adelfia1
```

### 2. Installare le dipendenze

```powershell
pnpm install --frozen-lockfile
```

pnpm applica una finestra di sicurezza di 24 ore alle nuove release. L’eccezione puntuale presente in `pnpm-workspace.yaml` riguarda una versione già verificata e bloccata nel lockfile.

### 3. Creare la configurazione locale

```powershell
Copy-Item .env.example .env
```

Aprire `.env` e valorizzare almeno:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/adelfia_waiting_list?schema=public"
DIRECT_URL=""
DATABASE_POOL_MAX="10"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="..."
IDENTIFIER_HMAC_KEY="..."
RATE_LIMIT_HMAC_KEY="..."

BOOTSTRAP_ADMIN_FIRST_NAME="..."
BOOTSTRAP_ADMIN_LAST_NAME="..."
BOOTSTRAP_ADMIN_EMAIL="..."
BOOTSTRAP_ADMIN_MEMBER_CODE="..."
BOOTSTRAP_ADMIN_PASSWORD="..."
```

Generare tre segreti indipendenti, uno per ciascuna variabile `*_SECRET`/`*_KEY`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Non riutilizzare lo stesso valore. La password dell’amministratore deve contenere almeno 12 caratteri.

### 4. Avviare PostgreSQL

```powershell
docker compose up -d
docker compose ps
```

Il container usa PostgreSQL sulla porta locale `5432` e conserva i dati nel volume Docker `adelfia-postgres`.

### 5. Preparare il database

```powershell
pnpm run prisma:generate
pnpm run db:deploy
pnpm run db:seed
pnpm run admin:bootstrap
```

- `db:deploy` applica le migrazioni già versionate.
- `db:seed` crea o aggiorna la configurazione predefinita delle branche.
- `admin:bootstrap` crea il primo Capo Gruppo e va eseguito una sola volta.

Per creare nuove migrazioni durante lo sviluppo usare `pnpm run db:migrate`. Non usare `prisma migrate reset` su database contenenti dati utili: cancella l’intero schema.

### 6. Avviare Next.js in modalità sviluppo

```powershell
pnpm run dev
```

Indirizzi principali:

| URL | Uso |
|---|---|
| `http://localhost:3000/` | Redirect automatico in base alla sessione |
| `http://localhost:3000/iscrizione` | Iscrizione pubblica |
| `http://localhost:3000/login` | Accesso Capi |
| `http://localhost:3000/dashboard` | Backoffice autenticato |

Interrompere Next.js con `Ctrl+C`. Per fermare PostgreSQL senza cancellare i dati:

```powershell
docker compose stop
```

### 7. Completare la prima configurazione

Dopo il primo accesso come `ADMIN`:

1. aprire **Impostazioni** e configurare nome e logo del Gruppo;
2. aprire **Impostazioni → Informativa privacy**;
3. aggiungere versione e URL HTTPS diretto del PDF approvato;
4. rendere attiva la versione;
5. configurare la mailing list interna;
6. creare l’anno associativo quando necessario.

Fino alla pubblicazione di un’informativa attiva, il modulo pubblico non accetta dati personali.

## Variabili d’ambiente

Tutte le variabili sono documentate in [.env.example](.env.example). I valori reali devono rimanere in `.env` locale o nel secret manager della piattaforma.

| Variabile | Scopo | Necessaria |
|---|---|:---:|
| `DATABASE_URL` | Connessione PostgreSQL usata dall’applicazione e da Prisma | Sì |
| `DIRECT_URL` | Connessione diretta/session per migrazioni e backup; usa `DATABASE_URL` se vuota | Solo produzione serverless |
| `DATABASE_CA_CERT` | Certificato CA PEM del provider per verificare la connessione TLS; accetta righe reali o `\n` | Produzione gestita |
| `DATABASE_POOL_MAX` | Connessioni massime aperte da ogni istanza dell’app | No, default `10` |
| `TEST_DATABASE_URL` | Database separato per test distruttivi | Solo E2E |
| `BETTER_AUTH_URL` | URL pubblico dell’applicazione | Sì |
| `BETTER_AUTH_SECRET` | Firma e sicurezza Better Auth | Sì |
| `IDENTIFIER_HMAC_KEY` | Hash anti-reiscrizione dei Codici Fiscali | Sì |
| `RATE_LIMIT_HMAC_KEY` | Hash degli identificatori del rate limiter | Sì |
| `GMAIL_USER` | Account Gmail mittente | Per le email |
| `GMAIL_OAUTH_CLIENT_ID` | Client OAuth Google | Per le email |
| `GMAIL_OAUTH_CLIENT_SECRET` | Client secret OAuth Google | Per le email |
| `GMAIL_OAUTH_REFRESH_TOKEN` | Refresh token dell’account mittente | Per le email |
| `GMAIL_DAILY_RECIPIENT_LIMIT` | Tetto prudenziale in 24 ore | No, default `450` |
| `GMAIL_MAX_RECIPIENTS_PER_MESSAGE` | Destinatari massimi per messaggio | No, default `20` |
| `MAIL_FROM_NAME` | Nome visualizzato del mittente | No |
| `MAIL_REPLY_TO` | Casella monitorata per le risposte | No |
| `MAIL_TEST_RECIPIENT` | Destinatario del solo comando di test | Solo test email |
| `BOOTSTRAP_ADMIN_*` | Creazione iniziale dell’amministratore | Solo bootstrap |
| `IMPORT_TIMEZONE` | Fuso dei timestamp storici | No, default `Europe/Rome` |
| `RETENTION_DAYS` | Giorni di conservazione dopo lo stato terminale | No, default `365` |
| `E2E_*` | Fixture e protezioni dei test Playwright | Solo E2E |

In produzione impostare sempre `E2E_ALLOW_RESET=false`.

## Script disponibili

| Comando | Descrizione |
|---|---|
| `pnpm run dev` | Server di sviluppo Next.js |
| `pnpm run build` | Generazione Prisma e build di produzione |
| `pnpm run start` | Avvio della build di produzione |
| `pnpm run lint` | Analisi ESLint |
| `pnpm run typecheck` | Controllo TypeScript senza emissione |
| `pnpm test` | Suite Vitest |
| `pnpm run test:watch` | Vitest in modalità watch |
| `pnpm run test:coverage` | Test con soglie di copertura |
| `pnpm run test:e2e` | Build ed E2E Playwright |
| `pnpm run test:e2e:ui` | E2E con interfaccia Playwright |
| `pnpm run prisma:generate` | Generazione del client Prisma |
| `pnpm run prisma:validate` | Validazione dello schema Prisma |
| `pnpm run db:migrate` | Creazione/applicazione migrazioni di sviluppo |
| `pnpm run db:deploy` | Applicazione migrazioni versionate |
| `pnpm run db:seed` | Seed idempotente delle branche |
| `pnpm run admin:bootstrap` | Creazione iniziale del primo Admin |
| `pnpm run import:waiting-list` | Dry-run/import CSV o XLSX |
| `pnpm run verify:waiting-list` | Riepilogo aggregato privo di dati personali |
| `pnpm run mail:verify` | Verifica TLS e OAuth Gmail senza invio |
| `pnpm run mail:test` | Invio esplicito di una singola email diagnostica |
| `pnpm run retention` | Dry-run o applicazione della retention |

## Gmail SMTP e OAuth 2.0

La configurazione completa, le quote prudenziali, il collaudo e le accortezze di deliverability sono descritte in [docs/email-gmail-oauth2.md](docs/email-gmail-oauth2.md).

Dopo aver inserito le credenziali esclusivamente in `.env`:

```powershell
pnpm run mail:verify
pnpm run mail:test
```

Il primo comando non invia messaggi. Prima del secondo, impostare `MAIL_TEST_RECIPIENT` su una casella controllata personalmente.

## Importazione della lista d’attesa

La procedura completa e il formato sono descritti in [docs/importazione-lista-attesa.md](docs/importazione-lista-attesa.md). Il template privo di dati reali è [docs/import-template.csv](docs/import-template.csv).

Import completo con consenso e versione privacy:

```powershell
pnpm run import:waiting-list -- .\dati.xlsx --privacy-version=2026.1 --report=reports/import-preview.json
pnpm run import:waiting-list -- .\dati.xlsx --privacy-version=2026.1 --apply --report=reports/import-result.json
```

Import storico con campi mancanti e consenso non registrato:

```powershell
pnpm run import:waiting-list -- .\dati-storici.csv --legacy --report=reports/import-preview.json
pnpm run import:waiting-list -- .\dati-storici.csv --legacy --apply --report=reports/import-result.json
pnpm run verify:waiting-list -- --expected=151
```

Il dry-run è predefinito. Con `--apply`, una sola riga invalida o duplicata blocca l’intero lotto. Non inserire mai file con dati reali in Git.

## Retention

La retention parte sempre in simulazione:

```powershell
pnpm run retention
pnpm run retention -- --apply
```

Prima di usare `--apply`, verificare il report e creare un backup del database. Per i record rifiutati viene conservato soltanto l’HMAC del Codice Fiscale quando disponibile.

## Test e qualità

Controlli ordinari:

```powershell
pnpm run prisma:validate
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run test:coverage
pnpm run build
```

Gli E2E modificano e ricreano dati. Devono usare esclusivamente un database il cui nome termina con `_test` o `_ci`; l’endpoint di reset rifiuta altri nomi.

Per un database E2E locale:

```powershell
docker compose exec postgres createdb -U postgres adelfia_waiting_list_test
```

Configurare le variabili `E2E_*`, impostare il processo Next.js sul database di test e solo allora eseguire:

```powershell
pnpm run test:e2e
```

Non eseguire Playwright puntando al database di sviluppo o produzione. Le evidenze dei test sono raccolte in [docs/testing/v1-tdd.md](docs/testing/v1-tdd.md).

## CI e flusso Git

Il progetto usa GitHub Flow:

1. creare un branch da `dev`;
2. sviluppare e verificare localmente;
3. aprire una pull request verso `main` per il rilascio;
4. attendere il completamento dei quality gate;
5. unire la PR soltanto se `main` resta distribuibile.

Le GitHub Actions vengono eseguite esclusivamente sulle pull request verso `main`, evitando consumo di risorse a ogni push. I workflow includono lint, typecheck, test, coverage, build, PostgreSQL isolato, E2E e audit delle dipendenze. Dependabot propone aggiornamenti sul branch `dev`.

CodeQL e Dependency Review richiedono la variabile repository `ENABLE_GITHUB_CODE_SECURITY=true` e le relative funzionalità abilitate nelle impostazioni GitHub.

## Preparazione al deploy

Il repository non è ancora legato a un provider specifico. La piattaforma scelta deve offrire:

- runtime Node.js compatibile con la versione dichiarata in `package.json`;
- supporto completo a Next.js App Router e Server Actions;
- connessioni PostgreSQL TLS, preferibilmente tramite pooler per workload serverless;
- traffico TCP in uscita verso `smtp.gmail.com:465`;
- secret manager per tutte le variabili sensibili;
- HTTPS e dominio stabile per `BETTER_AUTH_URL`;
- rispetto di `Cache-Control`, `ETag` e query string per il logo versionato.

Per un runtime serverless, `DATABASE_URL` deve usare il pooler transaction del provider e `DATABASE_POOL_MAX` deve iniziare da un valore prudenziale, normalmente `1`. `DIRECT_URL` deve invece usare una connessione diretta o un pooler session compatibile con migrazioni, `pg_dump` e `pg_restore`.

Con Supabase abilita l'enforcement SSL, usa `sslmode=verify-full` nelle URL e valorizza `DATABASE_CA_CERT` con il certificato CA scaricato da **Project Settings > Database > SSL Configuration**. L'applicazione passa la CA direttamente a `node-postgres`, mantenendo attive sia la verifica della catena sia quella dell'hostname.

Sequenza di rilascio consigliata:

1. creare PostgreSQL gestito con backup automatici;
2. configurare variabili e segreti nell’ambiente di staging;
3. eseguire una sola volta `pnpm run db:deploy` e `pnpm run db:seed`;
4. eseguire `pnpm run build` e distribuire l’applicazione;
5. creare il primo Admin con `pnpm run admin:bootstrap`, poi rimuovere dalla piattaforma la password di bootstrap;
6. configurare branding, privacy e destinatari dal backoffice;
7. verificare login, iscrizione, PDF privacy e tutti i flussi email;
8. verificare che `GET /api/health` risponda `200` senza essere memorizzato in cache;
9. importare eventuali dati reali solo dopo backup e dry-run;
10. promuovere lo stesso commit in produzione;
11. conservare il deployment precedente per un rollback rapido.

Le migrazioni non devono essere lanciate contemporaneamente da più istanze dell’applicazione. Usare una fase di rilascio o un job amministrativo separato. Nodemailer e Prisma richiedono un runtime Node.js: non distribuire questi percorsi su un runtime Edge.

## Cache

- Gli asset `/_next/static` possono essere memorizzati a lungo dal CDN.
- Il logo usa URL versionato, `Cache-Control: immutable` ed `ETag`.
- Branding e informativa attiva usano la Data Cache Next.js per cinque minuti e vengono invalidati dopo le modifiche.
- Sessioni, risposte autenticate e dati personali non devono essere inseriti in cache CDN condivise.

Con più repliche, la piattaforma deve offrire una Data Cache condivisa oppure si accetta una convergenza massima di cinque minuti tra istanze.

## Sicurezza e dati personali

- Non committare `.env`, token OAuth, dump, report o export della lista d’attesa.
- I file reali devono rimanere fuori dal repository anche quando il repository è privato.
- `.gitignore` esclude gli export `docs/import-*`, le cartelle `data/`, `backups/`, `reports/` e i file `*.dump`.
- Le variabili sensibili sono validate lato server e non hanno prefisso `NEXT_PUBLIC_`.
- Il rate limiting non conserva IP in chiaro.
- Le email multiple usano BCC e non espongono i destinatari.
- Prima di rendere pubblico il repository, controllare anche issue, PR, Actions artifacts e cronologia GitHub.

La pubblicazione del codice non rende pubblicabili i dati reali trattati dall’applicazione. Chi distribuisce il progetto deve predisporre informativa, base giuridica, autorizzazioni, backup, retention e procedure di gestione degli interessati adeguate al proprio contesto.

## Documentazione

- [Specifica funzionale e tecnica](Specifica_Funzionale_Tecnica_Lista_Attesa_AGESCI_Adelfia1.md)
- [Change Request V1](CR_Lista_Attesa_AGESCI_Adelfia1_v1.md)
- [Stato backlog P0–P2](docs/backlog-p0-p2.md)
- [Gmail SMTP OAuth 2.0](docs/email-gmail-oauth2.md)
- [Importazione lista d’attesa](docs/importazione-lista-attesa.md)
- [Evidenze TDD](docs/testing/v1-tdd.md)

## Licenza

Il repository non contiene ancora un file `LICENSE`. Rendere pubblico il codice non concede automaticamente diritti di utilizzo, modifica o redistribuzione. Prima di accettare contributi o permettere il riuso, scegliere e aggiungere una licenza coerente con le esigenze del Gruppo.
