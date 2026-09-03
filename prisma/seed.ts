import "dotenv/config";

import { monotonicFactory } from "ulid";
import { createScriptPrismaClient } from "../scripts/prisma-client";

async function main() {
  const prisma = createScriptPrismaClient();
  const createId = monotonicFactory();
  try {
    const branches = [
      { branch: "LC" as const, minAge: 8, maxAge: 11, entryAge: 8, colorHex: "#FDC500" },
      { branch: "EG" as const, minAge: 12, maxAge: 15, entryAge: 12, colorHex: "#21A067" },
      { branch: "RS" as const, minAge: 16, maxAge: 21, entryAge: 16, colorHex: "#E74030" },
    ];
    for (const row of branches) {
      await prisma.branchConfiguration.upsert({ where: { branch: row.branch }, create: row, update: row });
    }

    const privacyVersion = process.env.PRIVACY_POLICY_VERSION?.trim();
    const privacyUrl = process.env.PRIVACY_POLICY_URL?.trim();
    if (Boolean(privacyVersion) !== Boolean(privacyUrl)) {
      throw new Error("PRIVACY_POLICY_VERSION e PRIVACY_POLICY_URL devono essere configurate insieme.");
    }
    if (privacyVersion && privacyUrl) {
      new URL(privacyUrl);
      await prisma.$transaction(async (transaction) => {
        await transaction.privacyPolicyVersion.updateMany({ data: { isActive: false } });
        await transaction.privacyPolicyVersion.upsert({
          where: { version: privacyVersion },
          create: { id: createId(), version: privacyVersion, fileUrl: privacyUrl, publishedAt: new Date(), isActive: true },
          update: { fileUrl: privacyUrl, isActive: true },
        });
      });
    } else {
      console.warn("Informativa privacy non configurata: l'iscrizione pubblica resterà bloccata.");
    }
    console.log("Seed completato: configurazione branche aggiornata.");
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Errore seed non riconosciuto.");
  process.exitCode = 1;
});
