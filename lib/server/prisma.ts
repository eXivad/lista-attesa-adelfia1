import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseEnvironment } from "@/lib/server/environment";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const { DATABASE_URL, DATABASE_POOL_MAX } = getDatabaseEnvironment();
    const adapter = new PrismaPg({
      connectionString: DATABASE_URL,
      max: DATABASE_POOL_MAX,
    });
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.prisma;
}
