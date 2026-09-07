import { expect, it, vi } from "vitest";

import { PrismaDashboardRepository } from "./dashboard.repository";

it("compone metriche globali dagli stati correnti senza interrogare esiti annuali o mail fallite", async () => {
  const client = {
    waitingListEntry: {
      count: vi.fn(async () => 12),
      groupBy: vi.fn(async () => [
        { status: "IN_ATTESA", _count: { _all: 7 } },
        { status: "DA_CHIAMARE", _count: { _all: 1 } },
        { status: "ACCETTATO", _count: { _all: 3 } },
        { status: "RIFIUTATO", _count: { _all: 1 } },
      ]),
      findMany: vi.fn()
        .mockResolvedValueOnce([{ id: "old", firstName: "Mario", lastName: "Rossi", registrationNumber: "LA-1", createdAt: new Date("2025-01-01"), status: "IN_ATTESA" }])
        .mockResolvedValueOnce([{ id: "new", firstName: "Anna", lastName: "Verdi", registrationNumber: "LA-2", createdAt: new Date("2026-09-01"), status: "DA_CHIAMARE" }]),
    },
    $queryRaw: vi.fn(async () => [{ month: new Date("2026-09-01"), total: BigInt(4) }]),
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  };
  const result = await new PrismaDashboardRepository(client as never).getOverview(new Date("2026-09-03T12:00:00Z"));
  expect(result.metrics).toEqual({ total: 12, waiting: 7, toCall: 1, accepted: 3, refused: 1 });
  expect(result.monthly).toEqual([{ month: "2026-09", total: 4 }]);
  expect(client.waitingListEntry.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ orderBy: [{ createdAt: "asc" }, { id: "asc" }] }));
  expect(client.waitingListEntry.findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
});
