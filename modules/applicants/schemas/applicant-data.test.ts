import { describe, expect, it } from "vitest";

import { validRegistrationInput } from "@/tests/fixtures/registration";
import { createApplicantDataSchema } from "./applicant-data";

const NOW = new Date("2026-09-03T12:00:00.000Z");

describe("schema modifica iscritto", () => {
  it("normalizza CF, province ed email senza accettare campi di sistema", () => {
    const parsed = createApplicantDataSchema(() => NOW).parse({
      minor: { ...validRegistrationInput.minor, fiscalCode: " rssmra18e12a662x " },
      guardians: validRegistrationInput.guardians.map((guardian) => ({
        ...guardian,
        email: guardian.email.toUpperCase(),
      })),
      createdAt: "2001-01-01T00:00:00Z",
      status: "ACCETTATO",
    });

    expect(parsed.minor.fiscalCode).toBe("RSSMRA18E12A662X");
    expect(parsed.guardians[0].email).toBe("anna@example.it");
    expect(parsed).not.toHaveProperty("createdAt");
    expect(parsed).not.toHaveProperty("status");
  });

  it("continua a richiedere esattamente i tutori A e B", () => {
    const result = createApplicantDataSchema(() => NOW).safeParse({
      minor: validRegistrationInput.minor,
      guardians: [validRegistrationInput.guardians[0]],
    });

    expect(result.success).toBe(false);
  });
});
