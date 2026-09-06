import { describe, expect, it, vi } from "vitest";

import type { CreateRegistrationCommand } from "@/modules/applicants/services/registration.service";
import { DuplicateApplicantError } from "@/modules/applicants/services/registration.service";
import { PrismaApplicantRegistrationRepository } from "./applicant-registration.repository";

const command: CreateRegistrationCommand = {
  createdAt: new Date("2026-09-03T12:00:00.000Z"),
  privacyAcceptedAt: new Date("2026-09-03T12:00:00.000Z"),
  privacyPolicyVersion: "2026.1",
  status: "IN_ATTESA",
  minor: {
    firstName: "Mario",
    lastName: "Rossi",
    gender: "M",
    birthDate: new Date("2018-05-12T00:00:00.000Z"),
    birthYear: 2018,
    birthPlace: "Bari",
    birthProvince: "BA",
    fiscalCode: "RSSMRA18E12A662X",
    residenceAddress: "Via delle Querce 12",
    residenceCity: "Adelfia",
    residenceProvince: "BA",
    residencePostalCode: "70010",
    notes: "",
  },
  guardians: [
    {
      type: "A",
      firstName: "Anna",
      lastName: "Verdi",
      birthDate: new Date("1985-03-01T00:00:00.000Z"),
      birthPlace: "Bari",
      birthProvince: "BA",
      fiscalCode: "VRDNNA85C41A662Z",
      address: "Via Roma 1",
      city: "Adelfia",
      province: "BA",
      postalCode: "70010",
      email: "anna@example.it",
      phone: "+39 333 1234567",
    },
    {
      type: "B",
      firstName: "Luigi",
      lastName: "Rossi",
      birthDate: new Date("1983-08-22T00:00:00.000Z"),
      birthPlace: "Bari",
      birthProvince: "BA",
      fiscalCode: "RSSLGU83M22A662Y",
      address: "Via Roma 1",
      city: "Adelfia",
      province: "BA",
      postalCode: "70010",
      email: "luigi@example.it",
      phone: "+39 333 7654321",
    },
  ],
};

function createPrismaDouble() {
  const transaction = {
    registrationCounter: {
      upsert: vi.fn(async () => ({ lastValue: 123 })),
    },
    mailingRecipient: {
      findMany: vi.fn(async () => [{ email: "capigruppo@example.it" }]),
    },
    waitingListEntry: {
      create: vi.fn(async () => ({ id: "entry-id" })),
    },
  };

  const client = {
    privacyPolicyVersion: {
      findFirst: vi.fn(async () => ({ version: "2026.1" })),
    },
    associativeYear: {
      findFirst: vi.fn(async () => null),
    },
    branchConfiguration: {
      findMany: vi.fn(async () => [
        { branch: "LC", minAge: 8, maxAge: 11, entryAge: 8 },
      ]),
    },
    blockedIdentifier: {
      findUnique: vi.fn(async () => null),
    },
    mailOutbox: {
      update: vi.fn(async () => ({})),
    },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };

  return { client, transaction };
}

describe("PrismaApplicantRegistrationRepository", () => {
  it("crea contatore, pratica, due tutori e outbox nella stessa transazione", async () => {
    const { client, transaction } = createPrismaDouble();
    const ids = ["entry-id", "guardian-a", "guardian-b", "outbox-id"];
    const repository = new PrismaApplicantRegistrationRepository(client as never, {
      createId: () => ids.shift()!,
    });

    const result = await repository.createRegistration(command);

    expect(client.$transaction).toHaveBeenCalledOnce();
    expect(transaction.registrationCounter.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { year: 2026 }, update: { lastValue: { increment: 1 } } }),
    );
    expect(transaction.waitingListEntry.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "entry-id",
        registrationNumber: "LA-2026-000123",
        fiscalCode: "RSSMRA18E12A662X",
        residencePostalCode: "70010",
        guardians: { create: expect.arrayContaining([expect.objectContaining({ type: "A", postalCode: "70010" }), expect.objectContaining({ type: "B", postalCode: "70010" })]) },
        mailOutbox: {
          create: expect.objectContaining({
            id: "outbox-id",
            recipients: ["anna@example.it", "luigi@example.it", "capigruppo@example.it"],
            payload: {
              applicantName: "Mario Rossi",
              applicantBirthDate: "2018-05-12T00:00:00.000Z",
              registrationNumber: "LA-2026-000123",
            },
          }),
        },
      }),
      select: { id: true },
    });
    expect(result).toEqual({
      id: "entry-id",
      registrationNumber: "LA-2026-000123",
      status: "IN_ATTESA",
      outboxId: "outbox-id",
      recipients: ["anna@example.it", "luigi@example.it", "capigruppo@example.it"],
    });
  });

  it("mappa una collisione univoca Prisma nell'errore dominio duplicato", async () => {
    const { client, transaction } = createPrismaDouble();
    transaction.waitingListEntry.create.mockRejectedValueOnce({ code: "P2002" });
    const repository = new PrismaApplicantRegistrationRepository(client as never);

    await expect(repository.createRegistration(command)).rejects.toBeInstanceOf(DuplicateApplicantError);
  });

  it("restituisce solo configurazione privacy, anno aperto e branche correnti", async () => {
    const { client } = createPrismaDouble();
    client.associativeYear.findFirst.mockResolvedValueOnce({ id: "year-1", startYear: 2026 } as never);
    const repository = new PrismaApplicantRegistrationRepository(client as never);

    await expect(repository.getRegistrationContext()).resolves.toEqual({
      activePrivacyPolicyVersion: "2026.1",
      openCalls: { associativeYearId: "year-1", startYear: 2026 },
      branchConfiguration: [
        { branch: "LC", minAge: 8, maxAge: 11, entryAge: 8 },
      ],
    });
    expect(client.associativeYear.findFirst).toHaveBeenCalledWith({
      where: { currentKey: 1, status: "CALLS_OPEN" },
      select: { id: true, startYear: true },
    });
  });
});
