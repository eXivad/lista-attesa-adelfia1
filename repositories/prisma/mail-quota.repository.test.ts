import { describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { MailDailyQuotaExceededError } from "@/modules/mail/mail-quota";
import { PrismaMailQuotaGuard } from "./mail-quota.repository";

const NOW = new Date("2026-09-05T12:00:00Z");

function setup(usedRecipients: number, oldestCreatedAt = new Date("2026-09-04T13:00:00Z")) {
  const transaction = {
    $queryRaw: vi.fn(async (query: unknown) => {
      void query;
      return [{ lockToken: "" }];
    }),
    mailQuotaReservation: {
      aggregate: vi.fn(async () => ({ _sum: { recipientCount: usedRecipients } })),
      findFirst: vi.fn(async () => ({ createdAt: oldestCreatedAt })),
      create: vi.fn(async () => ({})),
    },
  };
  const client = {
    $transaction: vi.fn(async (callback: (value: typeof transaction) => Promise<void>) => callback(transaction)),
  } as unknown as PrismaClient;
  const guard = new PrismaMailQuotaGuard(client, { createId: () => "01QUOTARESERVATION00000000" });
  return { guard, transaction };
}

describe("PrismaMailQuotaGuard", () => {
  it("serializza e registra una riserva entro la quota delle ultime 24 ore", async () => {
    const { guard, transaction } = setup(440);
    await guard.reserve({ sender: "Gruppo@GMAIL.com", recipientCount: 2, limit: 450, now: NOW });

    expect(transaction.$queryRaw).toHaveBeenCalledOnce();
    const lockQuery = transaction.$queryRaw.mock.calls[0]?.[0] as { sql?: string } | undefined;
    expect(lockQuery?.sql).toContain("::text AS \"lockToken\"");
    expect(transaction.mailQuotaReservation.aggregate).toHaveBeenCalledWith({
      where: {
        senderKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        createdAt: { gt: new Date("2026-09-04T12:00:00Z") },
      },
      _sum: { recipientCount: true },
    });
    expect(transaction.mailQuotaReservation.create).toHaveBeenCalledWith({
      data: {
        id: "01QUOTARESERVATION00000000",
        senderKey: expect.stringMatching(/^[a-f0-9]{64}$/),
        recipientCount: 2,
        createdAt: NOW,
      },
    });
  });

  it("rifiuta atomicamente una riserva che supererebbe il limite", async () => {
    const oldest = new Date("2026-09-04T13:00:00Z");
    const { guard, transaction } = setup(449, oldest);
    const promise = guard.reserve({ sender: "gruppo@gmail.com", recipientCount: 2, limit: 450, now: NOW });

    await expect(promise).rejects.toMatchObject({
      name: "MailDailyQuotaExceededError",
      retryAfter: new Date("2026-09-05T13:00:00Z"),
    } satisfies Partial<MailDailyQuotaExceededError>);
    expect(transaction.mailQuotaReservation.create).not.toHaveBeenCalled();
  });

  it("rifiuta conteggi e limiti non positivi", async () => {
    const { guard, transaction } = setup(0);
    await expect(guard.reserve({ sender: "gruppo@gmail.com", recipientCount: 0, limit: 450, now: NOW }))
      .rejects.toThrow("intero positivo");
    await expect(guard.reserve({ sender: "gruppo@gmail.com", recipientCount: 1, limit: 0, now: NOW }))
      .rejects.toThrow("limite giornaliero");
    expect(transaction.$queryRaw).not.toHaveBeenCalled();
  });
});
