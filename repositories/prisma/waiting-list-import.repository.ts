import { monotonicFactory } from "ulid";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { formatRegistrationNumber, getRegistrationYear } from "@/modules/applicants/domain/registration-number";
import { importIdentityKeys, type PreparedImportRow } from "@/modules/import/waiting-list-import";

export class PrismaWaitingListImportRepository {
  private readonly createId: (timestamp?: number) => string;

  constructor(
    private readonly client: PrismaClient,
    options: { createId?: (timestamp?: number) => string } = {},
  ) {
    this.createId = options.createId ?? monotonicFactory();
  }

  async validatePrivacyVersion(version: string): Promise<boolean> {
    return Boolean(await this.client.privacyPolicyVersion.findUnique({ where: { version }, select: { id: true } }));
  }

  async findExistingKeys(): Promise<Set<string>> {
    const rows = await this.client.waitingListEntry.findMany({
      select: { firstName: true, lastName: true, birthDate: true, fiscalCode: true },
    });
    return new Set(rows.flatMap(importIdentityKeys));
  }

  async importRows(rows: PreparedImportRow[]) {
    return this.client.$transaction(async (transaction) => {
      const imported: Array<{ row: number; id: string; registrationNumber: string }> = [];

      for (const row of rows) {
        const duplicateConditions: Prisma.WaitingListEntryWhereInput[] = [{
          firstName: { equals: row.minor.firstName, mode: "insensitive" },
          lastName: { equals: row.minor.lastName, mode: "insensitive" },
          birthDate: row.minor.birthDate,
        }];
        if (row.minor.fiscalCode) duplicateConditions.push({ fiscalCode: row.minor.fiscalCode });

        const existing = await transaction.waitingListEntry.findFirst({
          where: { OR: duplicateConditions },
          select: { id: true },
        });
        if (existing) throw new WaitingListImportConflictError(row.sourceRow);

        const registrationYear = getRegistrationYear(row.createdAt);
        const counter = await transaction.registrationCounter.upsert({
          where: { year: registrationYear },
          create: { year: registrationYear, lastValue: 1 },
          update: { lastValue: { increment: 1 } },
          select: { lastValue: true },
        });
        const id = this.createId(row.createdAt.getTime());
        const registrationNumber = formatRegistrationNumber(registrationYear, counter.lastValue);
        await transaction.waitingListEntry.create({
          data: {
            id,
            registrationNumber,
            ...row.minor,
            status: "IN_ATTESA",
            privacyAccepted: row.privacyAccepted,
            privacyAcceptedAt: row.privacyAcceptedAt,
            privacyPolicyVersion: row.privacyPolicyVersion,
            createdAt: row.createdAt,
            guardians: {
              create: row.guardians.map((guardian) => ({
                id: this.createId(row.createdAt.getTime()),
                ...guardian,
                createdAt: row.createdAt,
              })),
            },
          },
        });
        imported.push({ row: row.sourceRow, id, registrationNumber });
      }

      return imported;
    }, { timeout: 30_000 });
  }
}

export class WaitingListImportConflictError extends Error {
  constructor(public readonly sourceRow: number) {
    super(`La riga ${sourceRow} corrisponde a un iscritto gi\u00e0 presente nel database.`);
    this.name = "WaitingListImportConflictError";
  }
}
