# Gmail SMTP con OAuth 2.0

Questa integrazione usa Nodemailer e `smtp.gmail.com` sulla porta 465 con TLS implicito e OAuth 2.0 a tre partecipanti. Non memorizza la password dell'account Google e non espone credenziali al browser.

Gmail è una scelta deliberata per il volume ridotto del Gruppo. La documentazione Nodemailer avverte che Gmail non è progettato come servizio transazionale ad alto volume: se il traffico crescerà o serviranno metriche di bounce automatiche, sarà opportuno sostituire l'adapter con un provider dedicato senza modificare la business logic.

Fonti operative:

- [Nodemailer: usare Gmail](https://nodemailer.com/guides/using-gmail)
- [Nodemailer: OAuth 2.0](https://nodemailer.com/smtp/oauth2)
- [Google: limiti di invio Gmail](https://support.google.com/mail/answer/22839?hl=it)
- [Google: linee guida per i mittenti](https://support.google.com/mail/answer/81126?hl=it)
- [Google Workspace: limiti di invio](https://support.google.com/a/answer/166852?hl=it)

## Variabili d'ambiente

Inserire i valori soltanto in `.env` locale o nel secret manager dell'ambiente di produzione:

```dotenv
GMAIL_USER="account-autorizzato@gmail.com"
GMAIL_OAUTH_CLIENT_ID="...apps.googleusercontent.com"
GMAIL_OAUTH_CLIENT_SECRET="..."
GMAIL_OAUTH_REFRESH_TOKEN="..."
GMAIL_DAILY_RECIPIENT_LIMIT="450"
GMAIL_MAX_RECIPIENTS_PER_MESSAGE="20"
MAIL_FROM_NAME="AGESCI Adelfia 1"
MAIL_REPLY_TO="account-monitorato@gmail.com"
MAIL_TEST_RECIPIENT="casella-di-test@example.it"
```

`GMAIL_USER` è sempre usato anche come indirizzo `From`. Gmail riscrive comunque il mittente con l'account autenticato se si tenta di usarne uno diverso; mantenerli uguali evita disallineamenti e intestazioni inattese. `MAIL_REPLY_TO` deve essere una casella monitorata e, se omesso, coincide con `GMAIL_USER`.

I token OAuth devono includere lo scope `https://mail.google.com/`. Il refresh token va ottenuto con il consenso dell'account mittente, conservato come segreto e revocato/ruotato immediatamente in caso di esposizione. Per applicazioni OAuth esterne, il consenso non deve restare nello stato `Testing`, altrimenti il refresh token può avere durata limitata.

## Quote e protezioni applicative

Per gli account Gmail personali Google indica il blocco quando si superano 500 destinatari in un singolo messaggio oppure 500 messaggi al giorno; il ripristino può richiedere da 1 a 24 ore. Gli account Workspace hanno limiti diversi in base al piano e allo stato dell'account, da verificare nella documentazione amministrativa prima di aumentare il valore.

L'applicazione usa per default un tetto prudenziale di 450 destinatari in una finestra mobile di 24 ore. Ogni tentativo viene riservato su PostgreSQL sotto lock transazionale prima della connessione SMTP. La riserva resta conteggiata anche in caso di timeout, perché Gmail potrebbe avere già accettato il messaggio. Gli invii eseguiti manualmente dalla stessa casella non sono visibili all'applicazione: ridurre `GMAIL_DAILY_RECIPIENT_LIMIT` per lasciare loro spazio.

Ogni messaggio ha inoltre un massimo predefinito di 20 destinatari. Gli indirizzi sono deduplicati e inseriti in BCC per non esporre i contatti delle famiglie e della mailing list interna.

## Deliverability e spam

Nessun codice può garantire che una mail non finisca nello spam. Prima del go-live occorre:

1. usare sempre lo stesso account e un nome mittente chiaro e stabile;
2. inviare soltanto comunicazioni transazionali a indirizzi raccolti e verificati durante l'iscrizione;
3. evitare liste acquistate, promozioni, URL abbreviati, allegati non necessari e tracking pixel;
4. aumentare gradualmente il volume e fermarsi se aumentano bounce o risposte SMTP differite;
5. controllare regolarmente la cartella Inviati, i messaggi di mancata consegna e gli avvisi di sicurezza Google;
6. chiedere ai destinatari abituali di aggiungere la casella del Gruppo ai contatti;
7. per un dominio Google Workspace, configurare e verificare SPF, DKIM a 2048 bit e DMARC allineati al dominio del `From`;
8. monitorare reputazione e tasso spam con Google Postmaster Tools quando disponibile, mantenendo il tasso ben sotto lo 0,3%.

Se Google Workspace è l'unico sistema che invia per il dominio, il record SPF tipico include `_spf.google.com`; non copiarlo alla cieca se esistono altri mittenti. DKIM va attivato dalla Console di amministrazione Google. Per DMARC è prudente partire con reporting e policy `p=none`, verificare i report e irrigidire la policy solo dopo aver confermato l'allineamento.

I messaggi generati sono multipart `text/plain` + HTML minimale e non usano immagini remote o tracking pixel. Se nelle impostazioni è presente un logo, viene incorporato come singola immagine inline tramite CID: il client di posta non deve richiamare l'applicazione e il contenuto non rivela aperture del messaggio. Il nome del Gruppo proviene dalle stesse impostazioni usate dall'interfaccia; `MAIL_FROM_NAME` rimane il valore di ripiego se il branding non è disponibile. I link di invito/reset devono essere HTTPS, salvo `localhost` durante lo sviluppo. Non sono presenti intestazioni di disiscrizione perché si tratta di notifiche operative indispensabili e non di newsletter; eventuali comunicazioni promozionali dovranno usare un flusso separato con consenso e cancellazione.

## Collaudo controllato

Applicare prima la nuova migrazione:

```powershell
pnpm run db:migrate
```

Verificare TLS e OAuth senza inviare email:

```powershell
pnpm run mail:verify
```

Solo dopo una verifica riuscita, impostare `MAIL_TEST_RECIPIENT` su una propria casella ed eseguire un singolo invio:

```powershell
pnpm run mail:test
```

L'esito del comando significa che Gmail SMTP ha accettato il messaggio, non che il server destinatario lo abbia consegnato in Posta in arrivo. Confermare manualmente:

- presenza nella cartella Inviati dell'account mittente;
- ricezione in Posta in arrivo e non in Spam;
- intestazioni `Authentication-Results` con SPF, DKIM e DMARC coerenti;
- mittente, Reply-To, testo semplice, HTML e link;
- intestazione, nome del Gruppo, firma e logo inline configurato;
- assenza di destinatari visibili in `To`/`Cc`;
- eventuali bounce nella casella mittente.

Dopo il test diagnostico vanno collaudati separatamente iscrizione, accettazione, rifiuto, invito Capo e reset password. Nell'outbox lo stato `SENT` significa “accettato dal server SMTP Gmail”; la consegna finale richiede sempre il controllo dei bounce.

### Esito del collaudo infrastrutturale

Il 5 settembre 2026 sono stati verificati con un account Gmail personale:

- connessione TLS e autenticazione OAuth 2.0 tramite refresh token;
- accettazione SMTP e ricezione del messaggio diagnostico;
- controlli SPF, DKIM e DMARC tutti superati nelle intestazioni ricevute.

Questo esito convalida il canale di invio, ma non sostituisce il collaudo dei cinque flussi applicativi elencati sopra.

## Messaggi oltre quota e retry

Le notifiche applicative già associate a un record di outbox restano persistite anche quando il limite prudenziale blocca l'invio. Non è necessario un cron a pagamento per non perderle: una successiva funzione amministrativa può mostrare i tentativi differiti e consentire il reinvio manuale dopo la scadenza indicata dal controllo quota.

Il reinvio non è uguale per tutti i messaggi:

- conferma iscrizione, accettazione e rifiuto possono riutilizzare i dati conservati nell'outbox;
- un invito Capo deve usare l'azione di reinvio esistente, che revoca il precedente invito e genera un nuovo token con scadenza valida;
- un reset password deve essere richiesto nuovamente, così Better Auth genera un nuovo link valido.

Un'esecuzione automatica pianificata potrà essere aggiunta in futuro, ma il retry manuale dal backoffice è sufficiente come prima soluzione operativa e non dipende da un servizio scheduler esterno.
