import { describe, expect, it, vi } from "vitest";

import { PrismaAssociativeYearRepository } from "./associative-year.repository";

function setup() {
  const transaction = {
    associativeYear: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: "year-new", ...data })),
    },
    waitingListEntry: {
      findMany: vi.fn(async ({ where }: { where: { birthYear: number } }) => [
        { id: `app-${where.birthYear}`, gender: "M", birthYear: where.birthYear },
      ]),
      updateMany: vi.fn(async () => ({ count: 3 })),
    },
    callParticipation: {
      createMany: vi.fn(async () => ({ count: 3 })),
      groupBy: vi.fn(async () => [
        { branch: "LC", gender: "M", birthYear: 2018, outcome: "ACCETTATO", _count: { _all: 2 } },
        { branch: "LC", gender: "M", birthYear: 2018, outcome: "DA_CHIAMARE", _count: { _all: 1 } },
      ]),
      findMany: vi.fn(async () => [{ applicantId: "app-2018" }]),
    },
    annualStatistics: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
  };
  const client = {
    associativeYear: { findFirst: vi.fn(async () => null) },
    branchConfiguration: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
  return { client, transaction };
}

describe("PrismaAssociativeYearRepository", () => {
  it("archivia il precedente e crea un solo anno corrente con chiamate chiuse", async () => {
    const { client, transaction } = setup();
    const repository = new PrismaAssociativeYearRepository(client as never, { createId: () => "year-new" });

    await repository.createCurrentYear({
      startYear: 2026, endYear: 2027, label: "2026/2027", createdAt: new Date("2026-09-03T12:00:00Z"),
    });

    expect(transaction.associativeYear.updateMany).toHaveBeenCalledWith({
      where: { currentKey: 1 }, data: { currentKey: null, status: "CLOSED" },
    });
    expect(transaction.associativeYear.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ currentKey: 1, status: "ACTIVE_CALLS_CLOSED" }),
      select: expect.any(Object),
    });
  });

  it("apre le chiamate e crea partecipazioni dagli anni di nascita", async () => {
    const { client, transaction } = setup();
    const ids = ["id-1", "id-2", "id-3"];
    const repository = new PrismaAssociativeYearRepository(client as never, { createId: () => ids.shift() ?? "id-x" });

    const result = await repository.openCalls({
      associativeYearId: "year-1",
      openedAt: new Date("2026-09-03T12:00:00Z"),
      entryBirthYears: { LC: 2018, EG: 2014, RS: 2010 },
    });

    expect(result).toEqual({ changed: true, candidates: 3 });
    expect(transaction.waitingListEntry.findMany).toHaveBeenCalledTimes(3);
    expect(transaction.callParticipation.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([expect.objectContaining({ branch: "LC", birthYear: 2018 })]),
      skipDuplicates: true,
    });
    expect(transaction.associativeYear.updateMany).toHaveBeenLastCalledWith({
      where: { id: "year-1", currentKey: 1, status: "ACTIVE_CALLS_CLOSED" },
      data: { status: "CALLS_OPEN", callsOpenedAt: expect.any(Date), callsClosedAt: null },
    });
  });

  it("calcola lo snapshot prima di ripristinare i residui", async () => {
    const { client, transaction } = setup();
    const repository = new PrismaAssociativeYearRepository(client as never, { createId: () => "stat-id" });

    const result = await repository.closeCalls({
      associativeYearId: "year-1",
      closedAt: new Date("2027-06-30T12:00:00Z"),
    });

    expect(result).toEqual({ changed: true, resetApplicants: 3, statisticsRows: 1 });
    expect(transaction.annualStatistics.createMany).toHaveBeenCalledWith({ data: [{
      id: "stat-id", associativeYearId: "year-1", branch: "LC", gender: "M", birthYear: 2018,
      totalCandidates: 3, accepted: 2, refused: 0, remaining: 1,
      createdAt: expect.any(Date),
    }] });
    expect(transaction.callParticipation.groupBy.mock.invocationCallOrder[0]).toBeLessThan(
      transaction.waitingListEntry.updateMany.mock.invocationCallOrder[0],
    );
  });
});
