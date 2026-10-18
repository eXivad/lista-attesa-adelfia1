import { describe, expect, it, vi } from "vitest";

import { PrismaApplicantMutationRepository } from "./applicant-mutation.repository";

function createClient() {
  const transaction = {
    waitingListEntry: {
      updateMany: vi.fn(async () => ({ count: 1 })),
      findUnique: vi.fn(async () => ({
        registrationNumber: "LA-2026-000123",
        firstName: "Mario",
        lastName: "Rossi",
        guardians: [{ email: "anna@example.it" }, { email: "luigi@example.it" }],
      })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    guardian: { upsert: vi.fn(async () => ({})), deleteMany: vi.fn(async () => ({ count: 0 })) },
    callParticipation: { updateMany: vi.fn(async () => ({ count: 1 })) },
    blockedIdentifier: { upsert: vi.fn(async () => ({})) },
    mailOutbox: { create: vi.fn(async () => ({})) },
    mailingRecipient: {
      findMany: vi.fn(async () => [
        { email: "capi@example.it" },
        { email: "ANNA@example.it" },
      ]),
    },
  };
  const client = {
    waitingListEntry: {
      findUnique: vi.fn(async () => ({
        id: "applicant-1",
        registrationNumber: "LA-2026-000123",
        firstName: "Mario",
        lastName: "Rossi",
        fiscalCode: "RSSMRA18E12A662X",
        status: "DA_CHIAMARE",
        guardians: [{ email: "anna@example.it" }, { email: "anna@example.it" }],
      })),
    },
    mailOutbox: { update: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
  return { client, transaction };
}

const updateCommand = {
  minor: {
    firstName: "Mario",
    lastName: "Rossi",
    gender: "M" as const,
    birthDate: new Date("2018-05-12T00:00:00Z"),
    birthYear: 2018,
    birthPlace: "Bari",
    birthProvince: "BA",
    fiscalCode: "RSSMRA18E12A662X",
    residenceAddress: "Via delle Querce 12",
    residenceCity: "Adelfia",
    residenceProvince: "BA",
    residencePostalCode: "70010",
    notes: "Nota",
  },
  guardians: ["A", "B"].map((type) => ({
    type: type as "A" | "B",
    firstName: "Anna",
    lastName: "Verdi",
    birthDate: new Date("1985-03-01T00:00:00Z"),
    birthPlace: "Bari",
    birthProvince: "BA",
    fiscalCode: "VRDNNA85C41A662Z",
    address: "Via Roma 1",
    city: "Adelfia",
    province: "BA",
    postalCode: "70010",
    email: "anna@example.it",
    phone: "+39 333 1234567",
  })),
};

describe("PrismaApplicantMutationRepository", () => {
  it("aggiorna dati e tutori senza scrivere campi immutabili", async () => {
    const { client, transaction } = createClient();
    const repository = new PrismaApplicantMutationRepository(client as never, { createId: () => "new-id" });

    expect(await repository.updateApplicant("applicant-1", updateCommand)).toBe(true);

    expect(transaction.waitingListEntry.updateMany).toHaveBeenCalledWith({
      where: { id: "applicant-1" },
      data: expect.objectContaining({
        residenceAddress: "Via delle Querce 12",
        residencePostalCode: "70010",
      }),
    });
    expect(transaction.guardian.upsert).toHaveBeenCalledTimes(2);
    expect(transaction.guardian.deleteMany).toHaveBeenCalledWith({
      where: { applicantId: "applicant-1", type: { notIn: ["A", "B"] } },
    });
    expect(transaction.guardian.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ postalCode: "70010" }),
        create: expect.objectContaining({ applicantId: "applicant-1", postalCode: "70010" }),
      }),
    );
  });

  it("rimuove i genitori svuotati nella modifica", async () => {
    const { client, transaction } = createClient();
    const repository = new PrismaApplicantMutationRepository(client as never);
    await repository.updateApplicant("applicant-1", { ...updateCommand, guardians: [] });
    expect(transaction.guardian.upsert).not.toHaveBeenCalled();
    expect(transaction.guardian.deleteMany).toHaveBeenCalledWith({
      where: { applicantId: "applicant-1", type: { notIn: [] } },
    });
  });

  it("rifiuta con compare-and-set, aggiorna la campagna e crea blocco e outbox", async () => {
    const { client, transaction } = createClient();
    const repository = new PrismaApplicantMutationRepository(client as never, { createId: () => "new-id" });
    const changedAt = new Date("2026-09-03T12:00:00Z");

    const result = await repository.transitionStatus({
      id: "applicant-1",
      from: "DA_CHIAMARE",
      to: "RIFIUTATO",
      changedAt,
      blockedIdentifierHash: "a".repeat(64),
    });

    expect(result).toEqual({
      changed: true,
      outboxId: "new-id",
      recipients: ["anna@example.it", "luigi@example.it"],
      bccRecipients: ["capi@example.it"],
    });
    expect(transaction.waitingListEntry.updateMany).toHaveBeenCalledWith({
      where: { id: "applicant-1", status: "DA_CHIAMARE" },
      data: { status: "RIFIUTATO", terminalStatusAt: changedAt },
    });
    expect(transaction.callParticipation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { outcome: "RIFIUTATO" } }),
    );
    expect(transaction.blockedIdentifier.upsert).toHaveBeenCalledOnce();
    expect(transaction.mailOutbox.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "REJECTION_CONFIRMATION",
          recipients: ["anna@example.it", "luigi@example.it", "capi@example.it"],
        }),
      }),
    );
  });

  it("non produce effetti successivi se lo stato è cambiato in concorrenza", async () => {
    const { client, transaction } = createClient();
    transaction.waitingListEntry.updateMany.mockResolvedValueOnce({ count: 0 });
    const repository = new PrismaApplicantMutationRepository(client as never);

    expect(await repository.transitionStatus({
      id: "applicant-1",
      from: "DA_CHIAMARE",
      to: "ACCETTATO",
      changedAt: new Date(),
    })).toEqual({ changed: false });
    expect(transaction.mailOutbox.create).not.toHaveBeenCalled();
  });

  it("mantiene il blocco prima di cancellare un rifiutato", async () => {
    const { client, transaction } = createClient();
    const repository = new PrismaApplicantMutationRepository(client as never, { createId: () => "new-id" });

    expect(await repository.deleteApplicant({ id: "applicant-1", blockedIdentifierHash: "b".repeat(64) })).toBe(true);
    expect(transaction.blockedIdentifier.upsert).toHaveBeenCalledOnce();
    expect(transaction.waitingListEntry.deleteMany).toHaveBeenCalledWith({ where: { id: "applicant-1" } });
  });

  it("deduplica i destinatari letti dal dettaglio", async () => {
    const { client } = createClient();
    const repository = new PrismaApplicantMutationRepository(client as never);

    await expect(repository.getApplicant("applicant-1")).resolves.toMatchObject({
      recipients: ["anna@example.it"],
    });
  });
});
