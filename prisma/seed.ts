import "dotenv/config";

import { createScriptPrismaClient } from "../scripts/prisma-client";

async function main() {
  const prisma = createScriptPrismaClient();
  try {
    const branches = [
      { branch: "LC" as const, minAge: 8, maxAge: 11, entryAge: 8 },
      { branch: "EG" as const, minAge: 12, maxAge: 15, entryAge: 12 },
      { branch: "RS" as const, minAge: 16, maxAge: 21, entryAge: 16 },
    ];
    for (const row of branches) {
      await prisma.branchConfiguration.upsert({ where: { branch: row.branch }, create: row, update: row });
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
