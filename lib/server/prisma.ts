import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaPgAdapter } from "@/lib/database/prisma-pg-adapter";
import { getDatabaseEnvironment } from "@/lib/server/environment";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const { DATABASE_URL, DATABASE_CA_CERT, DATABASE_POOL_MAX } = getDatabaseEnvironment();
    const adapter = createPrismaPgAdapter({
      connectionString: DATABASE_URL,
      max: DATABASE_POOL_MAX,
      caCertificate: DATABASE_CA_CERT,
    });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
