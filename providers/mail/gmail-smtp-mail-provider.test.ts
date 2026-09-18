import { describe, expect, it, vi } from "vitest";

import {
  MailDailyQuotaExceededError,
  type MailQuotaGuard,
} from "@/modules/mail/mail-quota";
import {
  GmailSmtpMailProvider,
  MailProviderNotConfiguredError,
  type GmailMailTransport,
  type GmailSmtpMailProviderOptions,
} from "./gmail-smtp-mail-provider";

const NOW = new Date("2026-09-05T12:00:00Z");

function setup(overrides: Partial<GmailSmtpMailProviderOptions> = {}) {
  const transport: GmailMailTransport = {
    sendMail: vi.fn(async () => ({
      accepted: ["anna@example.it", "luigi@example.it"],
      rejected: [],
    })),
    verify: vi.fn(async () => true as const),
    close: vi.fn(),
  };
  const quotaGuard: MailQuotaGuard = { reserve: vi.fn(async () => undefined) };
  const provider = new GmailSmtpMailProvider({
    user: "gruppo@gmail.com",
    clientId: "client.apps.googleusercontent.com",
    clientSecret: "client-secret",
    refreshToken: "refresh-token",
    senderName: "AGESCI Adelfia 1",
    replyTo: "gruppo@gmail.com",
    dailyRecipientLimit: 450,
    maxRecipientsPerMessage: 20,
    quotaGuard,
    brandingLoader: vi.fn(async () => ({
      organizationName: "AGESCI Adelfia 1",
      logo: {
        content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
        mimeType: "image/png",
      },
    })),
    transport,
    clock: () => NOW,
    ...overrides,
  });
  return { provider, quotaGuard, transport };
}

describe("GmailSmtpMailProvider", () => {
  it("invia un messaggio distinto per destinatario con To visibile e priorit\u00e0 alta", async () => {
    const { provider, quotaGuard, transport } = setup();

    await provider.sendRegistrationConfirmation({
      applicantName: "Mario Rossi",
      applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
      registrationNumber: "LA-2026-000123",
      recipients: ["Anna@example.it", "anna@example.it", "luigi@example.it"],
    });

    expect(quotaGuard.reserve).toHaveBeenCalledWith({
      sender: "gruppo@gmail.com",
      recipientCount: 2,
      limit: 450,
      now: NOW,
    });
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    const messages = vi.mocked(transport.sendMail).mock.calls.map(([message]) => message);
    expect(messages.map((message) => message.to)).toEqual([
      "anna@example.it",
      "luigi@example.it",
    ]);
    expect(messages.every((message) => message.bcc === undefined)).toBe(true);
    expect(messages[0]).toEqual(expect.objectContaining({
      from: { name: "AGESCI Adelfia 1", address: "gruppo@gmail.com" },
      replyTo: "gruppo@gmail.com",
      priority: "high",
      subject: "Conferma iscrizione lista d'attesa - LA-2026-000123",
      text: expect.stringContaining("Mario Rossi"),
      html: expect.stringContaining("Richiesta ricevuta"),
      attachments: [{
        filename: "logo-gruppo.png",
        content: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        contentType: "image/png",
        contentDisposition: "inline",
        cid: "logo-lista-attesa@agesci",
      }],
      headers: { "Auto-Submitted": "auto-generated" },
      disableFileAccess: true,
      disableUrlAccess: true,
    }));
  });

  it("mappa i cinque flussi funzionali e il messaggio diagnostico", async () => {
    const { provider, transport } = setup();
    const status = {
      applicantName: "Mario Rossi",
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
    };
    await provider.sendAcceptanceConfirmation(status);
    await provider.sendRejectionConfirmation(status);
    await provider.sendStaffInvitation({
      recipient: "anna@example.it",
      staffName: "Capo Uno",
      invitationUrl: "https://app.example.it/invito/token",
      expiresAt: NOW,
    });
    await provider.sendPasswordReset({
      recipient: "anna@example.it",
      staffName: "Capo Uno",
      resetUrl: "https://app.example.it/reset/token",
      expiresAt: NOW,
    });
    await provider.sendDiagnosticMessage("anna@example.it");

    expect(transport.sendMail).toHaveBeenCalledTimes(7);
    expect(vi.mocked(transport.sendMail).mock.calls.map(([message]) => message.subject)).toEqual([
      "Esito iscrizione LA-2026-000123: accettata",
      "Esito iscrizione LA-2026-000123: accettata",
      "Esito iscrizione LA-2026-000123",
      "Esito iscrizione LA-2026-000123",
      "Invito alla gestione della lista d'attesa - AGESCI Adelfia 1",
      "Reimposta la password - AGESCI Adelfia 1",
      "Test configurazione email - AGESCI Adelfia 1",
    ]);
  });

  it("verifica la connessione e chiude il pool senza inviare messaggi", async () => {
    const { provider, transport, quotaGuard } = setup();
    await provider.verifyConnection();
    provider.close();
    expect(transport.verify).toHaveBeenCalledOnce();
    expect(transport.close).toHaveBeenCalledOnce();
    expect(quotaGuard.reserve).not.toHaveBeenCalled();
  });

  it("invia con il nome mittente di ripiego se il branding non è disponibile", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { provider, transport } = setup({
      brandingLoader: vi.fn(async () => {
        throw new Error("database branding non disponibile");
      }),
    });

    await provider.sendDiagnosticMessage("anna@example.it");

    const message = vi.mocked(transport.sendMail).mock.calls[0][0];
    expect(message.from).toEqual({ name: "AGESCI Adelfia 1", address: "gruppo@gmail.com" });
    expect(message.attachments).toBeUndefined();
    expect(message.html).toContain("AGESCI Adelfia 1");
    expect(consoleError).toHaveBeenCalledWith(
      "Impossibile caricare il branding per il messaggio email.",
    );
    consoleError.mockRestore();
  });

  it("fallisce prima della quota con configurazione o destinatari non validi", async () => {
    const missing = setup({ refreshToken: "" });
    await expect(missing.provider.sendDiagnosticMessage("anna@example.it"))
      .rejects.toBeInstanceOf(MailProviderNotConfiguredError);
    expect(missing.quotaGuard.reserve).not.toHaveBeenCalled();

    const invalid = setup();
    await expect(invalid.provider.sendDiagnosticMessage("non-una-email"))
      .rejects.toThrow("destinatari non validi");
    expect(invalid.quotaGuard.reserve).not.toHaveBeenCalled();
  });

  it("impedisce messaggi oltre il limite prudenziale", async () => {
    const { provider, quotaGuard, transport } = setup({ maxRecipientsPerMessage: 1 });
    await expect(provider.sendRegistrationConfirmation({
      applicantName: "Mario Rossi",
      applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
    })).rejects.toThrow("limite prudenziale");
    expect(quotaGuard.reserve).not.toHaveBeenCalled();
    expect(transport.sendMail).not.toHaveBeenCalled();
  });

  it("non espone errori database della quota e conserva l'errore controllato di limite", async () => {
    const internal = setup({
      quotaGuard: { reserve: vi.fn(async () => { throw new Error("postgresql://user:secret@host/db"); }) },
    });
    await expect(internal.provider.sendDiagnosticMessage("anna@example.it"))
      .rejects.toThrow("Impossibile verificare in sicurezza");
    await expect(internal.provider.sendDiagnosticMessage("anna@example.it"))
      .rejects.not.toThrow("postgresql");
    expect(internal.transport.sendMail).not.toHaveBeenCalled();

    const quotaError = new MailDailyQuotaExceededError(new Date("2026-09-06T12:00:00Z"));
    const limited = setup({
      quotaGuard: { reserve: vi.fn(async () => { throw quotaError; }) },
    });
    await expect(limited.provider.sendDiagnosticMessage("anna@example.it"))
      .rejects.toBe(quotaError);
  });

  it("considera fallito un invio accettato solo parzialmente", async () => {
    const transport: GmailMailTransport = {
      sendMail: vi.fn(async (message) => message.to === "anna@example.it"
        ? { accepted: ["anna@example.it"], rejected: [] }
        : { accepted: [], rejected: ["luigi@example.it"] }),
      verify: vi.fn(async () => true as const),
      close: vi.fn(),
    };
    const { provider } = setup({ transport });
    await expect(provider.sendRegistrationConfirmation({
      applicantName: "Mario Rossi",
      applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
    })).rejects.toThrow("non ha accettato tutti");
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
  });

  it("tenta tutti i destinatari anche quando un singolo invio SMTP fallisce", async () => {
    const transport: GmailMailTransport = {
      sendMail: vi.fn(async (message) => {
        if (message.to === "anna@example.it") throw { code: "EUNKNOWN" };
        return { accepted: ["luigi@example.it"], rejected: [] };
      }),
      verify: vi.fn(async () => true as const),
      close: vi.fn(),
    };
    const { provider } = setup({ transport });

    await expect(provider.sendRegistrationConfirmation({
      applicantName: "Mario Rossi",
      applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
    })).rejects.toThrow("Invio tramite Gmail SMTP non riuscito");
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
  });

  it("sanitizza errori OAuth, quota, temporanei e sconosciuti", async () => {
    const cases = [
      [{ code: "EAUTH", response: "account segreto" }, "Autenticazione Gmail OAuth 2.0"],
      [{ responseCode: 550, response: "550 5.4.5 Daily user sending limit exceeded" }, "temporaneamente limitato"],
      [{ code: "ETIMEDOUT", response: "socket per anna@example.it" }, "temporaneamente non disponibile"],
      [{ code: "EUNKNOWN", response: "dettaglio segreto" }, "Invio tramite Gmail SMTP non riuscito"],
    ] as const;

    for (const [smtpError, expectedMessage] of cases) {
      const transport: GmailMailTransport = {
        sendMail: vi.fn(async () => { throw smtpError; }),
        verify: vi.fn(async () => true as const),
        close: vi.fn(),
      };
      const { provider } = setup({ transport });
      const promise = provider.sendDiagnosticMessage("anna@example.it");
      await expect(promise).rejects.toThrow(expectedMessage);
      await expect(promise).rejects.not.toThrow("segreto");
      await expect(promise).rejects.not.toThrow("anna@example.it");
    }
  });
});
