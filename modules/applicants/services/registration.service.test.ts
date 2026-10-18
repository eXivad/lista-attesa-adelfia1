import { describe, expect, it, vi } from "vitest";

import { validRegistrationInput } from "@/tests/fixtures/registration";
import type { BranchConfiguration } from "@/modules/branches/domain/branch";
import {
  ApplicantRegistrationService,
  type ApplicantRegistrationRepository,
} from "./registration.service";

const NOW = new Date("2026-09-03T12:00:00.000Z");
const branchConfiguration: BranchConfiguration[] = [
  { branch: "LC", minAge: 8, maxAge: 11, entryAge: 8 },
  { branch: "EG", minAge: 12, maxAge: 15, entryAge: 12 },
  { branch: "RS", minAge: 16, maxAge: 21, entryAge: 16 },
];

function createDependencies(overrides: Partial<ApplicantRegistrationRepository> = {}) {
  const repository: ApplicantRegistrationRepository = {
    getRegistrationContext: vi.fn(async () => ({
      activePrivacyPolicyVersion: "2026.1",
      openCalls: null,
      branchConfiguration,
    })),
    isIdentifierBlocked: vi.fn(async () => false),
    createRegistration: vi.fn(async (command) => ({
      id: "01K4ADELFIATEST0000000000",
      registrationNumber: "LA-2026-000123",
      status: command.status,
      outboxId: "mail-1",
      recipients: ["anna@example.it", "luigi@example.it"],
      bccRecipients: ["capi@example.it"],
    })),
    markMailDelivered: vi.fn(async () => undefined),
    markMailFailed: vi.fn(async () => undefined),
    ...overrides,
  };

  const mailProvider = {
    sendRegistrationConfirmation: vi.fn(async () => undefined),
  };

  const service = new ApplicantRegistrationService({
    repository,
    mailProvider,
    hmacSecret: "test-secret-with-at-least-32-characters",
    clock: () => NOW,
  });

  return { repository, mailProvider, service };
}

describe("ApplicantRegistrationService", () => {
  it("crea una pratica interna con un solo genitore parziale senza consenso o invio email", async () => {
    const { repository, mailProvider, service } = createDependencies();
    const input = {
      minor: { ...validRegistrationInput.minor, fiscalCode: "", residenceAddress: "" },
      guardians: [
        { ...validRegistrationInput.guardians[0], birthDate: "", fiscalCode: "", email: "" },
        { ...validRegistrationInput.guardians[1], firstName: "", lastName: "", birthDate: "",
          birthPlace: "", birthProvince: "", fiscalCode: "", address: "", city: "",
          province: "", postalCode: "", email: "", phone: "" },
      ],
    };

    const result = await service.registerFromBackoffice(input);

    expect(result.registrationNumber).toBe("LA-2026-000123");
    expect(repository.createRegistration).toHaveBeenCalledWith(expect.objectContaining({
      privacyAcceptedAt: null,
      privacyPolicyVersion: null,
      sendConfirmationEmail: false,
      minor: expect.objectContaining({ fiscalCode: null, residenceAddress: null }),
      guardians: [expect.objectContaining({ type: "A", birthDate: null, email: null })],
    }));
    expect(repository.isIdentifierBlocked).not.toHaveBeenCalled();
    expect(mailProvider.sendRegistrationConfirmation).not.toHaveBeenCalled();
    expect(result.emailDelivery).toBe("NOT_SENT");
  });

  it("registra il consenso cartaceo e invia la conferma al solo genitore con email", async () => {
    const { repository, mailProvider, service } = createDependencies();
    const result = await service.registerFromBackoffice({
      minor: validRegistrationInput.minor,
      guardians: [{ ...validRegistrationInput.guardians[0], birthDate: "", fiscalCode: "" }],
      privacyAccepted: true,
      privacyPolicyVersion: "2026.1",
    });
    expect(repository.createRegistration).toHaveBeenCalledWith(expect.objectContaining({
      privacyAcceptedAt: NOW,
      privacyPolicyVersion: "2026.1",
      sendConfirmationEmail: true,
    }));
    expect(mailProvider.sendRegistrationConfirmation).toHaveBeenCalledOnce();
    expect(result.emailDelivery).toBe("SENT");
  });

  it("non registra una firma cartacea riferita a una versione privacy scaduta", async () => {
    const { repository, service } = createDependencies();
    await expect(service.registerFromBackoffice({
      minor: validRegistrationInput.minor,
      guardians: [],
      privacyAccepted: true,
      privacyPolicyVersion: "2025.1",
    })).rejects.toMatchObject({ code: "PRIVACY_VERSION_EXPIRED" });
    expect(repository.createRegistration).not.toHaveBeenCalled();
  });

  it("crea la pratica in attesa con dati normalizzati e invia la conferma", async () => {
    const { repository, mailProvider, service } = createDependencies();

    const result = await service.register(validRegistrationInput);

    expect(result).toEqual({
      id: "01K4ADELFIATEST0000000000",
      registrationNumber: "LA-2026-000123",
      status: "IN_ATTESA",
      emailDelivery: "SENT",
    });
    expect(repository.createRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: NOW,
        status: "IN_ATTESA",
        minor: expect.objectContaining({
          fiscalCode: "RSSMRA18E12A662X",
          birthYear: 2018,
          residenceAddress: "Via delle Querce 12",
          residencePostalCode: "70010",
        }),
        guardians: expect.arrayContaining([
          expect.objectContaining({ type: "A", postalCode: "70010" }),
          expect.objectContaining({ type: "B", postalCode: "70010" }),
        ]),
      }),
    );
    expect(mailProvider.sendRegistrationConfirmation).toHaveBeenCalledWith({
      applicantName: "Mario Rossi",
      applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
      bccRecipients: ["capi@example.it"],
    });
    expect(repository.markMailDelivered).toHaveBeenCalledWith("mail-1", NOW);
  });

  it("crea direttamente DA_CHIAMARE se l'anno di nascita è eleggibile", async () => {
    const { repository, service } = createDependencies({
      getRegistrationContext: vi.fn(async () => ({
        activePrivacyPolicyVersion: "2026.1",
        openCalls: { associativeYearId: "year-1", startYear: 2026 },
        branchConfiguration,
      })),
    });

    const result = await service.register(validRegistrationInput);

    expect(result.status).toBe("DA_CHIAMARE");
    expect(repository.createRegistration).toHaveBeenCalledWith(
      expect.objectContaining({ status: "DA_CHIAMARE", associativeYearId: "year-1", branch: "LC" }),
    );
  });

  it("nega duplicati o identificatori bloccati con un messaggio non rivelatore", async () => {
    const { service } = createDependencies({ isIdentifierBlocked: vi.fn(async () => true) });

    await expect(service.register(validRegistrationInput)).rejects.toMatchObject({
      code: "ALREADY_REGISTERED",
      userMessage: "Questo ragazzo risulta già registrato nella lista d'attesa. Contattare il Gruppo o i Capi Gruppo per maggiori informazioni.",
    });
  });

  it("mantiene valida la pratica e registra il fallimento se la mail non parte", async () => {
    const { repository, mailProvider, service } = createDependencies();
    mailProvider.sendRegistrationConfirmation.mockRejectedValueOnce(new Error("provider non disponibile"));

    const result = await service.register(validRegistrationInput);

    expect(result.emailDelivery).toBe("FAILED");
    expect(repository.markMailFailed).toHaveBeenCalledWith("mail-1", NOW, "provider non disponibile");
  });

  it("rifiuta una versione privacy non più attiva", async () => {
    const { service } = createDependencies();

    await expect(
      service.register({ ...validRegistrationInput, privacyPolicyVersion: "2025.1" }),
    ).rejects.toMatchObject({ code: "PRIVACY_VERSION_EXPIRED" });
  });
});
