import { createHash } from "node:crypto";

import { monotonicFactory } from "ulid";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import {
  MAIL_QUOTA_WINDOW_MS,
  MailDailyQuotaExceededError,
  type MailQuotaGuard,
  type ReserveMailQuotaCommand,
} from "@/modules/mail/mail-quota";

interface PrismaMailQuotaGuardOptions {
  createId?: (timestamp?: number) => string;
}

export class PrismaMailQuotaGuard implements MailQuotaGuard {
  private readonly createId: (timestamp?: number) => string;

  constructor(
    private readonly client: PrismaClient,
    options: PrismaMailQuotaGuardOptions = {},
  ) {
    this.createId = options.createId ?? monotonicFactory();
  }

  async reserve(command: ReserveMailQuotaCommand): Promise<void> {
    if (!Number.isInteger(command.recipientCount) || command.recipientCount < 1) {
      throw new Error("Il numero di destinatari deve essere un intero positivo.");
    }
    if (!Number.isInteger(command.limit) || command.limit < 1) {
      throw new Error("Il limite giornaliero email deve essere un intero positivo.");
    }

    const senderKey = createHash("sha256")
      .update(command.sender.trim().toLowerCase())
      .digest("hex");
    const windowStart = new Date(command.now.getTime() - MAIL_QUOTA_WINDOW_MS);

    await this.client.$transaction(async (transaction) => {
      await transaction.$queryRaw<Array<{ lockToken: string }>>(
        Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${senderKey}, 0))::text AS "lockToken"`,
      );

      const usage = await transaction.mailQuotaReservation.aggregate({
        where: { senderKey, createdAt: { gt: windowStart } },
        _sum: { recipientCount: true },
      });
      const usedRecipients = usage._sum.recipientCount ?? 0;

      if (usedRecipients + command.recipientCount > command.limit) {
        const oldestReservation = await transaction.mailQuotaReservation.findFirst({
          where: { senderKey, createdAt: { gt: windowStart } },
          orderBy: { createdAt: "asc" },
          select: { createdAt: true },
        });
        const retryAfter = new Date(
          (oldestReservation?.createdAt ?? command.now).getTime() + MAIL_QUOTA_WINDOW_MS,
        );
        throw new MailDailyQuotaExceededError(retryAfter);
      }

      await transaction.mailQuotaReservation.create({
        data: {
          id: this.createId(command.now.getTime()),
          senderKey,
          recipientCount: command.recipientCount,
          createdAt: command.now,
        },
      });
    });
  }
}
