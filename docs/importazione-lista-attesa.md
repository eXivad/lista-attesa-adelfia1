# Importazione lista d'attesa

L'import è uno script amministrativo, non una pagina pubblica. Esegue una simulazione per impostazione predefinita:

```powershell
pnpm run import:waiting-list -- .\dati.xlsx --privacy-version=2026.1 --report=report.json
```

Solo dopo aver verificato il report, aggiungere `--apply`. CSV e XLSX devono usare le intestazioni del file `docs/import-template.csv`. I timestamp CSV devono essere ISO 8601 con fuso esplicito, per esempio `2024-05-10T10:30:00+02:00`; le celle data/ora Excel native sono accettate.

I dati di residenza del minore (`residenceAddress`, `residenceCity`, `residenceProvince`, `residencePostalCode`) e il CAP di entrambi i genitori (`guardianAPostalCode`, `guardianBPostalCode`) sono obbligatori. Le province devono essere sigle di due lettere; i CAP accettano al massimo 12 caratteri.

Lo script ordina prima per `createdAt` originale e poi per numero di riga, forza ogni record a `IN_ATTESA`, protegge dai CF duplicati e mantiene il timestamp storico. La versione privacy passata deve esistere già nel database.

## Importazione di dati storici incompleti

Per archivi precedenti alla raccolta di tutti i dati obbligatori, usare esplicitamente la modalità `--legacy`:

```powershell
pnpm run import:waiting-list -- .\docs\import-06-09-2026.csv --legacy --report=reports/import-preview.json
```

Questa modalità accetta campi anagrafici, di residenza e dei genitori mancanti. Nome, cognome, genere, data di nascita e data storica di inserimento del minore restano obbligatori. Non assegna una versione privacy ai dati storici e registra il consenso come non disponibile; non usare insieme `--legacy` e `--privacy-version`.

I timestamp storici nei formati `GG/MM/AAAA HH:mm` sono interpretati nel fuso `Europe/Rome` (personalizzabile con `IMPORT_TIMEZONE`). I duplicati vengono verificati tramite Codice Fiscale, quando presente, e sempre tramite nome, cognome e data di nascita normalizzati.

Nei CSV storici sono ammesse colonne vuote omesse soltanto in coda alla riga. Righe con colonne aggiuntive rispetto all'intestazione restano invalide, per evitare disallineamenti silenziosi dei dati.

L'opzione `--apply` è fail-closed: in presenza di una sola riga invalida o duplicata non importa nessun record. L'intero lotto è inoltre racchiuso in una transazione, quindi un conflitto concorrente annulla tutte le scritture.

I file reali denominati `docs/import-*.csv` con data nel nome sono esclusi da Git perché contengono dati personali. Il template privo di dati reali rimane versionato.
