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
      row({ fiscalCode: "RSSMRA18E12A662A", createdAt: "2024-05-11T10:30:00+02:00" }),
      row({ fiscalCode: "RSSMRA18E12A662B", createdAt: "2024-05-10T10:30:00+02:00" }),
    ], "2026.1", new Date("2026-09-03T12:00:00Z"));

    expect(result.errors).toEqual([]);
    expect(result.valid.map((item) => item.minor.fiscalCode)).toEqual(["RSSMRA18E12A662B", "RSSMRA18E12A662A"]);
    expect(result.valid.every((item) => item.status === "IN_ATTESA")).toBe(true);
    expect(result.valid[0].createdAt.toISOString()).toBe("2024-05-10T08:30:00.000Z");
  });

  it("segnala righe invalide e CF duplicati nel file", () => {
    const result = prepareImportRows([row(), row(), row({ email: "x", birthDate: "invalid" })], "2026.1", new Date("2026-09-03T12:00:00Z"));
    expect(result.valid).toHaveLength(1);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, code: "DUPLICATE_IN_FILE" }),
      expect.objectContaining({ row: 4, code: "INVALID_ROW" }),
    ]));
  });
});
