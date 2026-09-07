import { describe, expect, it } from "vitest";

import { privacyPolicyInputSchema } from "./privacy-policy";

describe("privacyPolicyInputSchema", () => {
  it("normalizza versione e URL HTTPS", () => {
    expect(privacyPolicyInputSchema.parse({
      version: " 2026.2 ",
      fileUrl: " https://documenti.example.org/privacy.pdf ",
    })).toEqual({
      version: "2026.2",
      fileUrl: "https://documenti.example.org/privacy.pdf",
    });
  });

  it.each([
    "http://documenti.example.org/privacy.pdf",
    "javascript:alert(1)",
    "/privacy.pdf",
    "https://utente:password@documenti.example.org/privacy.pdf",
  ])("rifiuta un URL non sicuro: %s", (fileUrl) => {
    expect(privacyPolicyInputSchema.safeParse({ version: "2026.2", fileUrl }).success).toBe(false);
  });

  it("rifiuta versioni vuote o più lunghe del valore memorizzabile nel consenso", () => {
    expect(privacyPolicyInputSchema.safeParse({ version: " ", fileUrl: "https://example.org/p.pdf" }).success).toBe(false);
    expect(privacyPolicyInputSchema.safeParse({ version: "x".repeat(41), fileUrl: "https://example.org/p.pdf" }).success).toBe(false);
  });
});
