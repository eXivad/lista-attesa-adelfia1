import { describe, expect, it } from "vitest";

import { formatRegistrationNumber, getRegistrationYear } from "./registration-number";

describe("numero iscrizione", () => {
  it("formatta un progressivo annuale senza usarlo come posizione", () => {
    expect(formatRegistrationNumber(2026, 123)).toBe("LA-2026-000123");
  });

  it("usa l'anno civile nella timezone Europe/Rome", () => {
    expect(getRegistrationYear(new Date("2025-12-31T23:30:00.000Z"))).toBe(2026);
    expect(getRegistrationYear(new Date("2026-12-31T22:30:00.000Z"))).toBe(2026);
  });

  it("rifiuta progressivi fuori intervallo", () => {
    expect(() => formatRegistrationNumber(2026, 0)).toThrow();
    expect(() => formatRegistrationNumber(2026, 1_000_000)).toThrow();
  });
});
