import { PrismaClient } from "../generated/prisma/client";
import { createPrismaPgAdapter } from "../lib/database/prisma-pg-adapter";

export function createScriptPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL non configurata.");
  return new PrismaClient({
    adapter: createPrismaPgAdapter({
      connectionString,
      caCertificate: process.env.DATABASE_CA_CERT,
    }),
  });
}
