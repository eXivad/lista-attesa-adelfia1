import { describe, expect, it } from "vitest";

import {
  isValidFiscalCode,
  normalizeFiscalCode,
} from "./fiscal-code";
import { hashFiscalCode } from "./identifier-hash";

describe("Codice Fiscale", () => {
  it("normalizza spazi e minuscole", () => {
    expect(normalizeFiscalCode(" rss mra 80a01 h501u ")).toBe("RSSMRA80A01H501U");
  });

  it("accetta esattamente sedici caratteri alfanumerici", () => {
    expect(isValidFiscalCode("RSSMRA80A01H501U")).toBe(true);
    expect(isValidFiscalCode("RSSMRA80A01H501")).toBe(false);
    expect(isValidFiscalCode("RSSMRA80A01H501! ")).toBe(false);
  });

  it("produce un HMAC stabile senza conservare il CF", () => {
    const digest = hashFiscalCode("rssmra80a01h501u", "test-secret-with-32-characters!");

    expect(digest).toHaveLength(64);
    expect(digest).toBe(hashFiscalCode("RSS MRA 80A01 H501U", "test-secret-with-32-characters!"));
    expect(digest).not.toContain("RSSMRA80A01H501U");
  });
});
