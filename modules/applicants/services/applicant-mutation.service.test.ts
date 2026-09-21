import { describe, expect, it, vi } from "vitest";

import { validRegistrationInput } from "@/tests/fixtures/registration";
import type { ApplicantStatus } from "@/modules/applicants/domain/state-machine";
import {
  ApplicantMutationError,
  ApplicantMutationService,
  type ApplicantMutationRepository,
} from "./applicant-mutation.service";

const NOW = new Date("2026-09-03T12:00:00.000Z");
const APPLICANT = {
  id: "applicant-1",
  registrationNumber: "LA-2026-000123",
  firstName: "Mario",
  lastName: "Rossi",
  fiscalCode: "RSSMRA18E12A662X",
  status: "DA_CHIAMARE" as ApplicantStatus,
  recipients: ["anna@example.it", "luigi@example.it"],
};

function setup(status: ApplicantStatus = "DA_CHIAMARE") {
  const repository: ApplicantMutationRepository = {
    getApplicant: vi.fn(async () => ({ ...APPLICANT, status })),
    updateApplicant: vi.fn(async () => true),
    transitionStatus: vi.fn(async (command) => {
      if (command.to === "ACCETTATO" || command.to === "RIFIUTATO") {
        return {
          changed: true as const,
          outboxId: "mail-1",
          recipients: ["anna@example.it", "luigi@example.it"],
          bccRecipients: ["capi@example.it"],
        };
      }
      return { changed: true as const, outboxId: null };
    }),
    deleteApplicant: vi.fn(async () => true),
    markMailDelivered: vi.fn(async () => undefined),
    markMailFailed: vi.fn(async () => undefined),
  };
  const mailProvider = {
    sendAcceptanceConfirmation: vi.fn(async () => undefined),
    sendRejectionConfirmation: vi.fn(async () => undefined),
  };
  const service = new ApplicantMutationService({
    repository,
    mailProvider,
    hmacSecret: "test-secret-with-at-least-32-characters",
    clock: () => NOW,
  });
  return { repository, mailProvider, service };
}

describe("ApplicantMutationService", () => {
  it("aggiorna solo i dati editabili e lascia createdAt fuori dal comando", async () => {
    const { repository, service } = setup("IN_ATTESA");
    const data = {
      minor: validRegistrationInput.minor,
      guardians: validRegistrationInput.guardians,
      createdAt: "2001-01-01T00:00:00Z",
    };

    await service.update("applicant-1", data);

    expect(repository.updateApplicant).toHaveBeenCalledWith(
      "applicant-1",
      expect.not.objectContaining({ createdAt: expect.anything() }),
    );
  });

  it("accetta un iscritto DA_CHIAMARE, persiste prima e poi invia la mail", async () => {
    const { repository, mailProvider, service } = setup();

    const result = await service.changeStatus("applicant-1", "ACCETTATO");

    expect(repository.transitionStatus).toHaveBeenCalledWith(
      expect.objectContaining({ from: "DA_CHIAMARE", to: "ACCETTATO", changedAt: NOW }),
    );
    expect(mailProvider.sendAcceptanceConfirmation).toHaveBeenCalledWith({
      applicantName: "Mario Rossi",
      registrationNumber: expect.any(String),
      recipients: ["anna@example.it", "luigi@example.it"],
      bccRecipients: ["capi@example.it"],
    });
    expect(repository.markMailDelivered).toHaveBeenCalledWith("mail-1", NOW);
    expect(result.emailDelivery).toBe("SENT");
  });

  it("registra il fallimento mail senza annullare il cambio di stato", async () => {
    const { repository, mailProvider, service } = setup();
    mailProvider.sendRejectionConfirmation.mockRejectedValueOnce(new Error("webhook offline"));

    const result = await service.changeStatus("applicant-1", "RIFIUTATO");

    expect(mailProvider.sendRejectionConfirmation).toHaveBeenCalledWith({
      applicantName: "Mario Rossi",
      registrationNumber: expect.any(String),
      recipients: ["anna@example.it", "luigi@example.it"],
      bccRecipients: ["capi@example.it"],
    });
    expect(result).toMatchObject({ status: "RIFIUTATO", emailDelivery: "FAILED" });
    expect(repository.markMailFailed).toHaveBeenCalledWith("mail-1", NOW, "webhook offline");
  });

  it("nega le transizioni non previste dalla macchina a quattro stati", async () => {
    const { repository, service } = setup("ACCETTATO");

    await expect(service.changeStatus("applicant-1", "RIFIUTATO")).rejects.toEqual(
      expect.objectContaining<Partial<ApplicantMutationError>>({ code: "INVALID_TRANSITION" }),
    );
    expect(repository.transitionStatus).not.toHaveBeenCalled();
  });

  it("crea il blocco HMAC quando rifiuta e quando elimina un rifiutato", async () => {
    const rejected = setup();
    await rejected.service.changeStatus("applicant-1", "RIFIUTATO");
    expect(rejected.repository.transitionStatus).toHaveBeenCalledWith(
      expect.objectContaining({ blockedIdentifierHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    );

    const deleting = setup("RIFIUTATO");
    await deleting.service.delete("applicant-1");
    expect(deleting.repository.deleteApplicant).toHaveBeenCalledWith(
      expect.objectContaining({ blockedIdentifierHash: expect.stringMatching(/^[a-f0-9]{64}$/) }),
    );
  });

  it("non inventa un identificatore di blocco per un record storico senza Codice Fiscale", async () => {
    const rejecting = setup();
    vi.mocked(rejecting.repository.getApplicant).mockResolvedValueOnce({
      ...APPLICANT,
      fiscalCode: null,
    });
    await rejecting.service.changeStatus("applicant-1", "RIFIUTATO");
    expect(rejecting.repository.transitionStatus).toHaveBeenCalledWith(
      expect.not.objectContaining({ blockedIdentifierHash: expect.anything() }),
    );

    const deleting = setup("RIFIUTATO");
    vi.mocked(deleting.repository.getApplicant).mockResolvedValueOnce({
      ...APPLICANT,
      fiscalCode: null,
      status: "RIFIUTATO",
    });
    await deleting.service.delete("applicant-1");
    expect(deleting.repository.deleteApplicant).toHaveBeenCalledWith({ id: "applicant-1" });
  });

  it("segnala record assente o aggiornato in concorrenza", async () => {
    const absent = setup();
    vi.mocked(absent.repository.getApplicant).mockResolvedValueOnce(null);
    await expect(absent.service.delete("missing")).rejects.toMatchObject({ code: "NOT_FOUND" });

    const stale = setup();
    vi.mocked(stale.repository.transitionStatus).mockResolvedValueOnce({ changed: false });
    await expect(stale.service.changeStatus("applicant-1", "ACCETTATO")).rejects.toMatchObject({
      code: "CONCURRENT_CHANGE",
    });
  });
});
