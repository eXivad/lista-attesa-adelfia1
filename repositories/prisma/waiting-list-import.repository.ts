import { monotonicFactory } from "ulid";

import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { formatRegistrationNumber, getRegistrationYear } from "@/modules/applicants/domain/registration-number";
import { importIdentityKeys, type PreparedImportRow } from "@/modules/import/waiting-list-import";

const IMPORT_TRANSACTION_TIMEOUT_MS = 120_000;

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
    if (rows.length === 0) return [];

    return this.client.$transaction(async (transaction) => {
      const duplicateConditions: Prisma.WaitingListEntryWhereInput[] = rows.flatMap((row) => {
        const conditions: Prisma.WaitingListEntryWhereInput[] = [{
          firstName: { equals: row.minor.firstName, mode: "insensitive" },
          lastName: { equals: row.minor.lastName, mode: "insensitive" },
          birthDate: row.minor.birthDate,
        }];
        if (row.minor.fiscalCode) conditions.push({ fiscalCode: row.minor.fiscalCode });
        return conditions;
      });
      const existingRows = await transaction.waitingListEntry.findMany({
        where: { OR: duplicateConditions },
        select: { firstName: true, lastName: true, birthDate: true, fiscalCode: true },
      });
      const existingKeys = new Set(existingRows.flatMap(importIdentityKeys));
      const conflictingRow = rows.find((row) =>
        importIdentityKeys(row.minor).some((key) => existingKeys.has(key))
      );
      if (conflictingRow) throw new WaitingListImportConflictError(conflictingRow.sourceRow);

      const rowsByYear = Map.groupBy(rows, (row) => getRegistrationYear(row.createdAt));
      const nextSequenceByYear = new Map<number, number>();
      for (const [registrationYear, yearRows] of rowsByYear) {
        const counter = await transaction.registrationCounter.upsert({
          where: { year: registrationYear },
          create: { year: registrationYear, lastValue: yearRows.length },
          update: { lastValue: { increment: yearRows.length } },
          select: { lastValue: true },
        });
        nextSequenceByYear.set(registrationYear, counter.lastValue - yearRows.length + 1);
      }

      const imported: Array<{ row: number; id: string; registrationNumber: string }> = [];
      const entries: Prisma.WaitingListEntryCreateManyInput[] = [];
      const guardians: Prisma.GuardianCreateManyInput[] = [];
      for (const row of rows) {
        const registrationYear = getRegistrationYear(row.createdAt);
        const sequence = nextSequenceByYear.get(registrationYear);
        if (sequence === undefined) throw new Error(`Progressivo ${registrationYear} non allocato.`);

        const id = this.createId(row.createdAt.getTime());
        const registrationNumber = formatRegistrationNumber(registrationYear, sequence);
        nextSequenceByYear.set(registrationYear, sequence + 1);
        entries.push({
          id,
          registrationNumber,
          ...row.minor,
          status: "IN_ATTESA",
          privacyAccepted: row.privacyAccepted,
          privacyAcceptedAt: row.privacyAcceptedAt,
          privacyPolicyVersion: row.privacyPolicyVersion,
          createdAt: row.createdAt,
        });
        guardians.push(...row.guardians.map((guardian) => ({
          id: this.createId(row.createdAt.getTime()),
          applicantId: id,
          ...guardian,
          createdAt: row.createdAt,
        })));
        imported.push({ row: row.sourceRow, id, registrationNumber });
      }

      await transaction.waitingListEntry.createMany({ data: entries });
      if (guardians.length > 0) await transaction.guardian.createMany({ data: guardians });

      return imported;
    }, { timeout: IMPORT_TRANSACTION_TIMEOUT_MS });
  }
}

export class WaitingListImportConflictError extends Error {
  constructor(public readonly sourceRow: number) {
    super(`La riga ${sourceRow} corrisponde a un iscritto gi\u00e0 presente nel database.`);
    this.name = "WaitingListImportConflictError";
  }
}
