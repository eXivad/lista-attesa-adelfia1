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

function createLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function setup(overrides: Partial<GmailSmtpMailProviderOptions> = {}) {
  const transport: GmailMailTransport = {
    sendMail: vi.fn(async () => ({
      accepted: ["anna@example.it", "luigi@example.it", "capi@example.it"],
      rejected: [],
    })),
    verify: vi.fn(async () => true as const),
    close: vi.fn(),
  };
  const quotaGuard: MailQuotaGuard = { reserve: vi.fn(async () => undefined) };
  const logger = createLogger();
  const providerOptions = {
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
    logger,
    createOperationId: () => "mail-operation-test",
    logoOptimizer: vi.fn(async (logo: { content: Uint8Array; mimeType: string }) => logo),
    ...overrides,
  };
  const provider = new GmailSmtpMailProvider(providerOptions);
  return { provider, quotaGuard, transport, logger };
}

describe("GmailSmtpMailProvider", () => {
  it("invia una sola conferma con i genitori in To e la mailing list nascosta in Bcc", async () => {
    const { provider, quotaGuard, transport, logger } = setup();

    await provider.sendRegistrationConfirmation({
      applicantName: "Mario Rossi",
      applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
      registrationNumber: "LA-2026-000123",
      recipients: ["Anna@example.it", "anna@example.it", "luigi@example.it"],
      bccRecipients: ["capi@example.it", "ANNA@example.it"],
    });

    expect(quotaGuard.reserve).toHaveBeenCalledWith({
      sender: "gruppo@gmail.com",
      recipientCount: 3,
      limit: 450,
      now: NOW,
    });
    expect(transport.sendMail).toHaveBeenCalledOnce();
    const message = vi.mocked(transport.sendMail).mock.calls[0][0];
    expect(message.to).toEqual(["anna@example.it", "luigi@example.it"]);
    expect(message.bcc).toEqual(["capi@example.it"]);
    expect(message.priority).toBeUndefined();
    expect(message).toEqual(expect.objectContaining({
      from: { name: "AGESCI Adelfia 1", address: "gruppo@gmail.com" },
      replyTo: "gruppo@gmail.com",
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
    expect(logger.info).toHaveBeenCalledWith(
      "Invio email avviato.",
      expect.objectContaining({ priority: "normal" }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Invio email completato con successo.",
      expect.objectContaining({
        event: "mail.delivery.succeeded",
        operationId: "mail-operation-test",
        messageType: "registration_confirmation",
        recipientCount: 3,
        succeededCount: 3,
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Autenticazione Gmail OAuth 2.0 confermata durante l'invio.",
      expect.objectContaining({
        event: "mail.smtp.authentication.succeeded",
        operationId: "mail-operation-test",
        source: "delivery",
      }),
    );
    const serializedLogs = JSON.stringify(logger.info.mock.calls);
    expect(serializedLogs).toContain("a***@example.it");
    expect(serializedLogs).toContain("c***@example.it");
    expect(serializedLogs).not.toContain("anna@example.it");
    expect(serializedLogs).not.toContain("luigi@example.it");
    expect(serializedLogs).not.toContain("capi@example.it");
  });

  it("ottimizza il logo prima di incorporarlo nel messaggio", async () => {
    const original = new Uint8Array(150_000).fill(1);
    const optimized = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1]);
    const logoOptimizer = vi.fn(async () => ({
      content: optimized,
      mimeType: "image/png" as const,
    }));
    const options = {
      brandingLoader: vi.fn(async () => ({
        organizationName: "AGESCI Adelfia 1",
        logo: { content: original, mimeType: "image/png" },
      })),
      logoOptimizer,
    };
    const { provider, transport, logger } = setup(options);

    await provider.sendDiagnosticMessage("anna@example.it");

    expect(logoOptimizer).toHaveBeenCalledWith({
      content: original,
      mimeType: "image/png",
    });
    const message = vi.mocked(transport.sendMail).mock.calls[0][0];
    expect(message.attachments).toEqual([expect.objectContaining({
      content: Buffer.from(optimized),
      contentType: "image/png",
      contentDisposition: "inline",
    })]);
    expect(logger.info).toHaveBeenCalledWith(
      "Logo email ottimizzato.",
      expect.objectContaining({
        event: "mail.branding.logo.optimized",
        originalByteSize: 150_000,
        optimizedByteSize: optimized.byteLength,
      }),
    );
  });

  it("invia senza logo se l'ottimizzazione dell'immagine fallisce", async () => {
    const logoOptimizer = vi.fn(async () => {
      throw new Error("decoder image failed with private path");
    });
    const options = { logoOptimizer };
    const { provider, transport, logger } = setup(options);

    await provider.sendDiagnosticMessage("anna@example.it");

    const message = vi.mocked(transport.sendMail).mock.calls[0][0];
    expect(message.attachments).toBeUndefined();
    expect(message.html).not.toContain("cid:logo-lista-attesa@agesci");
    expect(logger.warn).toHaveBeenCalledWith(
      "Logo email non ottimizzabile: invio senza immagine.",
      expect.objectContaining({
        event: "mail.branding.logo.omitted",
        reasonCode: "LOGO_OPTIMIZATION_FAILED",
      }),
    );
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain("private path");
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
    const { provider, transport, quotaGuard, logger } = setup();
    await provider.verifyConnection();
    provider.close();
    expect(transport.verify).toHaveBeenCalledOnce();
    expect(transport.close).toHaveBeenCalledOnce();
    expect(quotaGuard.reserve).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "Autenticazione Gmail OAuth 2.0 riuscita.",
      expect.objectContaining({
        event: "mail.smtp.authentication.succeeded",
        operationId: "mail-operation-test",
        source: "verify",
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      "Pool SMTP Gmail chiuso.",
      expect.objectContaining({ event: "mail.smtp.pool.closed" }),
    );
  });

  it("non interrompe l'invio se il logger esterno fallisce", async () => {
    const logger = {
      info: vi.fn(() => { throw new Error("logger non disponibile"); }),
      warn: vi.fn(() => { throw new Error("logger non disponibile"); }),
      error: vi.fn(() => { throw new Error("logger non disponibile"); }),
    };
    const { provider, transport } = setup({ logger });

    await expect(provider.sendDiagnosticMessage("anna@example.it")).resolves.toBeUndefined();
    expect(transport.sendMail).toHaveBeenCalledOnce();
  });

  it("registra una causa sicura quando l'autenticazione OAuth fallisce", async () => {
    const transport: GmailMailTransport = {
      sendMail: vi.fn(async () => ({ accepted: [], rejected: [] })),
      verify: vi.fn(async () => {
        throw {
          code: "EAUTH",
          responseCode: 535,
          command: "AUTH XOAUTH2",
          response: "535 5.7.8 invalid_grant refresh-token-segreto",
        };
      }),
      close: vi.fn(),
    };
    const { provider, logger } = setup({ transport });

    await expect(provider.verifyConnection())
      .rejects.toThrow("Autenticazione Gmail OAuth 2.0 non riuscita");
    expect(logger.error).toHaveBeenCalledWith(
      "Autenticazione o connessione Gmail SMTP non riuscita.",
      expect.objectContaining({
        event: "mail.smtp.authentication.failed",
        operationId: "mail-operation-test",
        reasonCode: "OAUTH_REFRESH_TOKEN_REJECTED",
        smtpCode: "EAUTH",
        responseCode: 535,
        command: "AUTH XOAUTH2",
      }),
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("refresh-token-segreto");
  });

  it("invia con il nome mittente di ripiego se il branding non è disponibile", async () => {
    const { provider, transport, logger } = setup({
      brandingLoader: vi.fn(async () => {
        throw new Error("database branding non disponibile");
      }),
    });

    await provider.sendDiagnosticMessage("anna@example.it");

    const message = vi.mocked(transport.sendMail).mock.calls[0][0];
    expect(message.from).toEqual({ name: "AGESCI Adelfia 1", address: "gruppo@gmail.com" });
    expect(message.attachments).toBeUndefined();
    expect(message.html).toContain("AGESCI Adelfia 1");
    expect(logger.warn).toHaveBeenCalledWith(
      "Branding email non disponibile: uso la configurazione di fallback.",
      expect.objectContaining({
        event: "mail.branding.fallback",
        reasonCode: "BRANDING_LOAD_FAILED",
      }),
    );
  });

  it("fallisce prima della quota con configurazione o destinatari non validi", async () => {
    const missing = setup({ refreshToken: "" });
    await expect(missing.provider.sendDiagnosticMessage("anna@example.it"))
      .rejects.toBeInstanceOf(MailProviderNotConfiguredError);
    expect(missing.quotaGuard.reserve).not.toHaveBeenCalled();
    expect(missing.logger.error).toHaveBeenCalledWith(
      "Configurazione Gmail OAuth 2.0 non valida.",
      expect.objectContaining({
        event: "mail.configuration.invalid",
        invalidFields: "GMAIL_OAUTH_REFRESH_TOKEN",
      }),
    );

    const invalid = setup();
    await expect(invalid.provider.sendDiagnosticMessage("non-una-email"))
      .rejects.toThrow("destinatari non validi");
    expect(invalid.quotaGuard.reserve).not.toHaveBeenCalled();
    expect(invalid.logger.error).toHaveBeenCalledWith(
      "Invio email bloccato: destinatari non validi.",
      expect.objectContaining({
        event: "mail.delivery.rejected",
        reasonCode: "INVALID_RECIPIENTS",
      }),
    );
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
    expect(limited.logger.warn).toHaveBeenCalledWith(
      "Invio email bloccato: quota prudenziale esaurita.",
      expect.objectContaining({
        event: "mail.quota.exceeded",
        retryAfter: "2026-09-06T12:00:00.000Z",
      }),
    );
  });

  it("considera fallita una conferma accettata solo parzialmente", async () => {
    const transport: GmailMailTransport = {
      sendMail: vi.fn(async () => ({
        accepted: ["anna@example.it", "luigi@example.it"],
        rejected: ["capi@example.it"],
      })),
      verify: vi.fn(async () => true as const),
      close: vi.fn(),
    };
    const { provider } = setup({ transport });
    await expect(provider.sendRegistrationConfirmation({
      applicantName: "Mario Rossi",
      applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
      bccRecipients: ["capi@example.it"],
    })).rejects.toThrow("non ha accettato tutti");
    expect(transport.sendMail).toHaveBeenCalledOnce();
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
    const { provider, logger } = setup({ transport });

    await expect(provider.sendAcceptanceConfirmation({
      applicantName: "Mario Rossi",
      registrationNumber: "LA-2026-000123",
      recipients: ["anna@example.it", "luigi@example.it"],
    })).rejects.toThrow("Invio tramite Gmail SMTP non riuscito");
    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenCalledWith(
      "Invio al destinatario non riuscito.",
      expect.objectContaining({
        event: "mail.delivery.recipient.failed",
        messageType: "acceptance_confirmation",
        operationId: "mail-operation-test",
        reasonCode: "UNKNOWN_SMTP_FAILURE",
        recipient: "a***@example.it",
      }),
    );
    const serializedLogs = JSON.stringify(logger.error.mock.calls);
    expect(serializedLogs).not.toContain("anna@example.it");
    expect(serializedLogs).not.toContain("Mario Rossi");
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
