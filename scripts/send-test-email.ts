import "dotenv/config";

import { z } from "zod";

import { PrismaMailQuotaGuard } from "../repositories/prisma/mail-quota.repository";
import { PrismaGroupBrandingRepository } from "../repositories/prisma/group-branding.repository";
import { createScriptGmailMailProvider } from "./gmail-mail-client";
import { createScriptPrismaClient } from "./prisma-client";

async function main() {
  const parsedRecipient = z.email().safeParse(process.env.MAIL_TEST_RECIPIENT?.trim().toLowerCase());
  if (!parsedRecipient.success) {
    throw new Error("MAIL_TEST_RECIPIENT deve contenere un indirizzo email valido.");
  }
  const recipient = parsedRecipient.data;
  const client = createScriptPrismaClient();
  const brandingRepository = new PrismaGroupBrandingRepository(client);
  const provider = createScriptGmailMailProvider(
    new PrismaMailQuotaGuard(client),
    () => brandingRepository.getMailBranding(),
  );

  try {
    await provider.verifyConnection();
    await provider.sendDiagnosticMessage(recipient);
    console.log(`Gmail SMTP ha accettato il messaggio di prova per ${maskEmail(recipient)}.`);
    console.log("Verifica ora la cartella Inviati, la ricezione e le intestazioni SPF/DKIM/DMARC.");
  } finally {
    provider.close();
    await client.$disconnect();
  }
}

function maskEmail(value: string): string {
  const [localPart, domain] = value.split("@");
  return `${localPart?.slice(0, 1) || "*"}***@${domain}`;
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Invio diagnostico non riuscito.");
  process.exitCode = 1;
});
