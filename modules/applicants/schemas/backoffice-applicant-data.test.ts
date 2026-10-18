import { expect, it } from "vitest";

import { validRegistrationInput } from "@/tests/fixtures/registration";
import { createBackofficeApplicantDataSchema } from "./backoffice-applicant-data";

const schema = createBackofficeApplicantDataSchema(() => new Date("2026-09-03T12:00:00Z"), true);

it("accetta solo i dati minimi del minore senza genitori", () => {
  const result = schema.parse({
    minor: { ...validRegistrationInput.minor, fiscalCode: "", residenceProvince: "" },
    guardians: [],
  });
  expect(result.minor.fiscalCode).toBeNull();
  expect(result.minor.residenceProvince).toBeNull();
  expect(result.guardians).toEqual([]);
});

it("controlla i valori presenti anche se il campo è facoltativo", () => {
  const result = schema.safeParse({
    minor: { ...validRegistrationInput.minor, fiscalCode: "non-valido" },
    guardians: [],
  });
  expect(result.success).toBe(false);
});
