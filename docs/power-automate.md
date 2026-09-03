# Contratto Power Automate

L'adapter invia una richiesta `POST` HTTPS a `POWER_AUTOMATE_WEBHOOK_URL`, con `Content-Type: application/json` e, se configurato, `Authorization: Bearer …`.

```json
{
  "type": "REGISTRATION_CONFIRMATION",
  "sender": "gruppo@example.it",
  "recipients": ["genitore@example.it"],
  "data": {
    "applicantName": "Mario Rossi",
    "registrationNumber": "LA-2026-000001"
  }
}
```

I tipi previsti sono `REGISTRATION_CONFIRMATION`, `ACCEPTANCE_CONFIRMATION`, `REJECTION_CONFIRMATION`, `STAFF_INVITATION` e `PASSWORD_RESET`. Per gli ultimi due `data` contiene rispettivamente `invitationUrl`/`expiresAt` o `resetUrl`/`expiresAt`.

Il Flow deve validare il tipo, usare la casella Microsoft 365 istituzionale e restituire uno stato HTTP 2xx solo dopo aver accettato la consegna. Timeout, errori HTTP e webhook non configurato vengono registrati nell'outbox senza annullare l'operazione applicativa.
