import { describe, expect, it } from "vitest";

import { redactTechnicalMessage } from "./redact-technical-message";

describe("redactTechnicalMessage", () => {
  it("rimuove URL ed email dai dettagli tecnici salvati nell'outbox", () => {
    expect(
      redactTechnicalMessage(
        "POST https://flow.example.it/hooks/secret fallito per famiglia@example.it",
      ),
    ).toBe("POST [URL] fallito per [EMAIL]");
  });

  it("limita il messaggio persistito a 500 caratteri", () => {
    expect(redactTechnicalMessage("x".repeat(700))).toHaveLength(500);
  });
});
