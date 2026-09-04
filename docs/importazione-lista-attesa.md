# Importazione lista d'attesa

L'import è uno script amministrativo, non una pagina pubblica. Esegue una simulazione per impostazione predefinita:

```powershell
pnpm run import:waiting-list -- .\dati.xlsx --privacy-version=2026.1 --report=report.json
```

Solo dopo aver verificato il report, aggiungere `--apply`. CSV e XLSX devono usare le intestazioni del file `docs/import-template.csv`. I timestamp CSV devono essere ISO 8601 con fuso esplicito, per esempio `2024-05-10T10:30:00+02:00`; le celle data/ora Excel native sono accettate.

Lo script ordina prima per `createdAt` originale e poi per numero di riga, forza ogni record a `IN_ATTESA`, protegge dai CF duplicati e mantiene il timestamp storico. La versione privacy passata deve esistere già nel database.
