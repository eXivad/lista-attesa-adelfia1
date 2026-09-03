import { describe, expect, it, vi } from "vitest";

import {
  MailProviderNotConfiguredError,
  PowerAutomateMailProvider,
} from "./power-automate-mail-provider";

describe("PowerAutomateMailProvider", () => {
  it("invia una richiesta JSON con timeout e bearer token", async () => {
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 202 }));
    const provider = new PowerAutomateMailProvider({
      webhookUrl: "https://example.test/power-automate",
      bearerToken: "secret-token",
      sender: "gruppo@example.it",
      fetchImplementation,
    });

    await provider.sendRegistrationConfirmation({
      applicantName: "Mario Rossi",
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
    });

    expect(fetchImplementation).toHaveBeenCalledWith(
      "https://example.test/power-automate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
        body: JSON.stringify({
          type: "REGISTRATION_CONFIRMATION",
          sender: "gruppo@example.it",
          recipients: ["anna@example.it", "luigi@example.it"],
          data: { applicantName: "Mario Rossi", registrationNumber: "LA-2026-000123" },
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rifiuta una configurazione priva di webhook senza fare richieste", async () => {
    const fetchImplementation = vi.fn();
    const provider = new PowerAutomateMailProvider({
      webhookUrl: "",
      sender: "gruppo@example.it",
      fetchImplementation,
    });

    await expect(
      provider.sendRegistrationConfirmation({
        applicantName: "Mario Rossi",
        registrationNumber: "LA-2026-000123",
        recipients: ["anna@example.it"],
      }),
    ).rejects.toBeInstanceOf(MailProviderNotConfiguredError);
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("traduce una risposta non riuscita senza includere il corpo remoto", async () => {
    const provider = new PowerAutomateMailProvider({
      webhookUrl: "https://example.test/power-automate",
      sender: "gruppo@example.it",
      fetchImplementation: vi.fn(async () => new Response("secret remote body", { status: 500 })),
    });

    await expect(
      provider.sendRegistrationConfirmation({
        applicantName: "Mario Rossi",
        registrationNumber: "LA-2026-000123",
        recipients: ["anna@example.it"],
      }),
    ).rejects.toThrow("Power Automate ha risposto con stato 500.");
  });

  it("mappa accettazione, rifiuto, invito e reset e consente HTTP solo in locale", async () => {
    const fetchImplementation = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      void input;
      void init;
      return new Response(null, { status: 204 });
    });
    const provider = new PowerAutomateMailProvider({ webhookUrl: "http://localhost:4000/mail", sender: "gruppo@example.it", fetchImplementation });
    const status = { applicantName: "Mario Rossi", registrationNumber: "LA-2026-000123", recipients: ["a@example.it"] };
    await provider.sendAcceptanceConfirmation(status);
    await provider.sendRejectionConfirmation(status);
    await provider.sendStaffInvitation({ recipient: "capo@example.it", staffName: "Capo Uno", invitationUrl: "https://app.test/invito/x", expiresAt: new Date("2026-09-04T12:00:00Z") });
    await provider.sendPasswordReset({ recipient: "capo@example.it", staffName: "Capo Uno", resetUrl: "https://app.test/reset/x", expiresAt: new Date("2026-09-03T13:00:00Z") });
    expect(fetchImplementation.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).type)).toEqual([
      "ACCEPTANCE_CONFIRMATION", "REJECTION_CONFIRMATION", "STAFF_INVITATION", "PASSWORD_RESET",
    ]);
    expect(fetchImplementation.mock.calls[0]?.[1]?.headers).toEqual({ "Content-Type": "application/json" });

    const unsafe = new PowerAutomateMailProvider({ webhookUrl: "http://example.test/mail", sender: "x@example.it", fetchImplementation });
    await expect(unsafe.sendAcceptanceConfirmation(status)).rejects.toThrow("HTTPS");
  });
});
