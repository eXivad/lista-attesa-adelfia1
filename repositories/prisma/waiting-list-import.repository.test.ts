import { describe, expect, it, vi } from "vitest";

import type { PreparedImportRow } from "@/modules/import/waiting-list-import";
import {
  PrismaWaitingListImportRepository,
  WaitingListImportConflictError,
} from "./waiting-list-import.repository";

const legacyRow: PreparedImportRow = {
  sourceRow: 2,
  createdAt: new Date("2024-09-06T08:30:00.000Z"),
  privacyAccepted: false,
  privacyAcceptedAt: null,
  privacyPolicyVersion: null,
  status: "IN_ATTESA",
  duplicateKeys: ["identity:MARIO|ROSSI|2018-05-12"],
  minor: {
    firstName: "Mario",
    lastName: "Rossi",
    gender: "M",
    birthDate: new Date("2018-05-12T00:00:00.000Z"),
    birthYear: 2018,
    birthPlace: null,
    birthProvince: null,
    fiscalCode: null,
    residenceAddress: null,
    residenceCity: null,
    residenceProvince: "BA",
    residencePostalCode: null,
    notes: "",
  },
  guardians: [{
    type: "A",
    firstName: null,
    lastName: null,
    birthDate: null,
    birthPlace: null,
    birthProvince: null,
    fiscalCode: null,
    address: null,
    city: null,
    province: null,
    postalCode: null,
    email: null,
    phone: "+39 333 1234567",
  }],
};

function createClient() {
  const transaction = {
    waitingListEntry: {
      findMany: vi.fn(async () => [] as Array<{
        firstName: string;
        lastName: string;
        birthDate: Date;
        fiscalCode: string | null;
      }>),
      createMany: vi.fn(async (arguments_: { data: unknown[] }) => {
        void arguments_;
        return { count: 1 };
      }),
    },
    guardian: {
      createMany: vi.fn(async (arguments_: { data: unknown[] }) => {
        void arguments_;
        return { count: 1 };
      }),
    },
    registrationCounter: {
      upsert: vi.fn(async () => ({ lastValue: 7 })),
    },
  };
  const client = {
    privacyPolicyVersion: { findUnique: vi.fn(async () => null) },
    waitingListEntry: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
  return { client, transaction };
}

describe("PrismaWaitingListImportRepository", () => {
  it("importa i campi storici nulli e il consenso non registrato nella stessa transazione", async () => {
    const { client, transaction } = createClient();
    const ids = ["entry-id", "guardian-id"];
    const repository = new PrismaWaitingListImportRepository(client as never, {
      createId: () => ids.shift()!,
    });

    await expect(repository.importRows([legacyRow])).resolves.toEqual([{
      row: 2,
      id: "entry-id",
      registrationNumber: "LA-2024-000007",
    }]);
    expect(client.$transaction).toHaveBeenCalledOnce();
    expect(transaction.waitingListEntry.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        fiscalCode: null,
        privacyAccepted: false,
        privacyAcceptedAt: null,
        privacyPolicyVersion: null,
      })],
    });
    expect(transaction.guardian.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        id: "guardian-id",
        applicantId: "entry-id",
        email: null,
      })],
    });
  });

  it("interrompe il lotto se un record compare nel database durante l'importazione", async () => {
    const { client, transaction } = createClient();
    transaction.waitingListEntry.findMany.mockResolvedValueOnce([{
      firstName: "Luca",
      lastName: "Rossi",
      birthDate: legacyRow.minor.birthDate,
      fiscalCode: null,
    }]);
    const repository = new PrismaWaitingListImportRepository(client as never, {
      createId: () => "generated-id",
    });

    await expect(repository.importRows([
      legacyRow,
      { ...legacyRow, sourceRow: 3, minor: { ...legacyRow.minor, firstName: "Luca" } },
    ])).rejects.toEqual(expect.objectContaining<Partial<WaitingListImportConflictError>>({
      sourceRow: 3,
    }));
    expect(transaction.registrationCounter.upsert).not.toHaveBeenCalled();
    expect(transaction.waitingListEntry.createMany).not.toHaveBeenCalled();
    expect(client.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 120_000 });
  });

  it("alloca i progressivi per anno e inserisce il lotto con due sole scritture bulk", async () => {
    const { client, transaction } = createClient();
    transaction.registrationCounter.upsert
      .mockResolvedValueOnce({ lastValue: 11 })
      .mockResolvedValueOnce({ lastValue: 4 });
    const ids = ["entry-1", "guardian-1", "entry-2", "guardian-2", "entry-3", "guardian-3"];
    const repository = new PrismaWaitingListImportRepository(client as never, {
      createId: () => ids.shift()!,
    });
    const rows = [
      legacyRow,
      {
        ...legacyRow,
        sourceRow: 3,
        minor: { ...legacyRow.minor, firstName: "Luca" },
      },
      {
        ...legacyRow,
        sourceRow: 4,
        createdAt: new Date("2025-01-02T08:30:00.000Z"),
        minor: { ...legacyRow.minor, firstName: "Anna" },
      },
    ];

    await expect(repository.importRows(rows)).resolves.toEqual([
      { row: 2, id: "entry-1", registrationNumber: "LA-2024-000010" },
      { row: 3, id: "entry-2", registrationNumber: "LA-2024-000011" },
      { row: 4, id: "entry-3", registrationNumber: "LA-2025-000004" },
    ]);
    expect(transaction.registrationCounter.upsert).toHaveBeenNthCalledWith(1, {
      where: { year: 2024 },
      create: { year: 2024, lastValue: 2 },
      update: { lastValue: { increment: 2 } },
      select: { lastValue: true },
    });
    expect(transaction.registrationCounter.upsert).toHaveBeenNthCalledWith(2, {
      where: { year: 2025 },
      create: { year: 2025, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
      select: { lastValue: true },
    });
    expect(transaction.waitingListEntry.createMany).toHaveBeenCalledOnce();
    expect(transaction.waitingListEntry.createMany.mock.calls[0]?.[0].data).toHaveLength(3);
    expect(transaction.guardian.createMany).toHaveBeenCalledOnce();
    expect(transaction.guardian.createMany.mock.calls[0]?.[0].data).toHaveLength(3);
  });
});
