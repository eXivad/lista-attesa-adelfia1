# Change Request — CRM Lista d'Attesa AGESCI Adelfia 1

**Versione:** 1.0  
**Scopo:** formalizzare le Change Request successive allo sviluppo base e trasformarle in task atomici, verificabili e assegnabili a un coding agent.  
**Documento di riferimento:** `Specifica_Funzionale_Tecnica_Lista_Attesa_AGESCI_Adelfia1.md`

> **Regola di precedenza:** in caso di conflitto tra questa CR e la specifica funzionale/tecnica precedente, **questa CR ha precedenza** per i punti esplicitamente modificati. Tutto ciò che non viene modificato qui resta invariato.

---

# 1. Sintesi delle modifiche

| ID | Area | Titolo | Tipo | Priorità |
|---|---|---|---|---|
| CR-01 | Iscrizione / Dati | Residenza del minore | Nuova funzionalità | P0 |
| CR-02 | Iscrizione / Dati | Completamento residenza genitori con CAP | Allineamento + modifica schema | P0 |
| CR-03 | Dashboard | Rimozione metrica Mail Fallite | Modifica UI | P0 |
| CR-04 | Dashboard | Accettati/Rifiutati non filtrati per anno associativo | Modifica logica metriche | P0 |
| CR-05 | Navigazione Desktop | Sidebar/navbar comprimibile con icone | UX/UI | P0 |
| CR-06 | Navigazione Mobile | Navigazione off-canvas comprimibile con icone | UX/UI | P0 |
| CR-07 | Lista d'attesa | Mostrare anno di nascita, non data completa | Modifica UI | P0 |
| CR-08 | Lista d'attesa | Mostrare data **e ora** di iscrizione | Modifica UI | P0 |
| CR-09 | Lista d'attesa | Rendere visibile il sesso | Allineamento specifica | P0 |
| CR-10 | Dettaglio iscritto | Controlli cambio stato in alto | UX/UI | P0 |
| CR-11 | Dettaglio iscritto | Cancellazione mantenuta in fondo | UX/UI | P0 |
| CR-12 | UI globale | Dialog custom per tutte le conferme | UX/UI trasversale | P0 |
| CR-13 | Anno Associativo | Label esplicite Età minima / Età massima | UX/UI | P0 |
| CR-14 | Anno Associativo | Colori branche non modificabili | Modifica dominio/configurazione | P0 |
| CR-15 | Impostazioni | Nome gruppo personalizzabile | Nuova funzionalità | P1 |
| CR-16 | Impostazioni | Logo gruppo personalizzabile | Nuova funzionalità | P1 |
| CR-17 | Branding | Applicare nome/logo configurati nel layout | Integrazione UI | P1 |

---

# 2. CR-01 — Aggiunta dati di residenza del minore

## Obiettivo

Durante l'iscrizione pubblica, oltre ai dati anagrafici già previsti per il minore, devono essere raccolti anche i dati di residenza.

## Campi da aggiungere

Per il minore:

- Indirizzo di Residenza
- Comune di Residenza
- Provincia di Residenza
- CAP

## Requisiti

I campi devono essere:

- presenti nel form pubblico di iscrizione;
- inclusi nella validazione client e server;
- persistiti nel database;
- restituiti dalle API/use case che leggono il dettaglio dell'iscritto;
- visibili nella pagina dettaglio;
- modificabili tramite la funzione di modifica dati;
- inclusi nel riepilogo finale prima della conferma dell'iscrizione.

## Modello dati suggerito

Estendere `WaitingListEntry` con:

```text
residenceAddress
residenceCity
residenceProvince
residencePostalCode
```

La nomenclatura effettiva può seguire le convenzioni già presenti nel progetto.

## Validazione minima

- Indirizzo: obbligatorio.
- Comune: obbligatorio.
- Provincia: obbligatoria.
- CAP: obbligatorio.
- Non introdurre validazioni geografiche complesse o dipendenze esterne.

## Acceptance Criteria

### AC-CR01-01
Given un genitore compila una nuova iscrizione  
When arriva allo step dati minore  
Then vede i quattro nuovi campi di residenza.

### AC-CR01-02
Given uno dei quattro campi è mancante  
When tenta di proseguire/confermare  
Then il form segnala l'errore e non completa l'iscrizione.

### AC-CR01-03
Given l'iscrizione viene completata  
Then i quattro valori sono persistiti e visibili nel dettaglio dell'iscritto.

### AC-CR01-04
Given un Capo modifica l'iscritto  
Then può modificare anche i quattro dati di residenza.

---

# 3. CR-02 — Verifica e completamento dati di residenza dei genitori

## Obiettivo

Verificare che **sia Genitore A sia Genitore B** abbiano l'intero set di dati di residenza.

## Campi obbligatori per ciascun genitore

- Indirizzo di Residenza
- Comune di Residenza
- Provincia di Residenza
- CAP

## Nota di verifica rispetto alla specifica precedente

La specifica base prevedeva già per i genitori:

- indirizzo;
- comune;
- provincia;

ma **non prevedeva esplicitamente il CAP** nel modello `Guardian`.

Questa CR richiede quindi:

1. verificare che i primi tre campi siano realmente presenti in form, schema, DB, dettaglio e modifica;
2. aggiungere il CAP dove manca.

## Modello dati suggerito

`Guardian` deve avere almeno:

```text
address
city
province
postalCode
```

## Acceptance Criteria

- Entrambi i genitori devono avere tutti e quattro i campi.
- Nessuno dei quattro campi deve essere opzionale nella V1.
- I dati devono essere presenti in creazione, lettura e modifica.
- Il riepilogo pubblico deve mostrarli.
- Eventuali DTO/schema Zod devono essere coerenti con il DB.

---

# 4. CR-03 — Rimozione metrica "Mail Fallite" dalla Dashboard

## Obiettivo

La metrica relativa alle email fallite non è rilevante per l'uso operativo e deve essere rimossa dalla Dashboard.

## Requisiti

Rimuovere dalla Dashboard:

- card;
- contatore;
- widget;
- grafico;
- eventuale query dedicata usata esclusivamente per questa metrica.

## Importante

La rimozione dalla Dashboard **non significa rimuovere la gestione tecnica degli errori email**.

Devono restare invariati:

- outbox;
- logging tecnico;
- stato di consegna;
- retry o diagnostica interna già implementati.

## Acceptance Criteria

- Nessuna metrica "Mail Fallite" è visibile nella Dashboard.
- Un errore email continua a essere registrato secondo l'architettura esistente.
- La rimozione non deve rompere outbox o invio email.

---

# 5. CR-04 — Metriche globali Accettati / Rifiutati

## Obiettivo

Le card Dashboard "Accettati" e "Rifiutati" non devono essere limitate all'anno associativo corrente.

## Nuova regola

Le metriche devono contare:

```text
tutti i record attualmente presenti nel sistema
con status = ACCETTATO
```

e:

```text
tutti i record attualmente presenti nel sistema
con status = RIFIUTATO
```

senza filtro sull'anno associativo.

## Chiarimento

"Generale" in questa CR significa **non filtrato per anno associativo**.

Non deve essere introdotto un nuovo concetto di totale storico lifetime ricostruito dalle statistiche anonime, salvo futura richiesta specifica.

## Acceptance Criteria

- Card Accettati: conteggio globale dei record `ACCETTATO` presenti.
- Card Rifiutati: conteggio globale dei record `RIFIUTATO` presenti.
- La selezione o presenza dell'anno associativo attivo non modifica i due valori.
- Le altre statistiche annuali continuano a usare la propria logica prevista.

---

# 6. CR-05 — Navigazione Desktop comprimibile con icone

## Obiettivo

La navigazione desktop deve occupare meno spazio quando necessario e risultare più comprensibile visivamente.

## Comportamento

La sidebar/navbar laterale deve avere due stati:

### Espansa

Mostra:

```text
[icona] Dashboard
[icona] Lista d'attesa
[icona] Anno associativo
[icona] Impostazioni
...
```

### Compressa

Mostra principalmente le icone.

Quando compressa:

- le icone devono rimanere cliccabili;
- deve essere possibile identificare la voce, ad esempio con tooltip accessibile;
- deve esserci un controllo evidente per riespandere la navigazione.

## Icone

Usare una icon library coerente con il progetto, preferibilmente quella già integrata con shadcn/ui (es. Lucide).

Non usare emoji come icone di navigazione.

## Acceptance Criteria

- Desktop: sidebar espandibile/comprimibile.
- Tutte le voci hanno icona.
- Nessuna voce perde accessibilità/funzionalità nello stato compresso.
- Lo stato compresso non rompe il contenuto principale.

---

# 7. CR-06 — Navigazione Mobile off-canvas e comprimibile

## Obiettivo

Su smartphone la navigazione non deve occupare spazio sopra la pagina come menu orizzontale o area che deve essere scrollata.

## Comportamento richiesto

Su mobile:

- la navigazione deve essere normalmente nascosta;
- deve essere aperta tramite un controllo dedicato (es. pulsante menu);
- deve apparire come drawer/sheet/off-canvas;
- dopo la selezione di una voce, il menu può richiudersi;
- tutte le voci devono avere icona + label.

## Non ammesso

Non utilizzare una navbar superiore contenente tutte le voci e soggetta a scrolling orizzontale.

## Acceptance Criteria

- Nessuno scroll orizzontale per raggiungere le voci di navigazione.
- Il contenuto della pagina rimane prioritario.
- Menu apribile/chiudibile facilmente con touch.
- Focus e chiusura devono essere gestibili anche da tastiera.

---

# 8. CR-07 — Lista d'attesa: visualizzare anno di nascita, non data completa

## Obiettivo

Nella lista d'attesa non è necessario mostrare la data di nascita completa.

## Modifica

Rimuovere dalla tabella/card:

```text
Data di nascita completa
```

e mostrare:

```text
Anno di nascita
```

Esempio:

```text
2018
```

invece di:

```text
15/04/2018
```

## Nota

La data completa continua a essere conservata nel DB e mostrata nella pagina dettaglio.

Questa CR riguarda solo la rappresentazione nella lista.

---

# 9. CR-08 — Lista d'attesa: data e ora di iscrizione

## Obiettivo

Rendere evidente l'informazione che determina l'ordine della lista.

## Requisito

La lista deve mostrare `createdAt` con:

- data;
- ora.

Esempio UI:

```text
04/09/2026 10:42
```

È facoltativa la visualizzazione dei secondi, ma il backend continua a utilizzare il timestamp completo per l'ordinamento.

## Invariante

L'ordinamento rimane:

```text
createdAt ASC, id ASC
```

La CR non modifica la regola di priorità.

---

# 10. CR-09 — Lista d'attesa: sesso visibile

## Obiettivo

Il sesso del minore deve essere visibile direttamente nella lista.

## Nota di verifica

Questa informazione era **già prevista dalla specifica base** nella riga/card della lista.

Se non è presente nell'implementazione attuale, questa CR va trattata come:

```text
bugfix / allineamento alla specifica
```

e non come nuova funzionalità di dominio.

## Acceptance Criteria

Ogni riga/card mostra chiaramente il sesso del minore senza richiedere l'apertura del dettaglio.

---

# 11. CR-10 — Dettaglio iscritto: cambio stato immediatamente visibile

## Obiettivo

Il cambio stato è una delle azioni operative più frequenti e deve essere raggiungibile senza scorrere l'intera pagina.

## Modifica layout

Portare nella parte alta della pagina:

- stato corrente;
- controllo/pulsante per cambio stato;
- eventuali azioni contestuali necessarie.

Il blocco deve essere visibile subito dopo le informazioni identificative principali dell'iscritto.

## Requisiti

- non alterare le regole della state machine;
- mantenere i dialog di conferma per `ACCETTATO` e `RIFIUTATO`;
- l'utente deve vedere chiaramente lo stato corrente.

---

# 12. CR-11 — Dettaglio iscritto: cancellazione in fondo pagina

## Obiettivo

Separare l'azione distruttiva dalle azioni operative frequenti.

## Requisito

La cancellazione deve:

- rimanere/essere spostata in fondo alla pagina;
- essere visivamente separata;
- utilizzare styling distruttivo;
- richiedere conferma tramite il nuovo dialog custom CR-12.

Non collocare la cancellazione accanto al cambio stato principale.

---

# 13. CR-12 — Dialog custom per tutte le conferme

## Obiettivo

Eliminare l'utilizzo dei dialog nativi del browser nelle conferme.

## Requisito architetturale

Creare o standardizzare un componente riutilizzabile, ad esempio:

```text
ConfirmDialog / ConfirmationDialog
```

basato sui componenti UI del progetto (es. `AlertDialog` di shadcn/ui).

## Deve essere utilizzato almeno per

- cancellazione iscritto;
- cambio stato ad Accettato;
- cambio stato a Rifiutato;
- eliminazione Capo;
- creazione/apertura nuovo anno associativo;
- apertura chiamate;
- chiusura chiamate;
- altre azioni distruttive o irreversibili già presenti.

## Vietato

Per le conferme applicative non utilizzare:

```js
window.confirm(...)
window.alert(...)
```

come sostituto del dialog custom.

## Comportamento

Ogni dialog deve poter definire:

- titolo;
- descrizione;
- label pulsante conferma;
- label annulla;
- variante normale/distruttiva;
- stato loading;
- prevenzione doppio submit.

## Acceptance Criteria

- Tutte le conferme principali hanno UI coerente.
- Nessun dialog nativo browser nei flussi di conferma.
- Escape/Annulla non eseguono l'azione.
- Conferma esegue l'azione una sola volta.
- Il dialog è utilizzabile da tastiera.

---

# 14. CR-13 — Anno Associativo: label Età minima / Età massima

## Obiettivo

Rendere più chiara la configurazione delle branche.

## Modifica

Nella sezione configurazione branche sostituire label ambigue come:

```text
Min
Max
```

con label esplicite:

```text
Età minima
Età massima
```

L'eventuale campo dell'età di ingresso deve avere anch'esso una label chiara, ad esempio:

```text
Età di ingresso
```

## Acceptance Criteria

L'utente deve capire il significato dei campi senza affidarsi a placeholder o conoscenze tecniche.

---

# 15. CR-14 — Colori branche fissi e non modificabili

## Obiettivo

I colori delle branche sono standard AGESCI e non devono essere configurabili dall'utente.

## Colori definitivi

| Branca | HEX |
|---|---|
| L/C | `#FDC500` |
| E/G | `#21A067` |
| R/S | `#E74030` |
| Co.Ca. | `#9B66A5` |

## Modifiche richieste

- rimuovere i controlli di modifica colore dalla pagina Anno Associativo;
- non esporre mutazioni/API che consentano di cambiare il colore;
- usare i colori come costanti del design system/configurazione non modificabile.

## Nota sul modello dati

La specifica base suggeriva `colorHex` dentro `BranchConfiguration`.

Questa CR **sostituisce quella decisione**.

Stato desiderato:

```text
minAge / maxAge / entryAge → configurabili
colore → fisso
```

Se `colorHex` esiste già nel database, l'agente deve scegliere la migrazione più sicura, ma l'applicazione non deve più considerarlo configurabile.

## Acceptance Criteria

- Nessun color picker/input colore.
- Nessuna modifica colore tramite UI.
- Nessuna modifica colore tramite endpoint amministrativo.
- I colori visualizzati corrispondono sempre alla palette ufficiale.

---

# 16. CR-15 — Nome del gruppo personalizzabile

## Obiettivo

Rimuovere il nome del gruppo hardcoded dall'interfaccia e permettere la personalizzazione dalle Impostazioni.

## Nuova configurazione

Aggiungere un campo:

```text
Nome del gruppo
```

Esempio:

```text
AGESCI Adelfia 1
```

## Requisiti

- modificabile solo da ADMIN/Capo Gruppo;
- persistito;
- validato;
- riutilizzato nel layout nelle aree in cui oggi compare un nome hardcoded;
- non richiede redeploy per la modifica.

## Modello suggerito

Entità/configurazione unica, ad esempio:

```text
GroupSettings
- id
- groupName
- groupLogo...
- updatedAt
```

---

# 17. CR-16 — Logo del gruppo personalizzabile

## Obiettivo

Il logo A1 non deve essere hardcoded. Il Capo Gruppo deve poter caricare il logo del proprio gruppo.

## Funzionalità

Nella pagina Impostazioni prevedere:

- visualizzazione logo corrente;
- caricamento nuovo logo;
- sostituzione;
- eventuale rimozione.

## Requisiti tecnici

- accesso solo ADMIN;
- memorizzazione persistente;
- non salvare il file direttamente come base64 nel normale record di configurazione;
- utilizzare lo storage già disponibile nel progetto oppure un adapter di storage;
- il codice business non deve dipendere inutilmente da uno specifico provider.

## Default consigliati di implementazione

Se non esistono già regole di upload nel progetto:

- PNG;
- JPG/JPEG;
- WebP;
- limite file ragionevole (es. 2 MB);
- SVG solo se il progetto dispone già di sanitizzazione sicura.

## Regola fondamentale

In assenza di logo personalizzato, **non deve ricomparire automaticamente il logo A1 hardcoded**.

---

# 18. CR-17 — Applicazione globale del branding configurato

## Obiettivo

Nome e logo salvati nelle Impostazioni devono effettivamente essere usati dal layout.

## Ambito minimo

Sostituire i riferimenti hardcoded al gruppo almeno in:

- header/sidebar/navbar del backoffice;
- area branding principale che oggi mostra "A1";
- eventuali componenti condivisi che mostrano il nome del gruppo.

Non modificare automaticamente i template email se questi contengono testi esplicitamente configurati/hardcoded: la modifica dei template è prevista separatamente come P2.

## Acceptance Criteria

- modifica nome → UI aggiornata;
- modifica logo → UI aggiornata;
- nessun logo A1 hardcoded nelle aree rese configurabili;
- refresh/sessione successiva mantiene le impostazioni.

---

# 19. Ordine di implementazione consigliato delle CR

## Lotto A — Dati e schema

1. CR-01 Residenza minore
2. CR-02 CAP/residenza genitori

Motivo: richiedono migrations e aggiornamento verticale form → schema → DB → detail → edit → test.

## Lotto B — Dashboard e lista

3. CR-03 Rimuovi Mail Fallite
4. CR-04 Accettati/Rifiutati globali
5. CR-07 Anno nascita in lista
6. CR-08 Timestamp iscrizione
7. CR-09 Sesso visibile

## Lotto C — UX strutturale

8. CR-12 ConfirmDialog riutilizzabile
9. CR-05 Sidebar desktop
10. CR-06 Menu mobile
11. CR-10 Cambio stato in alto
12. CR-11 Cancellazione in fondo

CR-12 va idealmente implementata prima degli interventi che toccano azioni confermabili.

## Lotto D — Anno associativo

13. CR-13 Label età
14. CR-14 Colori fissi

## Lotto E — Personalizzazione

15. CR-15 Nome gruppo
16. CR-16 Logo gruppo
17. CR-17 Applicazione branding

---

# 20. Fase 2 — P1: completamento e hardening

I punti seguenti non vanno lasciati aggregati in un unico task.

---

## P1-01 — E2E filtri e ordinamento lista

### Obiettivo

Completare i test E2E relativi alla lista.

### Copertura minima

- filtro sesso;
- filtro anno di nascita;
- filtro stato;
- combinazione di filtri;
- ricerca;
- paginazione se rilevante;
- verifica ordine `createdAt ASC, id ASC`;
- verifica che ricerca e filtri non alterino l'ordine;
- verifica nuova visualizzazione anno nascita / sesso / timestamp.

### Acceptance

Test stabile e ripetibile senza dipendenza da ordine casuale dei fixture.

---

## P1-02 — E2E ciclo completo chiamate

### Scenario minimo

```text
ADMIN crea anno
→ conferma
→ apre chiamate
→ candidati eleggibili diventano DA_CHIAMARE
→ nuova iscrizione eleggibile nasce DA_CHIAMARE
→ Capo imposta ACCETTATO/RIFIUTATO
→ ADMIN chiude chiamate
→ statistiche aggregate salvate
→ residui DA_CHIAMARE tornano IN_ATTESA
```

### Verificare inoltre

- anno non eleggibile rimane IN_ATTESA;
- conferme custom;
- nessuna regressione state machine.

---

## P1-03 — E2E autorizzazioni STAFF / ADMIN

### STAFF deve poter

- vedere dashboard;
- vedere lista;
- vedere dettaglio;
- modificare iscritto;
- cambiare stato;
- cancellare iscritto.

### STAFF non deve poter

- gestire utenti;
- creare anno;
- aprire/chiudere chiamate;
- modificare configurazioni ADMIN;
- modificare branding.

### ADMIN

Deve poter eseguire tutte le operazioni sopra previste.

### Importante

Verificare sia:

- UI/routing;
- autorizzazione server-side.

Nascondere un pulsante non è sufficiente.

---

## P1-04 — Verifica consegna reale Microsoft 365 / Power Automate

### Stato attuale

La logica applicativa, l'outbox e i flussi email esistono, ma manca la validazione reale end-to-end della consegna tramite Microsoft 365/Power Automate.

### Testare separatamente

1. conferma nuova iscrizione;
2. accettazione;
3. rifiuto;
4. invito nuovo Capo;
5. reset password.

### Per ciascun flusso verificare

- richiesta correttamente prodotta dall'app;
- Power Automate riceve il payload;
- mapping destinatari corretto;
- subject/body corretti;
- messaggio inviato dalla casella istituzionale prevista;
- consegna reale a un indirizzo di test;
- comportamento in caso di errore;
- outbox coerente con l'esito.

### Output del task

Produrre anche una breve documentazione tecnica con:

- endpoint/trigger usato;
- variabili necessarie;
- secret/env;
- procedura di verifica;
- troubleshooting minimo.

Non inserire segreti nel repository.

---

## P1-05 — Import reale e riconciliazione lista storica

### Stato attuale

L'importatore esiste, ma non è ancora stato eseguito sui dati reali.

### Task da svolgere

1. esportare CSV/Excel reale;
2. eseguire prima un dry-run;
3. verificare colonne e mapping;
4. identificare record non validi/duplicati;
5. importare;
6. preservare `createdAt`;
7. impostare tutti i record importati `IN_ATTESA`;
8. confrontare numero record origine/destinazione;
9. confrontare ordine cronologico;
10. produrre report di riconciliazione.

### Criteri di riconciliazione

Registrare almeno:

```text
totale origine
totale importato
totale scartato
totale duplicati
totale errori
primo timestamp
ultimo timestamp
```

L'import reale non deve essere considerato completato se i conteggi non sono spiegabili.

---

# 21. Fase 2 — P2: task separati

---

## P2-01 — PWA

Implementare successivamente:

- manifest;
- icone;
- installabilità;
- service worker secondo necessità;
- comportamento standalone.

Non blocca le CR correnti.

---

## P2-02 — Retry email da interfaccia

Aggiungere una funzione amministrativa che permetta di ritentare l'invio di email fallite senza intervenire sul DB/manuale.

Da sviluppare solo dopo aver verificato il flusso reale Power Automate.

---

## P2-03 — Storico chiamate

Funzionalità futura distinta dalla state machine.

Possibili dati:

- tentativo;
- data/ora;
- autore;
- esito;
- eventuale nota.

**Non introdurre nuovi stati dell'iscritto** per implementare lo storico.

---

## P2-04 — Configurazioni avanzate

Tenere separato dalle configurazioni necessarie adesso.

Esempi futuri:

- parametri ulteriori del gruppo;
- policy applicative;
- configurazioni operative non fondamentali.

Non usare questo task per rendere configurabili i colori branche: CR-14 li rende esplicitamente fissi.

---

## P2-05 — Template email modificabili

Permettere a un ADMIN di modificare i template delle email.

Da progettare separatamente per:

- nuova iscrizione;
- accettazione;
- rifiuto;
- invito;
- reset password.

Richiederà gestione placeholder e validazione.

---

## P2-06 — Hardening accessibilità

La base è parziale.

Eseguire una revisione dedicata su:

- navigazione da tastiera;
- focus management;
- dialog;
- menu mobile;
- contrasto;
- label form;
- error messages;
- aria-label dove necessarie;
- target touch;
- responsive zoom.

Prestare particolare attenzione a CR-05, CR-06 e CR-12.

---

## P2-07 — Hardening performance

Eseguire una revisione dedicata su:

- query lista;
- query dashboard;
- paginazione server-side;
- indici DB;
- N+1;
- payload;
- immagini/logo;
- bundle client;
- caching dove coerente;
- metriche Web Vitals.

Non introdurre caching che renda incoerenti stati operativi o ordine lista.

---

# 22. Verifica incrociata con la specifica base

## Dati minore

**Specifiche precedenti:** non contenevano residenza del minore.  
**Esito:** CR-01 è realmente una nuova modifica di schema e flusso.

## Dati genitori

**Specifiche precedenti:** indirizzo, comune e provincia erano previsti; CAP no.  
**Esito:** CR-02 richiede soprattutto l'aggiunta del CAP e un controllo di allineamento end-to-end degli altri campi.

## Dashboard

**Specifiche precedenti:** Accettati/Rifiutati erano esplicitamente "nell'anno corrente".  
**Esito:** CR-04 sovrascrive la vecchia regola.

"Mail Fallite" non era una metrica funzionale richiesta nella specifica base.  
**Esito:** CR-03 rimuove una metrica introdotta nell'implementazione.

## Lista d'attesa

**Specifiche precedenti:** erano già previsti anno di nascita, sesso e data iscrizione; era prevista anche la data di nascita completa.  
**Esito:**

- CR-07 rimuove la data completa dalla lista e mantiene solo l'anno;
- CR-08 specifica che la data iscrizione deve includere anche l'ora;
- CR-09 è un allineamento a un requisito già esistente.

## Dettaglio

**Specifiche precedenti:** cambio stato e cancellazione erano previsti senza posizione rigida.  
**Esito:** CR-10/11 sono modifiche UX e non di dominio.

## Conferme

**Specifiche precedenti:** le azioni pericolose richiedevano conferma, ma non era imposto un componente custom.  
**Esito:** CR-12 standardizza la UI e vieta i dialog nativi.

## Branche

**Specifiche precedenti:** `colorHex` era suggerito come parte della configurazione.  
**Esito:** CR-14 annulla la configurabilità del colore; solo età e soglie restano configurabili.

## Branding

**Specifiche precedenti:** branding AGESCI/Adelfia 1 statico.  
**Esito:** CR-15/16/17 introducono configurazione runtime di nome e logo.

## P1/P2

I task E2E, import, PWA, retry email, storico chiamate, accessibilità, performance e template erano già presenti o previsti nel backlog base.  
**Esito:** la Fase 2 non modifica il dominio principale; formalizza ciò che resta da completare e lo divide in task atomici.

---

# 23. Non-regressioni obbligatorie

Durante queste CR non devono cambiare:

1. ordinamento lista `createdAt ASC, id ASC`;
2. impossibilità di riordinare manualmente;
3. quattro stati:
   - IN_ATTESA
   - DA_CHIAMARE
   - ACCETTATO
   - RIFIUTATO;
4. apertura chiamate separata dalla creazione anno;
5. statistiche anonime alla chiusura;
6. nuove iscrizioni eleggibili durante chiamate aperte → `DA_CHIAMARE`;
7. due genitori obbligatori;
8. CF italiano con controllo leggero;
9. RBAC STAFF/ADMIN;
10. Power Automate come adapter e non business logic;
11. cancellazione Capo completa;
12. mobile-first;
13. colori ufficiali AGESCI;
14. retention/privacy già definite.

---

# 24. Definition of Done per ogni CR

Una CR è completata solo se:

- UI aggiornata;
- schema/DB aggiornato se necessario;
- validation schema aggiornati;
- service/use case aggiornati;
- API/server action aggiornate;
- autorizzazioni verificate;
- test pertinenti aggiunti o aggiornati;
- test esistenti verdi;
- responsive verificato;
- nessuna regressione sulle invarianti;
- nessun hardcoding introdotto dove la CR richiede configurazione;
- nessuna funzionalità extra non richiesta.

---

# 25. Istruzione pronta per il coding agent

> Usa questo documento come Change Request incrementale rispetto alla specifica funzionale/tecnica esistente. Non riscrivere l'applicazione e non alterare funzionalità non coinvolte. Implementa le CR in task atomici seguendo l'ordine suggerito. Prima di modificare il codice, identifica per ogni CR i file/componenti/schema/use case/test impattati. Esegui eventuali migration in modo sicuro. Dopo ogni lotto esegui unit, integration ed E2E pertinenti e correggi le regressioni prima di procedere. Le sezioni "Non-regressioni obbligatorie" e "Acceptance Criteria" sono vincolanti. Dove questa CR contraddice la specifica precedente, prevale questa CR.
