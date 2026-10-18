import "dotenv/config";

import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import { createScriptPrismaClient } from "./prisma-client";

async function main() {
  const input = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(12).max(128),
  }).parse({
    firstName: process.env.BOOTSTRAP_ADMIN_FIRST_NAME,
    lastName: process.env.BOOTSTRAP_ADMIN_LAST_NAME,
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  });

  const prisma = createScriptPrismaClient();
  try {
    const duplicate = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (duplicate) throw new Error("Esiste già un utente con questa email.");
    const userId = randomUUID();
    const now = new Date();
    await prisma.$transaction([
      prisma.user.create({ data: {
        id: userId, name: `${input.firstName} ${input.lastName}`, firstName: input.firstName, lastName: input.lastName,
        email: input.email, emailVerified: true, role: "ADMIN", createdAt: now,
      } }),
      prisma.account.create({ data: {
      id: randomUUID(), accountId: userId, providerId: "credential", userId,
      issuer: "local:credential",
      password: await hashPassword(input.password), createdAt: now,
      } }),
    ]);
    console.log(`Account Capo Gruppo creato per ${input.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Errore bootstrap non riconosciuto.");
  process.exitCode = 1;
});
