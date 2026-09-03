import { monotonicFactory } from "ulid";

import type { PrismaClient } from "@/generated/prisma/client";
import type { RetentionDeleteCommand, RetentionRepository } from "@/modules/retention/retention.service";

export class PrismaRetentionRepository implements RetentionRepository {
  private readonly createId = monotonicFactory();
  constructor(private readonly client: PrismaClient) {}

  async getMaximumAge(): Promise<number> {
    const row = await this.client.branchConfiguration.aggregate({ _max: { maxAge: true } });
    return row._max.maxAge ?? 21;
  }

  async findCandidates(cutoffs: { terminalOnOrBefore: Date; bornOnOrBefore: Date }) {
    return this.client.waitingListEntry.findMany({
      where: { OR: [
        { status: { in: ["ACCETTATO", "RIFIUTATO"] }, terminalStatusAt: { lte: cutoffs.terminalOnOrBefore } },
        { birthDate: { lte: cutoffs.bornOnOrBefore } },
      ] },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, status: true, fiscalCode: true },
    });
  }

  async deleteCandidates(commands: RetentionDeleteCommand[]): Promise<number> {
    return this.client.$transaction(async (transaction) => {
      for (const command of commands) {
        if (command.blockedIdentifierHash) {
          await transaction.blockedIdentifier.upsert({
            where: { identifierHash: command.blockedIdentifierHash },
            create: { id: this.createId(), identifierHash: command.blockedIdentifierHash, reason: "Rifiuto registrato" },
            update: {},
          });
        }
      }
      const result = await transaction.waitingListEntry.deleteMany({ where: { id: { in: commands.map(({ id }) => id) } } });
      return result.count;
    });
  }
}
