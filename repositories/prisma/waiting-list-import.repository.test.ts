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
      findFirst: vi.fn(async () => null as { id: string } | null),
      create: vi.fn(async () => ({})),
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
    expect(transaction.waitingListEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fiscalCode: null,
        privacyAccepted: false,
        privacyAcceptedAt: null,
        privacyPolicyVersion: null,
        guardians: {
          create: [expect.objectContaining({ id: "guardian-id", email: null })],
        },
      }),
    });
  });

  it("interrompe il lotto se un record compare nel database durante l'importazione", async () => {
    const { client, transaction } = createClient();
    transaction.waitingListEntry.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "already-there" });
    const repository = new PrismaWaitingListImportRepository(client as never, {
      createId: () => "generated-id",
    });

    await expect(repository.importRows([
      legacyRow,
      { ...legacyRow, sourceRow: 3, minor: { ...legacyRow.minor, firstName: "Luca" } },
    ])).rejects.toEqual(expect.objectContaining<Partial<WaitingListImportConflictError>>({
      sourceRow: 3,
    }));
    expect(client.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 30_000 });
  });
});
