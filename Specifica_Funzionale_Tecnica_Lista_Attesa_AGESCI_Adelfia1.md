# Specifica Funzionale e Tecnica — CRM Lista d'Attesa AGESCI Adelfia 1

**Versione:** 1.0  
**Stato:** Specifica pronta per implementazione da parte di coding agent  
**Obiettivo:** fornire una descrizione completa, coerente e sufficientemente dettagliata per avviare lo sviluppo senza lasciare decisioni funzionali rilevanti all'agente.

---

# 1. Scopo del progetto

L'applicazione è un CRM web per la gestione della lista d'attesa di nuovi soci del gruppo scout **AGESCI Adelfia 1**.

Il sistema deve permettere di:

- raccogliere nuove iscrizioni alla lista d'attesa tramite un form pubblico;
- conservare e consultare i dati dei minori e dei relativi genitori/tutori;
- ordinare rigidamente la lista secondo data e ora di iscrizione;
- filtrare e cercare gli iscritti senza mai alterare l'ordine della lista;
- gestire lo stato di ogni iscritto;
- gestire l'apertura e la chiusura delle chiamate per ogni anno associativo;
- gestire gli utenti Capo e Capo Gruppo;
- inviare email tramite l'account istituzionale Microsoft 365 del gruppo;
- produrre statistiche anonime aggregate sugli esiti delle chiamate annuali;
- mantenere l'applicazione semplice da usare soprattutto su smartphone e tablet;
- mantenere il codice il più possibile indipendente da provider esterni specifici.

L'applicazione è destinata principalmente a Capi scout con competenze informatiche di base.

---

# 2. Attori e ruoli

## 2.1 Capo Gruppo / Admin

Il Capo Gruppo possiede tutti i permessi dei Capi e in aggiunta può:

- gestire gli utenti Capo;
- creare un nuovo anno associativo;
- aprire le chiamate;
- chiudere le chiamate;
- gestire la mailing list dei destinatari interni;
- modificare la configurazione delle età/branche;
- accedere alle statistiche annuali;
- gestire i template/configurazioni amministrative previste in futuro.

Il Capo Gruppo svolge comunque servizio in branca e quindi deve poter usare tutte le normali funzioni operative disponibili ai Capi.

## 2.2 Capo

Il Capo può:

- autenticarsi nel backoffice;
- vedere tutti gli iscritti, indipendentemente dalla branca;
- filtrare e cercare gli iscritti;
- aprire la scheda dettaglio;
- modificare i dati anagrafici;
- cambiare lo stato dell'iscritto;
- cancellare un iscritto;
- vedere dashboard e metriche operative.

Non esiste un vincolo per cui un Capo L/C possa vedere solo L/C, ecc.

## 2.3 Genitore / Tutore legale

Il genitore non possiede un account.

Può accedere solo al form pubblico di iscrizione e compilare i dati richiesti per il minore.

Per la V1:

- sono richiesti obbligatoriamente i dati di **due genitori/tutori**;
- non è previsto il caso di singolo tutore;
- non è previsto un portale self-service del genitore;
- non è prevista la modifica autonoma dei dati dopo l'invio.

---

# 3. Stack tecnologico

## 3.1 Scelta architetturale

La soluzione deve essere sviluppata come applicazione full-stack unica basata su:

- **Next.js**
- **React**
- **TypeScript**

Motivazioni:

- semplicità di manutenzione;
- unico repository;
- unica codebase;
- minore complessità di deployment;
- sufficiente per il volume previsto;
- possibilità di mantenere comunque separati dominio, infrastruttura e UI.

Non è necessario utilizzare React/Vite + NestJS separati nella V1.

## 3.2 Stack proposto

| Area | Tecnologia |
|---|---|
| Framework | Next.js |
| Linguaggio | TypeScript |
| UI | React |
| CSS | Tailwind CSS |
| Componenti UI | shadcn/ui |
| Form | React Hook Form |
| Validazione | Zod |
| Auth | Better Auth |
| ORM | Prisma |
| Database | PostgreSQL |
| Test unitari/integration | Vitest |
| Test E2E | Playwright |
| Email | adapter astratto + Power Automate in V1 |
| Hosting | provider gratuito da scegliere in fase deployment |
| PWA | post-V1 / priorità P2 |

## 3.3 Principio di indipendenza tecnologica

L'applicazione deve evitare dipendenze dirette non necessarie da:

- Supabase;
- Power Automate;
- provider email specifico;
- provider auth specifico;
- vendor hosting specifico.

### Database

L'applicazione userà PostgreSQL nella V1, preferibilmente su un piano gratuito come Supabase o equivalente.

Il codice applicativo non deve dipendere direttamente da API proprietarie Supabase.

Flusso desiderato:

```text
Business Logic
      ↓
Repository / Data Access Layer
      ↓
Prisma
      ↓
PostgreSQL
      ↓
Provider DB
```

Il cambio di provider PostgreSQL deve essere il più semplice possibile.

Non è richiesto garantire migrazione immediata e trasparente verso MySQL o SQLite; è invece richiesto evitare accoppiamenti inutili.

### Email

La business logic non deve conoscere Power Automate.

Definire un contratto simile a:

```ts
interface MailProvider {
  sendRegistrationConfirmation(input: RegistrationMailInput): Promise<void>;
  sendAcceptanceConfirmation(input: StatusMailInput): Promise<void>;
  sendRejectionConfirmation(input: StatusMailInput): Promise<void>;
  sendStaffInvitation(input: StaffInvitationMailInput): Promise<void>;
  sendPasswordReset(input: PasswordResetMailInput): Promise<void>;
}
```

Implementazione V1:

```text
PowerAutomateMailProvider
```

In futuro dovrà poter essere sostituita da:

```text
MicrosoftGraphMailProvider
```

o altro provider senza modificare la business logic.

---

# 4. Identità visiva AGESCI

## 4.1 Palette principale

### Viola AGESCI

| Nome | HEX |
|---|---|
| Viola 950 | `#211638` |
| Viola 800 | `#462678` |
| Viola 600 | `#6B478D` |
| Viola 300 | `#AEB0D9` |

### Bianco / Nero

- Nero
- Bianco

## 4.2 Colori branche

| Branca | Colore | HEX |
|---|---|---|
| L/C | Giallo | `#FDC500` |
| E/G | Verde | `#21A067` |
| R/S | Rosso | `#E74030` |
| Co.Ca. | Viola | `#9B66A5` |

## 4.3 Colori secondari

| Nome | HEX |
|---|---|
| Azzurro | `#92B3D7` |
| Beige | `#E5D6C7` |
| Grigio chiaro | `#ECE9E6` |

## 4.4 Font

Font ufficiali da utilizzare:

- **Roboto** per UI, form, tabelle, pulsanti, navigazione e testo;
- **Roboto Slab** per titoli principali e heading selezionati;
- **Tahoma** come fallback di sistema se necessario.

## 4.5 Linee guida UI

L'interfaccia deve essere:

- mobile-first;
- semplice;
- leggibile;
- poco affollata;
- coerente;
- con azioni pericolose sempre confermate;
- con colori di stato comprensibili;
- con form suddivisi in step;
- con componenti grandi abbastanza per touch su smartphone e tablet.

La priorità dispositivi è:

1. smartphone;
2. tablet;
3. desktop.

---

# 5. Modello concettuale del dominio

Le entità principali sono:

- User
- Applicant / WaitingListEntry
- Guardian
- AssociativeYear
- AnnualStatistics
- MailingRecipient / MailingConfiguration
- PrivacyPolicyVersion
- BlockedIdentifier
- Configuration

La branca non deve essere salvata come dato permanente dell'iscritto: deve essere calcolata dinamicamente.

---

# 6. Iscrizione pubblica

## 6.1 Accesso

Il form è pubblico e non richiede autenticazione.

## 6.2 Struttura a step

Il flusso consigliato è:

### Step 1 — Dati del minore

Campi:

- Nome
- Cognome
- Sesso
- Data di nascita
- Luogo di nascita
- Provincia di nascita
- Codice Fiscale
- Note

### Step 2 — Genitore A

Campi obbligatori:

- Nome
- Cognome
- Luogo di nascita
- Provincia di nascita
- Data di nascita
- Codice Fiscale
- Indirizzo di residenza
- Comune di residenza
- Provincia di residenza
- Email
- Cellulare

### Step 3 — Genitore B

Stessi campi del Genitore A.

Tutti obbligatori nella V1.

### Step 4 — Privacy

Mostrare:

- informativa privacy;
- versione dell'informativa;
- checkbox obbligatoria di accettazione.

Registrare:

- `privacyAccepted`
- `privacyAcceptedAt`
- `privacyPolicyVersion`

Non è necessario registrare IP o user agent nella V1.

### Step 5 — Riepilogo

Mostrare tutti i dati inseriti e richiedere conferma finale.

### Step 6 — Conferma iscrizione

Mostrare:

- messaggio di successo;
- identificativo pubblico della pratica.

Esempio:

```text
LA-2026-000123
```

Inviare lo stesso identificativo nella mail.

---

# 7. Codice Fiscale

## 7.1 Regola V1

Per la V1 si utilizza il solo Codice Fiscale italiano.

Non sono previsti documenti esteri alternativi.

Il sistema non deve effettuare controlli fiscali complessi.

## 7.2 Normalizzazione

Prima del salvataggio:

- trim spazi;
- conversione in maiuscolo;
- eventuale rimozione spazi interni accidentali.

## 7.3 Validazione

Controllo minimale:

- campo obbligatorio;
- 16 caratteri alfanumerici.

Non verificare:

- corrispondenza con nome;
- corrispondenza con data;
- comune catastale;
- checksum fiscale;
- validità fiscale reale.

## 7.4 Unicità

Il CF del minore deve essere univoco tra gli iscritti attivi.

Se esiste già:

```text
Questo ragazzo risulta già registrato nella lista d'attesa.
Contattare il Gruppo o i Capi Gruppo per maggiori informazioni.
```

Non creare un nuovo record.

---

# 8. Età ammesse

Non esiste una vera età minima, purché il minore sia già nato.

Età massima: **21 anni**.

Il sistema deve impedire nuove iscrizioni con età superiore a 21 anni.

Deve essere prevista una procedura di pulizia periodica per gli iscritti che raggiungono/superano il limite previsto dalla policy.

---

# 9. Campo note

È previsto un unico campo libero `note`.

Testo suggerito per il form:

> Indicare eventuale provenienza da altro gruppo scout, presenza di fratelli o sorelle nel gruppo, residenza fuori paese o altre informazioni utili.

Il campo non deve determinare automaticamente stati o priorità.

---

# 10. Identificatori

## 10.1 ID tecnico

Ogni iscritto possiede un ID tecnico interno, preferibilmente UUID/CUID.

Non viene normalmente mostrato agli utenti.

## 10.2 Numero iscrizione pubblico

Ogni nuova iscrizione genera un identificatore del tipo:

```text
LA-2026-000123
```

Serve per:

- conferma al genitore;
- supporto;
- ricerca interna;
- comunicazioni.

Non determina la posizione in lista.

## 10.3 Ordine della lista

L'ordine è determinato esclusivamente da:

```sql
ORDER BY createdAt ASC, id ASC
```

`createdAt` deve essere server-side.

L'utente non deve poterlo modificare.

---

# 11. Regola assoluta dell'ordine

Questa è una delle invarianti più importanti del sistema.

L'ordine della lista d'attesa deve essere sempre cronologico.

Nessun utente, nemmeno il Capo Gruppo, può cambiare manualmente la priorità.

Sono vietate funzioni come:

- drag & drop di riordino;
- priorità manuale;
- ordinamento alfabetico;
- ordinamento per stato;
- ordinamento per anno;
- ordinamento per branca.

I filtri e la ricerca riducono il dataset visualizzato ma non modificano l'ordinamento.

Esempio:

Filtro:

```text
Sesso = Maschio
Anno nascita = 2018
Stato = IN_ATTESA
```

Risultato:

```text
1. Mario Rossi
2. Luca Bianchi
3. ...
```

La numerazione visualizzata è relativa al risultato filtrato.

---

# 12. Stati dell'iscritto

Gli stati previsti sono esattamente quattro:

```text
IN_ATTESA
DA_CHIAMARE
ACCETTATO
RIFIUTATO
```

Non introdurre nella V1:

- CONTATTATO
- DA_RICHIAMARE
- NON_RISPONDE
- altri stati.

## 12.1 Stato iniziale

Per default una nuova iscrizione entra in:

```text
IN_ATTESA
```

Eccezione: se le chiamate dell'anno associativo corrente sono aperte e il ragazzo appartiene a uno degli anni di ingresso calcolati, entra direttamente in:

```text
DA_CHIAMARE
```

---

# 13. Transizioni di stato

## 13.1 In Attesa → Da Chiamare

Può avvenire:

- automaticamente all'apertura delle chiamate;
- automaticamente per nuove iscrizioni eleggibili durante chiamate aperte;
- manualmente da parte di un Capo.

La modifica manuale serve per recuperare ragazzi di anni precedenti se occorre coprire posti liberi.

## 13.2 Da Chiamare → Accettato

Consentita ai Capi.

Richiede conferma esplicita.

Dopo conferma:

- aggiornare lo stato;
- inviare email ai genitori;
- aggiornare i conteggi utili all'anno associativo.

## 13.3 Da Chiamare → Rifiutato

Consentita ai Capi.

Richiede conferma esplicita.

Dopo conferma:

- aggiornare lo stato;
- inviare email ai genitori;
- aggiornare i conteggi.

## 13.4 Da Chiamare → In Attesa

Avviene automaticamente alla chiusura delle chiamate per gli iscritti rimasti non gestiti.

Può anche essere previsto manualmente solo se coerente con la gestione operativa, ma la specifica principale richiede almeno la transizione automatica alla chiusura.

## 13.5 Accettato

Una volta Accettato:

- non può tornare Rifiutato tramite normale cambio stato;
- se la famiglia rinuncia successivamente, il record viene eliminato secondo la policy del gruppo.

## 13.6 Rifiutato

Una volta Rifiutato:

- non può tornare In Attesa;
- resta Rifiutato fino alla cancellazione prevista dalla retention.

---

# 14. Cancellazione iscritti

I Capi e i Capi Gruppo possono cancellare un iscritto.

L'azione deve essere pericolosa e richiedere conferma.

Non è obbligatorio inviare una mail di cancellazione.

Le sole email obbligatorie relative all'iscritto sono:

- avvenuta iscrizione;
- accettazione;
- rifiuto.

## 14.1 Retention

Dopo circa un anno da Accettato/Rifiutato i dati personali devono essere eliminati.

Gli iscritti che raggiungono il limite massimo di età devono essere eliminati secondo la policy.

## 14.2 Anti-reiscrizione

Per evitare che un ragazzo Rifiutato venga reiscritto contro la policy interna, è previsto un registro separato di identificatori bloccati.

Per ridurre i dati personali conservati, salvare preferibilmente un hash/HMAC del Codice Fiscale invece del CF in chiaro.

Entità suggerita:

```text
BlockedIdentifier
- id
- identifierHash
- reason
- createdAt
```

Prima di accettare una nuova iscrizione:

1. normalizzare il CF;
2. calcolare l'hash/HMAC;
3. verificare se è presente tra gli identificatori bloccati;
4. se presente, impedire la nuova iscrizione.

---

# 15. Branche

Configurazione attuale:

| Branca | Età |
|---|---|
| L/C | 8–11 |
| E/G | 12–15 |
| R/S | 16–21 |

La branca deve essere calcolata dinamicamente e non memorizzata come attributo statico del ragazzo.

Le soglie devono essere configurabili dal Capo Gruppo.

---

# 16. Regola di ingresso per anno associativo

L'ingresso automatico nelle chiamate usa esclusivamente l'anno di nascita.

Esempio anno associativo:

```text
2026/2027
```

Candidati automatici:

```text
L/C → nati nel 2018
E/G → nati nel 2014
R/S → nati nel 2010
```

Non conta il giorno o il mese di nascita.

Formula concettuale:

```text
annoIngressoLC = startYear - 8
annoIngressoEG = startYear - 12
annoIngressoRS = startYear - 16
```

---

# 17. Anno associativo

L'anno associativo è una vera entità di dominio.

Campi suggeriti:

```text
AssociativeYear
- id
- label               // "2026/2027"
- startYear           // 2026
- endYear             // 2027
- status
- callsOpenedAt
- callsClosedAt
- createdAt
```

Stati:

```text
CREATED
ACTIVE_CALLS_CLOSED
CALLS_OPEN
CLOSED
```

È sufficiente anche un modello equivalente, purché permetta di distinguere chiaramente:

- anno creato/attivo;
- chiamate aperte;
- chiamate chiuse;
- anno concluso.

Può esserci un solo anno associativo attivo contemporaneamente.

---

# 18. Creazione nuovo anno associativo

Solo il Capo Gruppo può creare il nuovo anno.

Flusso:

1. Capo Gruppo clicca "Crea nuovo anno associativo";
2. il sistema propone l'anno;
3. mostra conferma:

```text
Sei sicuro di voler aprire il nuovo anno associativo 2026/2027?
```

4. conferma;
5. l'anno diventa corrente;
6. le chiamate restano chiuse.

Non mostrare anteprime statistiche o conteggi in questa fase.

---

# 19. Apertura chiamate

È un'azione distinta dalla creazione dell'anno.

Solo il Capo Gruppo può eseguirla.

Flusso:

1. click "Apri chiamate";
2. mostra conferma:

```text
Vuoi aprire le chiamate per l'anno associativo 2026/2027?
```

3. dopo conferma:
   - calcolare gli anni di ingresso;
   - selezionare tutti gli `IN_ATTESA` eleggibili;
   - trasformarli in `DA_CHIAMARE`;
   - salvare `callsOpenedAt`;
   - impostare lo stato anno a chiamate aperte.

Non è necessario mostrare prima quanti ragazzi verranno coinvolti.

---

# 20. Nuove iscrizioni durante chiamate aperte

Questa regola è obbligatoria.

Quando una nuova iscrizione arriva mentre le chiamate sono aperte:

```text
IF birthYear è uno degli anni di ingresso dell'anno corrente
THEN stato iniziale = DA_CHIAMARE
ELSE stato iniziale = IN_ATTESA
```

Esempio:

```text
Anno = 2026/2027
Chiamate = aperte

Nato 2018 → DA_CHIAMARE
Nato 2014 → DA_CHIAMARE
Nato 2010 → DA_CHIAMARE
Nato 2017 → IN_ATTESA
```

---

# 21. Chiusura chiamate

Solo il Capo Gruppo può chiudere le chiamate.

L'azione richiede conferma.

Alla chiusura:

1. calcolare statistiche anonime aggregate;
2. salvare lo snapshot annuale;
3. trasformare tutti i residui `DA_CHIAMARE` in `IN_ATTESA`;
4. salvare `callsClosedAt`;
5. chiudere la campagna di chiamate.

Le statistiche devono essere calcolate **prima** del reset degli stati residui.

---

# 22. Statistiche annuali

Le statistiche sono anonime e aggregate.

Non devono mantenere collegamenti ai singoli ragazzi.

Metriche minime:

- numero complessivo di ragazzi coinvolti;
- accettati;
- rifiutati;
- rimasti da chiamare;
- suddivisione per branca;
- suddivisione per sesso;
- eventualmente suddivisione per anno di nascita.

Struttura concettuale:

```text
AnnualStatistics
- associativeYearId
- branch
- gender
- birthYear
- totalCalled
- accepted
- refused
- remaining
```

Le statistiche devono continuare a esistere anche quando i dati personali vengono successivamente eliminati.

---

# 23. Dashboard

La dashboard deve essere semplice e immediata.

Metriche consigliate:

- iscritti totali attivi;
- In Attesa;
- Da Chiamare;
- Accettati nell'anno corrente;
- Rifiutati nell'anno corrente;
- iscritti che aspettano da più tempo;
- ultime iscrizioni;
- grafico iscrizioni negli ultimi 12 mesi.

Non introdurre metriche troppo complesse nella V1.

---

# 24. Lista d'attesa

La schermata principale della lista deve supportare:

- Maschi;
- Femmine;
- Entrambi;
- filtro anno di nascita;
- filtro stato;
- ricerca testuale;
- paginazione.

## 24.1 Ricerca

Ricerca opzionale per:

- nome;
- cognome;
- CF;
- email genitore;
- telefono genitore;
- nome genitore.

La ricerca non deve mai cambiare l'ordine cronologico.

## 24.2 Paginazione

Utilizzare paginazione esplicita.

Non infinite scroll.

## 24.3 Riga/card iscrizione

Mostrare almeno:

- numero posizione nel filtro;
- Nome Cognome;
- Data di nascita;
- Anno di nascita;
- Sesso;
- Data iscrizione;
- Stato;
- eventuale branca calcolata;
- pulsante per dettaglio.

Su mobile può essere una card; su desktop può essere tabella.

---

# 25. Dettaglio iscritto

La pagina dettaglio deve mostrare:

## Minore

- Nome
- Cognome
- Sesso
- Data nascita
- Luogo nascita
- Provincia
- CF
- Note
- Numero iscrizione
- Data e ora iscrizione
- Stato
- Branca calcolata

## Genitore A

Tutti i dati registrati.

## Genitore B

Tutti i dati registrati.

## Azioni

- Modifica dati
- Cambia stato
- Cancella iscritto

Ogni azione pericolosa richiede conferma.

---

# 26. Modifica dati

La modifica deve essere esplicita.

Flusso:

1. utente apre dettaglio;
2. clicca icona/pulsante Modifica;
3. campi diventano editabili;
4. Salva;
5. conferma;
6. validazione;
7. aggiornamento.

Non è richiesto un audit log completo nella V1.

---

# 27. Audit log

Non implementare un audit log dettagliato nella V1 per ridurre costi e complessità.

Non è necessario tracciare ogni variazione campo per campo.

Restano comunque necessari i normali timestamp tecnici:

- createdAt;
- updatedAt;
- callsOpenedAt;
- callsClosedAt;
- privacyAcceptedAt;
- ecc.

---

# 28. Gestione utenti Capo

Solo il Capo Gruppo può:

- aggiungere;
- modificare;
- eliminare;
- reinviare inviti.

## 28.1 Campi Capo

- Nome
- Cognome
- Email
- Codice Socio
- Ruolo

Il Codice Socio è un identificativo già univoco.

## 28.2 Invito

Flusso:

1. Admin inserisce dati;
2. sistema crea account in stato pending;
3. invia email di invito;
4. link valido 24 ore;
5. Capo imposta password;
6. account diventa attivo.

Se il link scade:

- Admin può reinviare invito.

## 28.3 Modifica profilo

Il Capo può modificare:

- Nome
- Cognome
- Email
- Password

L'Admin può modificare gli stessi campi.

## 28.4 Eliminazione Capo

Quando il Capo Gruppo elimina un Capo:

- l'account deve essere cancellato completamente;
- non deve essere solo disabilitato;
- l'accesso deve cessare immediatamente.

---

# 29. Autenticazione

Utilizzare Better Auth.

Metodo V1:

```text
email + password
```

Funzioni necessarie:

- login;
- logout;
- reset password;
- invito iniziale;
- cambio password;
- protezione route;
- RBAC.

Non implementare 2FA nella V1.

## 29.1 Sessione

Durata sessione:

```text
7 giorni
```

È ammesso il rinnovo coerente con il comportamento standard della libreria.

---

# 30. RBAC

Ruoli:

```text
ADMIN
STAFF
```

Mappatura:

```text
ADMIN = Capo Gruppo
STAFF = Capo
```

Permessi:

| Funzione | STAFF | ADMIN |
|---|---:|---:|
| Dashboard | ✓ | ✓ |
| Lista iscritti | ✓ | ✓ |
| Dettaglio | ✓ | ✓ |
| Modifica iscritto | ✓ | ✓ |
| Cancella iscritto | ✓ | ✓ |
| Cambio stato | ✓ | ✓ |
| Crea anno | ✗ | ✓ |
| Apri chiamate | ✗ | ✓ |
| Chiudi chiamate | ✗ | ✓ |
| Gestisci Capi | ✗ | ✓ |
| Gestisci mailing list | ✗ | ✓ |
| Configura branche | ✗ | ✓ |

---

# 31. Mailing

La casella mittente è l'account istituzionale Microsoft 365 del gruppo.

Nella V1 usare Power Automate come adapter.

## 31.1 Email obbligatorie

### Nuova iscrizione

Destinatari:

- Genitore A
- Genitore B
- mailing list configurata dei Capi Gruppo

Contenuto minimo:

- conferma iscrizione;
- nome ragazzo;
- numero iscrizione;
- riferimento al gruppo.

### Accettazione

Destinatari:

- Genitore A
- Genitore B
- destinatari interni configurati secondo policy.

### Rifiuto

Stesso principio.

### Invito Capo

Destinatario:

- nuovo Capo.

### Password reset

Destinatario:

- Capo interessato.

## 31.2 Mailing list interna

Il Capo Gruppo può gestire chi riceve comunicazioni interne.

Gli indirizzi sono legati alle utenze dei Capi Gruppo o alla configurazione definita.

---

# 32. Privacy

L'informativa privacy esiste già e deve essere caricata/ospitata in modo consultabile nel sito.

Registrare:

```text
privacyAccepted
privacyAcceptedAt
privacyPolicyVersion
```

Non è necessario registrare IP/user agent.

La versione privacy deve permettere di capire quale documento è stato accettato.

---

# 33. Importazione dati esistenti

Il sistema attuale contiene circa 200 iscritti.

I dati possono essere esportati da Microsoft Lists in:

- CSV;
- Excel.

Tutti gli iscritti da importare sono `IN_ATTESA`.

Requisito fondamentale:

- mantenere la data e ora originale di iscrizione.

L'import deve valorizzare `createdAt` con il timestamp storico.

L'ordine post-migrazione deve essere identico al vecchio sistema.

---

# 34. Strategia import

Prevedere uno script amministrativo separato, non una pagina pubblica.

Pseudo-flusso:

1. leggere CSV/XLSX;
2. validare campi;
3. normalizzare CF;
4. verificare duplicati;
5. mappare genitori;
6. preservare `createdAt`;
7. generare ID tecnici;
8. generare `registrationNumber` coerente;
9. creare tutti gli iscritti come `IN_ATTESA`;
10. produrre report errori.

Lo script deve essere idempotente o almeno proteggere dai duplicati.

---

# 35. Modello dati suggerito

## 35.1 User

```text
User
- id
- firstName
- lastName
- email
- memberCode
- role
- createdAt
- updatedAt
```

Auth credentials gestite secondo Better Auth.

## 35.2 WaitingListEntry

```text
WaitingListEntry
- id
- registrationNumber
- firstName
- lastName
- gender
- birthDate
- birthYear
- birthPlace
- birthProvince
- fiscalCode
- notes
- status
- privacyAccepted
- privacyAcceptedAt
- privacyPolicyVersion
- createdAt
- updatedAt
```

`birthYear` può essere salvato come campo denormalizzato derivato per semplificare filtri e query, mantenendo `birthDate` come fonte primaria.

## 35.3 Guardian

```text
Guardian
- id
- applicantId
- type // A | B
- firstName
- lastName
- birthDate
- birthPlace
- birthProvince
- fiscalCode
- address
- city
- province
- email
- phone
- createdAt
- updatedAt
```

Vincolo:

```text
un applicant deve avere esattamente 2 guardians nella V1
```

## 35.4 AssociativeYear

```text
AssociativeYear
- id
- label
- startYear
- endYear
- status
- callsOpenedAt
- callsClosedAt
- createdAt
- updatedAt
```

## 35.5 AnnualStatistics

```text
AnnualStatistics
- id
- associativeYearId
- branch
- gender
- birthYear
- totalCandidates
- accepted
- refused
- remaining
- createdAt
```

## 35.6 PrivacyPolicyVersion

```text
PrivacyPolicyVersion
- id
- version
- fileUrl
- publishedAt
- isActive
```

## 35.7 BlockedIdentifier

```text
BlockedIdentifier
- id
- identifierHash
- reason
- createdAt
```

## 35.8 BranchConfiguration

```text
BranchConfiguration
- id
- branch
- minAge
- maxAge
- entryAge
- colorHex
```

Configurazione iniziale:

```text
LC: min 8, max 11, entry 8, color #FDC500
EG: min 12, max 15, entry 12, color #21A067
RS: min 16, max 21, entry 16, color #E74030
```

---

# 36. Regole di integrità dati

Vincoli principali:

1. `registrationNumber` univoco.
2. `fiscalCode` minore univoco tra record attivi.
3. `User.email` univoca.
4. `User.memberCode` univoco.
5. Un solo anno associativo attivo.
6. Due Guardian per ogni iscrizione V1.
7. `createdAt` iscrizione non modificabile da UI.
8. Stato ammesso solo tra i 4 definiti.
9. Branch non salvata permanentemente sull'iscritto.
10. Nessun ordinamento lista diverso da createdAt + id.

---

# 37. API / Server Actions suggerite

L'agente può scegliere Route Handlers o Server Actions, purché il dominio resti separato.

Use case minimi:

```text
registerApplicant
getApplicants
getApplicantById
updateApplicant
deleteApplicant
changeApplicantStatus

createAssociativeYear
openCalls
closeCalls
getAssociativeYearStatistics

createStaffUser
updateStaffUser
deleteStaffUser
resendStaffInvite

getDashboardMetrics

getMailingConfiguration
updateMailingConfiguration
```

---

# 38. Service layer

Suggerire moduli:

```text
ApplicantService
AssociativeYearService
StatisticsService
AuthService
MailService
UserService
PrivacyService
ImportService
```

La business logic non deve essere dispersa nei componenti React.

---

# 39. Struttura repository suggerita

```text
src/
├── app/
│   ├── (public)/
│   │   └── iscrizione/
│   ├── (auth)/
│   │   ├── login/
│   │   └── reset-password/
│   └── (backoffice)/
│       ├── dashboard/
│       ├── lista-attesa/
│       ├── iscritti/[id]/
│       ├── anno-associativo/
│       └── impostazioni/
├── components/
├── modules/
│   ├── applicants/
│   ├── guardians/
│   ├── associative-years/
│   ├── statistics/
│   ├── users/
│   ├── auth/
│   ├── mail/
│   ├── privacy/
│   └── import/
├── lib/
├── db/
├── repositories/
├── providers/
├── schemas/
└── tests/

prisma/
├── schema.prisma
└── migrations/

scripts/
└── import-waiting-list.ts

docs/
└── functional-spec.md
```

---

# 40. UX mobile-first

## 40.1 Form pubblico

- stepper;
- campi grandi;
- tastiera corretta per email/telefono;
- errori inline;
- riepilogo prima dell'invio;
- pulsante principale sempre evidente.

## 40.2 Backoffice

Mobile:

- cards;
- drawer/menu compatto;
- filtri in sheet/modal;
- badge stato;
- azioni principali facilmente raggiungibili.

Desktop:

- tabella;
- sidebar;
- filtri orizzontali o laterali.

---

# 41. Badge stati

Suggerimento visivo:

```text
IN_ATTESA    → giallo/arancio informativo
DA_CHIAMARE  → azzurro
ACCETTATO    → verde
RIFIUTATO    → rosso
```

I colori di stato non devono necessariamente coincidere con i colori delle branche.

---

# 42. Azioni pericolose

Richiedere conferma per:

- cancellazione iscritto;
- cambio a Accettato;
- cambio a Rifiutato;
- eliminazione Capo;
- creazione anno associativo;
- apertura chiamate;
- chiusura chiamate.

Esempio:

```text
Confermi di voler segnare Mario Rossi come ACCETTATO?
Verrà inviata una comunicazione ai genitori.
```

---

# 43. Error handling

Il sistema deve gestire chiaramente:

- CF duplicato;
- record non trovato;
- errore invio email;
- sessione scaduta;
- permessi insufficienti;
- errore apertura/chiusura chiamate;
- import con record non validi;
- anno associativo già attivo;
- invito scaduto;
- link reset scaduto.

Gli errori tecnici non devono essere mostrati integralmente all'utente.

---

# 44. Email failure strategy

L'invio email non deve corrompere lo stato applicativo.

Esempio:

1. iscrizione salvata correttamente;
2. email fallisce;
3. l'iscrizione rimane valida;
4. registrare errore tecnico;
5. permettere retry amministrativo in futuro.

Nella V1 è accettabile un logging applicativo essenziale.

---

# 45. Sicurezza

Requisiti minimi:

- HTTPS in produzione;
- password hash gestite da Better Auth;
- cookie sicuri;
- protezione CSRF secondo stack;
- rate limiting sul form pubblico se necessario;
- validazione server-side Zod;
- autorizzazione server-side RBAC;
- nessuna fiducia nei soli controlli client;
- segreti esclusivamente in environment variables;
- mai loggare password o CF completi inutilmente.

---

# 46. Logging

Non implementare audit funzionale completo.

Implementare però logging tecnico minimo per:

- errori;
- email fallite;
- import;
- eccezioni;
- operazioni amministrative critiche se necessario.

---

# 47. Test

Sono richiesti test estesi.

## 47.1 Unit test

Testare:

- normalizzazione CF;
- validazione minima CF;
- calcolo branch;
- calcolo anno di ingresso;
- state transition;
- generazione registrationNumber;
- regole anno associativo;
- statistiche.

## 47.2 Integration test

Testare:

- iscrizione completa;
- duplicato CF;
- creazione anno;
- apertura chiamate;
- nuova iscrizione durante chiamate;
- chiusura chiamate;
- reset residui;
- creazione statistiche;
- gestione utenti;
- inviti.

## 47.3 E2E

Flussi critici:

### E2E 1 — Iscrizione

```text
form → privacy → riepilogo → conferma → numero iscrizione
```

### E2E 2 — Lista

```text
login → filtri → ordine immutabile → dettaglio
```

### E2E 3 — Chiamate

```text
crea anno → apri chiamate → candidati corretti → accetta/rifiuta → chiudi → statistiche
```

### E2E 4 — Permessi

```text
STAFF non può gestire utenti/anno
ADMIN sì
```

---

# 48. Acceptance Criteria principali

## AC-01 Iscrizione riuscita

Given un form valido  
When il genitore conferma  
Then viene creato un iscritto  
And vengono creati due genitori  
And viene registrato il consenso privacy  
And viene generato un numero LA-*  
And viene inviata la conferma email.

## AC-02 Duplicato

Given un CF già esistente  
When viene tentata una nuova iscrizione  
Then il sistema rifiuta l'operazione  
And mostra messaggio di contatto al gruppo.

## AC-03 Ordine

Given N iscritti  
When la lista viene visualizzata o filtrata  
Then il risultato è sempre `createdAt ASC, id ASC`.

## AC-04 Nessun riordino

Nessun ruolo può modificare la posizione manualmente.

## AC-05 Apertura chiamate

Given anno attivo con chiamate chiuse  
When Admin apre le chiamate  
Then tutti gli iscritti eleggibili IN_ATTESA diventano DA_CHIAMARE.

## AC-06 Nuova iscrizione eleggibile

Given chiamate aperte  
When viene iscritto un ragazzo dell'anno di ingresso  
Then nasce direttamente DA_CHIAMARE.

## AC-07 Nuova iscrizione non eleggibile

Given chiamate aperte  
When viene iscritto un ragazzo non dell'anno di ingresso  
Then nasce IN_ATTESA.

## AC-08 Chiusura

Given chiamate aperte  
When Admin chiude  
Then vengono calcolate statistiche anonime  
And i DA_CHIAMARE residui tornano IN_ATTESA.

## AC-09 Accettato

Given DA_CHIAMARE  
When Capo conferma ACCETTATO  
Then stato = ACCETTATO  
And viene inviata mail.

## AC-10 Rifiutato

Given DA_CHIAMARE  
When Capo conferma RIFIUTATO  
Then stato = RIFIUTATO  
And viene inviata mail.

## AC-11 Cancellazione Capo

Given un account Capo  
When Admin conferma eliminazione  
Then l'account viene eliminato completamente.

## AC-12 Import

Given il file storico  
When lo script importa  
Then tutti i record sono IN_ATTESA  
And `createdAt` storico è preservato  
And l'ordine rimane identico all'origine.

---

# 49. Backlog prioritizzato

## P0 — Core indispensabile

1. Setup Next.js + TypeScript
2. Tailwind + shadcn/ui
3. Prisma + PostgreSQL
4. Better Auth
5. RBAC
6. Modello dati
7. Form pubblico mobile-first
8. Privacy
9. Validazione CF minima
10. Anti-duplicato
11. Generazione registrationNumber
12. Lista cronologica
13. Filtri
14. Paginazione
15. Ricerca
16. Dettaglio
17. Modifica
18. Cancellazione
19. State machine 4 stati
20. Test core

## P1 — Operatività annuale

21. Gestione anno associativo
22. Config branche
23. Apertura chiamate
24. Nuove iscrizioni eleggibili
25. Chiusura chiamate
26. Statistiche anonime
27. Gestione Capi
28. Inviti 24h
29. Reset password
30. Adapter Power Automate
31. Email iscrizione
32. Email accettazione
33. Email rifiuto
34. Mailing list
35. Import storico
36. Test E2E completi

## P2 — Miglioramenti

37. Dashboard avanzata
38. Grafico 12 mesi
39. PWA
40. Retry email da UI
41. Cronologia chiamate
42. Migliorie accessibilità
43. Migliorie performance
44. Configurazioni avanzate
45. Template email editabili

---

# 50. Strategia per coding agent

Il coding agent non deve implementare tutto in un'unica iterazione.

Per ogni task:

1. leggere questa specifica;
2. identificare dipendenze;
3. implementare un task alla volta;
4. eseguire test;
5. verificare acceptance criteria;
6. non introdurre funzionalità non richieste;
7. non modificare invarianti senza approvazione;
8. aggiornare eventualmente documentazione tecnica.

Priorità:

```text
P0 → P1 → P2
```

Non iniziare da dashboard/grafici prima del completamento del core.

---

# 51. Invarianti da non violare

Queste regole devono essere trattate come vincoli assoluti:

1. La lista è sempre ordinata per `createdAt ASC, id ASC`.
2. Nessuno può cambiare manualmente la priorità.
3. I quattro stati sono gli unici stati V1.
4. La branca è calcolata dinamicamente.
5. Le chiamate si aprono separatamente dalla creazione anno.
6. Le statistiche vengono calcolate alla chiusura.
7. Le statistiche annuali sono anonime.
8. Una nuova iscrizione eleggibile durante chiamate aperte nasce DA_CHIAMARE.
9. Tutti i Capi vedono tutti gli iscritti.
10. Solo Admin gestisce utenti e anno associativo.
11. Due genitori sono obbligatori.
12. CF italiano obbligatorio V1 con controllo minimale.
13. Il numero LA-* non determina l'ordine.
14. Gli account Capo eliminati vengono rimossi completamente.
15. Power Automate è un adapter, non business logic.
16. PostgreSQL è il DB V1, ma il provider deve restare sostituibile.
17. Nessun audit log funzionale dettagliato nella V1.
18. Mobile-first.
19. Le mail di cancellazione iscritto non sono obbligatorie.
20. L'import storico deve preservare `createdAt`.

---

# 52. Doppio check finale di coerenza

## Ruoli

- [x] Admin ha tutti i permessi Staff.
- [x] Staff vede tutti gli iscritti.
- [x] Genitori senza account.
- [x] Solo Admin gestisce Capi e anno.

## Iscrizione

- [x] Due genitori obbligatori.
- [x] CF italiano V1.
- [x] Controllo CF leggero.
- [x] CF univoco.
- [x] Note presenti.
- [x] Privacy registrata.
- [x] Riepilogo prima della conferma.
- [x] Numero LA-*.
- [x] Email conferma.

## Lista

- [x] Ordine immutabile.
- [x] createdAt server-side.
- [x] tie-break su id.
- [x] numerazione relativa al filtro.
- [x] ricerca non cambia ordine.
- [x] paginazione.

## Stati

- [x] IN_ATTESA.
- [x] DA_CHIAMARE.
- [x] ACCETTATO.
- [x] RIFIUTATO.
- [x] Nessun quinto stato.
- [x] Accettato non torna Rifiutato.
- [x] Rifiutato non torna In Attesa.

## Anno associativo

- [x] Creato manualmente dal Capo Gruppo.
- [x] Conferma creazione.
- [x] Apertura chiamate separata.
- [x] Conferma apertura.
- [x] Nessuna anteprima conteggi obbligatoria.
- [x] Nuove iscrizioni eleggibili → DA_CHIAMARE.
- [x] Chiusura → statistiche.
- [x] Residui DA_CHIAMARE → IN_ATTESA.
- [x] Statistiche anonime aggregate.

## Branche

- [x] L/C 8–11.
- [x] E/G 12–15.
- [x] R/S 16–21.
- [x] Entry age 8/12/16.
- [x] Calcolo dinamico.
- [x] Configurabile.
- [x] Colori corretti.

## Account

- [x] Better Auth.
- [x] Email/password.
- [x] Reset password.
- [x] Invito 24h.
- [x] Reinvia invito.
- [x] Sessione 7 giorni.
- [x] Niente 2FA V1.
- [x] Eliminazione Capo completa.

## Email

- [x] Microsoft 365.
- [x] Power Automate disponibile.
- [x] Adapter astratto.
- [x] Mail nuova iscrizione.
- [x] Mail accettazione.
- [x] Mail rifiuto.
- [x] Nessuna mail cancellazione obbligatoria.

## Privacy / retention

- [x] Informativa esistente.
- [x] Versione privacy.
- [x] Data/ora consenso.
- [x] No IP obbligatorio.
- [x] Dati accettati/rifiutati eliminabili dopo circa un anno.
- [x] Dati oltre età limite eliminabili.
- [x] Registro anti-reiscrizione separato.
- [x] Statistiche annuali anonime.

## Import

- [x] Circa 200 iscritti.
- [x] Tutti IN_ATTESA.
- [x] CSV/Excel.
- [x] Timestamp originale preservato.
- [x] Ordine storico preservato.

## UI

- [x] Mobile-first.
- [x] Tailwind.
- [x] shadcn/ui.
- [x] Palette AGESCI.
- [x] Roboto.
- [x] Roboto Slab.
- [x] PWA rinviata.

## Testing

- [x] Unit.
- [x] Integration.
- [x] E2E.
- [x] Test dedicati all'ordine.
- [x] Test dedicati ad apertura/chiusura chiamate.
- [x] Test permessi.

---

# 53. Decisioni volutamente rinviate

Questi punti non devono bloccare la V1:

- PWA;
- cronologia tentativi di chiamata;
- audit log dettagliato;
- template email modificabili da UI;
- provider hosting definitivo;
- Microsoft Graph;
- autenticazione passwordless;
- 2FA;
- supporto identificativi esteri;
- dashboard sofisticata;
- notifiche push.

---

# 54. Definizione di Done generale

Una funzionalità è completata solo se:

- rispetta questa specifica;
- ha validazione server-side;
- applica correttamente RBAC;
- gestisce errori principali;
- è responsive;
- è coperta dai test previsti;
- non viola l'ordine della lista;
- non introduce dipendenze vendor-specific nella business logic;
- non altera stati o workflow definiti senza autorizzazione.

---

# 55. Prompt operativo sintetico per l'agente

> Implementa il CRM Lista d'Attesa AGESCI Adelfia 1 seguendo esclusivamente questa specifica. Procedi per task in ordine P0 → P1 → P2. Prima di ogni task identifica dipendenze e acceptance criteria. Mantieni business logic, repository, provider esterni e UI separati. Non introdurre funzionalità non previste. Considera l'ordine cronologico della lista, la state machine a quattro stati, l'apertura/chiusura dell'anno associativo, la privacy e la mobile-first UX come invarianti. Dopo ogni task esegui i test pertinenti e correggi eventuali regressioni prima di procedere.
