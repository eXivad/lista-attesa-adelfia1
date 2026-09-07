import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client";
import { createPrismaPgAdapter } from "../lib/database/prisma-pg-adapter";
import { RetentionService } from "../modules/retention/retention.service";
import { PrismaRetentionRepository } from "../repositories/prisma/retention.repository";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const hmacSecret = process.env.IDENTIFIER_HMAC_KEY;
  if (!databaseUrl || !hmacSecret || hmacSecret.length < 32) throw new Error("DATABASE_URL e IDENTIFIER_HMAC_KEY devono essere configurate.");
  const retentionDays = Number(process.env.RETENTION_DAYS ?? "365");
  const apply = process.argv.includes("--apply");
  const client = new PrismaClient({
    adapter: createPrismaPgAdapter({
      connectionString: databaseUrl,
      caCertificate: process.env.DATABASE_CA_CERT,
    }),
  });
  try {
    const result = await new RetentionService({ repository: new PrismaRetentionRepository(client), hmacSecret }).run({ retentionDays, apply });
    const expiredRateBuckets = apply ? (await client.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } })).count : 0;
    const mailQuotaCutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const expiredMailQuotaReservations = apply
      ? (await client.mailQuotaReservation.deleteMany({ where: { createdAt: { lt: mailQuotaCutoff } } })).count
      : 0;
    console.log(JSON.stringify({
      ...result,
      expiredRateBucketsDeleted: expiredRateBuckets,
      expiredMailQuotaReservationsDeleted: expiredMailQuotaReservations,
    }, null, 2));
    if (!apply && result.candidates > 0) console.log("Simulazione completata. Riesegui con --apply solo dopo aver verificato gli ID candidati.");
  } finally {
    await client.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Errore retention non riconosciuto.");
  process.exitCode = 1;
});
