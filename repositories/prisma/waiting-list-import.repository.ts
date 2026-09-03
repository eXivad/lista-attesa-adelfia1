import { monotonicFactory } from "ulid";

import type { PrismaClient } from "@/generated/prisma/client";
import { formatRegistrationNumber, getRegistrationYear } from "@/modules/applicants/domain/registration-number";
import type { PreparedImportRow } from "@/modules/import/waiting-list-import";

export class PrismaWaitingListImportRepository {
  private readonly createId = monotonicFactory();
  constructor(private readonly client: PrismaClient) {}

  async validatePrivacyVersion(version: string): Promise<boolean> {
    return Boolean(await this.client.privacyPolicyVersion.findUnique({ where: { version }, select: { id: true } }));
  }

  async findExistingFiscalCodes(codes: string[]): Promise<Set<string>> {
    const rows = await this.client.waitingListEntry.findMany({ where: { fiscalCode: { in: codes } }, select: { fiscalCode: true } });
    return new Set(rows.map(({ fiscalCode }) => fiscalCode));
  }

  async importRow(row: PreparedImportRow) {
    return this.client.$transaction(async (transaction) => {
      const existing = await transaction.waitingListEntry.findUnique({ where: { fiscalCode: row.minor.fiscalCode }, select: { id: true } });
      if (existing) return { imported: false as const, reason: "DUPLICATE_DATABASE" as const };
      const registrationYear = getRegistrationYear(row.createdAt);
      const counter = await transaction.registrationCounter.upsert({
        where: { year: registrationYear },
        create: { year: registrationYear, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
        select: { lastValue: true },
      });
      const id = this.createId(row.createdAt.getTime());
      const registrationNumber = formatRegistrationNumber(registrationYear, counter.lastValue);
      await transaction.waitingListEntry.create({ data: {
        id, registrationNumber, ...row.minor, status: "IN_ATTESA",
        privacyAccepted: true, privacyAcceptedAt: row.privacyAcceptedAt,
        privacyPolicyVersion: row.privacyPolicyVersion, createdAt: row.createdAt,
        guardians: { create: row.guardians.map((guardian) => ({ id: this.createId(row.createdAt.getTime()), ...guardian, createdAt: row.createdAt })) },
      } });
      return { imported: true as const, id, registrationNumber };
    });
  }
}
