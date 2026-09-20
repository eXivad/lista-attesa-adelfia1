import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import type { RateLimitRepository } from "@/lib/security/rate-limiter";
import { AdminMailTestError, sendAdminDiagnosticMail } from "./admin-mail-test";

const NOW = new Date("2026-09-20T12:00:00.000Z");

function setup(allowed = true) {
  const rateLimitRepository: RateLimitRepository = {
    consume: vi.fn(async () => allowed),
  };
  const provider = { sendDiagnosticMessage: vi.fn(async () => undefined) };
  const mailProviderFactory = vi.fn(() => provider);
  const options = {
    actorId: "admin-123",
    recipientInput: " Test@Outlook.it ",
    rateLimitSecret: "a-secret-used-only-in-unit-tests",
    rateLimitRepository,
    mailProviderFactory,
    clock: () => NOW,
  };
  return { options, rateLimitRepository, provider, mailProviderFactory };
}

describe("sendAdminDiagnosticMail", () => {
  it("invia il modello diagnostico a un solo indirizzo normalizzato e limita i tentativi nel DB", async () => {
    const { options, rateLimitRepository, provider } = setup();

    await sendAdminDiagnosticMail(options);

    const expectedHash = createHmac("sha256", options.rateLimitSecret)
      .update("admin-mail-test:admin-123")
      .digest("hex");
    expect(rateLimitRepository.consume).toHaveBeenCalledWith({
      keyHash: expectedHash,
      now: NOW,
      limit: 3,
      windowMs: 60 * 60 * 1_000,
    });
    expect(provider.sendDiagnosticMessage).toHaveBeenCalledExactlyOnceWith("test@outlook.it");
  });

  it("rifiuta indirizzi non validi prima di toccare il DB o il provider", async () => {
    const { options, rateLimitRepository, mailProviderFactory } = setup();

    await expect(sendAdminDiagnosticMail({ ...options, recipientInput: "a@example.it,b@example.it" }))
      .rejects.toMatchObject({ code: "INVALID_RECIPIENT" } satisfies Partial<AdminMailTestError>);
    expect(rateLimitRepository.consume).not.toHaveBeenCalled();
    expect(mailProviderFactory).not.toHaveBeenCalled();
  });

  it("blocca il quarto tentativo senza inizializzare il provider SMTP", async () => {
    const { options, mailProviderFactory } = setup(false);

    await expect(sendAdminDiagnosticMail(options))
      .rejects.toMatchObject({ code: "RATE_LIMITED" } satisfies Partial<AdminMailTestError>);
    expect(mailProviderFactory).not.toHaveBeenCalled();
  });

  it("fallisce in modo sicuro quando il controllo dei tentativi non è disponibile", async () => {
    const { options, mailProviderFactory } = setup();
    options.rateLimitRepository.consume = vi.fn(async () => {
      throw new Error("postgres://utente:password@host/db");
    });

    await expect(sendAdminDiagnosticMail(options))
      .rejects.toMatchObject({ code: "RATE_LIMIT_UNAVAILABLE" } satisfies Partial<AdminMailTestError>);
    expect(mailProviderFactory).not.toHaveBeenCalled();
  });
});
