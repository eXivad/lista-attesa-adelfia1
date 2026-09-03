import { describe, expect, it } from "vitest";

import { validRegistrationInput } from "@/tests/fixtures/registration";
import { createApplicantRegistrationSchema } from "./registration";

const now = new Date("2026-09-03T12:00:00.000Z");

describe("schema iscrizione", () => {
  const schema = createApplicantRegistrationSchema(() => now);

  it("accetta un'iscrizione completa con due tutori", () => {
    expect(schema.safeParse(validRegistrationInput).success).toBe(true);
  });

  it("richiede esattamente due tutori A e B", () => {
    expect(schema.safeParse({ ...validRegistrationInput, guardians: [validRegistrationInput.guardians[0]] }).success).toBe(false);
    expect(
      schema.safeParse({
        ...validRegistrationInput,
        guardians: validRegistrationInput.guardians.map((guardian) => ({ ...guardian, type: "A" })),
      }).success,
    ).toBe(false);
  });

  it("richiede consenso privacy esplicito", () => {
    expect(schema.safeParse({ ...validRegistrationInput, privacyAccepted: false }).success).toBe(false);
  });

  it("rifiuta CF, email, provincia e data del minore non validi", () => {
    const result = schema.safeParse({
      ...validRegistrationInput,
      minor: {
        ...validRegistrationInput.minor,
        birthDate: "2000-01-01",
        birthProvince: "BARI",
        fiscalCode: "corto",
      },
      guardians: [
        { ...validRegistrationInput.guardians[0], email: "non-una-email" },
        validRegistrationInput.guardians[1],
      ],
    });

    expect(result.success).toBe(false);
  });
});
