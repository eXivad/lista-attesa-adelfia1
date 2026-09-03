import { describe, expect, it } from "vitest";

import { calculateAge, isEligibleAge } from "./age";

describe("età di iscrizione", () => {
  const referenceDate = new Date("2026-09-03T12:00:00.000Z");

  it("calcola l'età rispettando mese e giorno", () => {
    expect(calculateAge(new Date("2005-09-03T00:00:00.000Z"), referenceDate)).toBe(21);
    expect(calculateAge(new Date("2004-09-04T00:00:00.000Z"), referenceDate)).toBe(21);
    expect(calculateAge(new Date("2004-09-03T00:00:00.000Z"), referenceDate)).toBe(22);
  });

  it("ammette chi è già nato e non ha più di 21 anni", () => {
    expect(isEligibleAge(new Date("2026-09-03T00:00:00.000Z"), referenceDate)).toBe(true);
    expect(isEligibleAge(new Date("2004-09-04T00:00:00.000Z"), referenceDate)).toBe(true);
    expect(isEligibleAge(new Date("2004-09-03T00:00:00.000Z"), referenceDate)).toBe(false);
    expect(isEligibleAge(new Date("2026-09-04T00:00:00.000Z"), referenceDate)).toBe(false);
  });
});
