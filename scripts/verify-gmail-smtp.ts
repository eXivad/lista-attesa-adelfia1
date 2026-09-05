import "dotenv/config";

import { createScriptGmailMailProvider } from "./gmail-mail-client";

async function main() {
  const provider = createScriptGmailMailProvider({
    async reserve() {
      throw new Error("La verifica SMTP non deve riservare quota.");
    },
  });

  try {
    await provider.verifyConnection();
    console.log("Connessione TLS e autenticazione Gmail OAuth 2.0 verificate. Nessuna email inviata.");
  } finally {
    provider.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Verifica Gmail SMTP non riuscita.");
  process.exitCode = 1;
});
