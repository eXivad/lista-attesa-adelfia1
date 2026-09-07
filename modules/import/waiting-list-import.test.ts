import { describe, expect, it } from "vitest";

import { validRegistrationInput } from "@/tests/fixtures/registration";
import { prepareImportRows } from "./waiting-list-import";

function row(overrides: Record<string, unknown> = {}) {
  return {
    firstName: validRegistrationInput.minor.firstName,
    lastName: validRegistrationInput.minor.lastName,
    gender: validRegistrationInput.minor.gender,
    birthDate: validRegistrationInput.minor.birthDate,
    birthPlace: validRegistrationInput.minor.birthPlace,
    birthProvince: validRegistrationInput.minor.birthProvince,
    fiscalCode: validRegistrationInput.minor.fiscalCode,
    residenceAddress: validRegistrationInput.minor.residenceAddress,
    residenceCity: validRegistrationInput.minor.residenceCity,
    residenceProvince: validRegistrationInput.minor.residenceProvince,
    residencePostalCode: validRegistrationInput.minor.residencePostalCode,
    notes: validRegistrationInput.minor.notes,
    createdAt: "2024-05-10T10:30:00+02:00",
    privacyAcceptedAt: "2024-05-10T10:29:00+02:00",
    ...Object.fromEntries(validRegistrationInput.guardians.flatMap((guardian) => Object.entries(guardian).map(([key, value]) => [`guardian${guardian.type}${key[0].toUpperCase()}${key.slice(1)}`, value]))),
    ...overrides,
  };
}

describe("preparazione import lista storica", () => {
  it("ordina per timestamp originale, forza IN_ATTESA e mantiene l'indice come spareggio", () => {
    const result = prepareImportRows([
      row({ lastName: "Verdi", fiscalCode: "RSSMRA18E12A662A", createdAt: "2024-05-11T10:30:00+02:00" }),
      row({ fiscalCode: "RSSMRA18E12A662B", createdAt: "2024-05-10T10:30:00+02:00" }),
    ], { mode: "complete", privacyPolicyVersion: "2026.1" }, new Date("2026-09-03T12:00:00Z"));

    expect(result.errors).toEqual([]);
    expect(result.valid.map((item) => item.minor.fiscalCode)).toEqual(["RSSMRA18E12A662B", "RSSMRA18E12A662A"]);
    expect(result.valid.every((item) => item.status === "IN_ATTESA")).toBe(true);
    expect(result.valid[0].createdAt.toISOString()).toBe("2024-05-10T08:30:00.000Z");
    expect(result.valid[0].minor.residencePostalCode).toBe("70010");
    expect(result.valid[0].guardians.every((guardian) => guardian.postalCode === "70010")).toBe(true);
  });

  it("segnala righe invalide e CF duplicati nel file", () => {
    const result = prepareImportRows(
      [row(), row(), row({ email: "x", birthDate: "invalid" })],
      { mode: "complete", privacyPolicyVersion: "2026.1" },
      new Date("2026-09-03T12:00:00Z"),
    );
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, code: "DUPLICATE_IN_FILE" }),
      expect.objectContaining({ row: 4, code: "INVALID_ROW" }),
    ]));
  });

  it("importa record legacy senza inventare dati o consenso privacy", () => {
    const result = prepareImportRows([row({
      birthDate: "12/05/2018",
      createdAt: "06/09/2024 10:30",
      birthPlace: "",
      birthProvince: "",
      fiscalCode: "",
      residenceAddress: "",
      residenceCity: "",
      residencePostalCode: "",
      privacyAcceptedAt: "",
      guardianAFirstName: "Anna",
      guardianALastName: "",
      guardianABirthDate: "",
      guardianABirthPlace: "",
      guardianABirthProvince: "",
      guardianAFiscalCode: "",
      guardianAAddress: "",
      guardianACity: "",
      guardianAProvince: "",
      guardianAPostalCode: "",
      guardianAEmail: "",
      guardianAPhone: "+39 333 1234567",
      guardianBFirstName: "",
      guardianBLastName: "",
      guardianBBirthDate: "",
      guardianBBirthPlace: "",
      guardianBBirthProvince: "",
      guardianBFiscalCode: "",
      guardianBAddress: "",
      guardianBCity: "",
      guardianBProvince: "",
      guardianBPostalCode: "",
      guardianBEmail: "",
      guardianBPhone: "",
    })], { mode: "legacy", timeZone: "Europe/Rome" }, new Date("2026-09-03T12:00:00Z"));

    expect(result.errors).toEqual([]);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0]).toMatchObject({
      privacyAccepted: false,
      privacyAcceptedAt: null,
      privacyPolicyVersion: null,
      minor: {
        birthPlace: null,
        fiscalCode: null,
        residenceAddress: null,
      },
      guardians: [{ type: "A", firstName: "Anna", lastName: null, phone: "+39 333 1234567" }],
    });
    expect(result.valid[0].minor.birthDate.toISOString()).toBe("2018-05-12T00:00:00.000Z");
    expect(result.valid[0].createdAt.toISOString()).toBe("2024-09-06T08:30:00.000Z");
  });

  it("rileva duplicati legacy tramite nome, cognome e data di nascita", () => {
    const legacy = {
      ...row(),
      birthDate: "12/05/2018",
      createdAt: "06/09/2024 10:30",
      fiscalCode: "",
      privacyAcceptedAt: "",
    };
    const result = prepareImportRows([legacy, legacy], { mode: "legacy" });

    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 3, code: "DUPLICATE_IN_FILE" }),
    ]);
  });

  it("rifiuta il segnaposto 1900 per una data storica sconosciuta", () => {
    const result = prepareImportRows([
      row({ createdAt: "01/01/1900 00:00", fiscalCode: "", privacyAcceptedAt: "" }),
    ], { mode: "legacy" }, new Date("2026-09-03T12:00:00Z"));

    expect(result.valid).toEqual([]);
    expect(result.errors).toEqual([
      expect.objectContaining({ row: 2, code: "INVALID_ROW", message: expect.stringContaining("2000") }),
    ]);
  });
});
