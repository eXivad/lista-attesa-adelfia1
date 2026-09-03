import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { RetentionService } from "../modules/retention/retention.service";
import { PrismaRetentionRepository } from "../repositories/prisma/retention.repository";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const hmacSecret = process.env.IDENTIFIER_HMAC_KEY;
  if (!databaseUrl || !hmacSecret || hmacSecret.length < 32) throw new Error("DATABASE_URL e IDENTIFIER_HMAC_KEY devono essere configurate.");
  const retentionDays = Number(process.env.RETENTION_DAYS ?? "365");
  const apply = process.argv.includes("--apply");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const result = await new RetentionService({ repository: new PrismaRetentionRepository(client), hmacSecret }).run({ retentionDays, apply });
    const expiredRateBuckets = apply ? (await client.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } })).count : 0;
    console.log(JSON.stringify({ ...result, expiredRateBucketsDeleted: expiredRateBuckets }, null, 2));
    if (!apply && result.candidates > 0) console.log("Simulazione completata. Riesegui con --apply solo dopo aver verificato gli ID candidati.");
  } finally {
    await client.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Errore retention non riconosciuto.");
  process.exitCode = 1;
});
