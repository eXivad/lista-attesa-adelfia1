import { describe, expect, it, vi } from "vitest";

import { PrismaApplicantQueryRepository } from "./applicant-query.repository";

function createClient() {
  const client = {
    waitingListEntry: {
      findMany: vi.fn(async (args?: unknown) => {
        void args;
        return [{
          id: "01-oldest",
          registrationNumber: "LA-2026-000001",
          firstName: "Mario",
          lastName: "Rossi",
          gender: "M",
          birthDate: new Date("2018-05-12"),
          birthYear: 2018,
          createdAt: new Date("2026-01-01T10:00:00Z"),
          status: "IN_ATTESA",
          guardians: [{ firstName: "Anna", lastName: "Verdi", email: "anna@example.it", phone: "3331234567" }],
        }];
      }),
      count: vi.fn(async (args?: unknown) => {
        void args;
        return 25;
      }),
      findUnique: vi.fn(async (args?: unknown) => {
        void args;
        return null;
      }),
    },
    branchConfiguration: {
      findMany: vi.fn(async () => [
        { branch: "LC", minAge: 8, maxAge: 11, entryAge: 8 },
      ]),
    },
    associativeYear: {
      findFirst: vi.fn(async () => ({ startYear: 2026 })),
    },
    $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
  };
  return client;
}

describe("PrismaApplicantQueryRepository", () => {
  it("applica sempre l'ordine cronologico anche con ricerca e filtri", async () => {
    const client = createClient();
    const repository = new PrismaApplicantQueryRepository(client as never);

    const page = await repository.list({
      gender: "M",
      birthYear: 2018,
      status: "IN_ATTESA",
      query: "Rossi",
      page: 2,
      pageSize: 20,
    });

    expect(client.waitingListEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip: 20,
        take: 20,
        where: expect.objectContaining({
          gender: "M",
          birthYear: 2018,
          status: "IN_ATTESA",
          OR: expect.any(Array),
        }),
      }),
    );
    expect(page.items[0].position).toBe(21);
    expect(page.pageCount).toBe(2);
    expect(page.associativeYearStart).toBe(2026);
    expect(client.associativeYear.findFirst).toHaveBeenCalledWith({
      where: { currentKey: 1 },
      select: { startYear: true },
    });
  });

  it("cerca anche nei dati dei tutori senza cambiare l'ordine", async () => {
    const client = createClient();
    const repository = new PrismaApplicantQueryRepository(client as never);

    await repository.list({ query: "anna@example.it", page: 1, pageSize: 20 });

    const call = client.waitingListEntry.findMany.mock.calls[0]?.[0] as {
      orderBy: unknown;
      where: { OR: unknown[] };
    };
    expect(call.orderBy).toEqual([{ createdAt: "asc" }, { id: "asc" }]);
    expect(call.where.OR).toContainEqual(
      expect.objectContaining({ guardians: { some: expect.any(Object) } }),
    );
  });

  it("restituisce l'anno associativo corrente anche nel dettaglio", async () => {
    const client = createClient();
    const repository = new PrismaApplicantQueryRepository(client as never);

    const result = await repository.getById("01-oldest");

    expect(result.associativeYearStart).toBe(2026);
    expect(client.associativeYear.findFirst).toHaveBeenCalledWith({
      where: { currentKey: 1 },
      select: { startYear: true },
    });
  });
});
