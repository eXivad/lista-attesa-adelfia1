import { expect, it } from "vitest";

import { applicantDataFromFormData } from "./applicant-form-data";

it("mappa i soli campi editabili del FormData e tratta file/mancanti come stringa vuota", () => {
  const form = new FormData();
  form.set("minor.firstName", "Mario");
  form.set("minor.gender", "M");
  form.set("guardian.A.email", "anna@example.it");
  form.set("guardian.B.email", "luigi@example.it");
  const result = applicantDataFromFormData(form);
  expect(result.minor.firstName).toBe("Mario");
  expect(result.minor.lastName).toBe("");
  expect(result.guardians.map((guardian) => guardian.type)).toEqual(["A", "B"]);
  expect(result.guardians[1].email).toBe("luigi@example.it");
});
