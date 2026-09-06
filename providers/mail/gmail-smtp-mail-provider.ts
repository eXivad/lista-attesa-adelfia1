import nodemailer, { type SendMailOptions } from "nodemailer";
import { z } from "zod";

import type {
  MailProvider,
  PasswordResetMailInput,
  RegistrationMailInput,
  StaffInvitationMailInput,
  StatusMailInput,
} from "@/modules/mail/mail-provider";
import {
  MailDailyQuotaExceededError,
  type MailQuotaGuard,
} from "@/modules/mail/mail-quota";
import {
  acceptanceConfirmationMail,
  diagnosticMail,
  passwordResetMail,
  registrationConfirmationMail,
  rejectionConfirmationMail,
  staffInvitationMail,
  type MailContent,
  type TemplateOptions,
} from "./gmail-mail-templates";

const MAIL_LOGO_CID = "logo-lista-attesa@agesci";

interface GmailTransportResult {
  accepted: string[];
  rejected: string[];
}

export interface GmailMailTransport {
  sendMail(message: SendMailOptions): Promise<GmailTransportResult>;
  verify(): Promise<true>;
  close(): void;
}

export interface GmailSmtpMailProviderOptions {
  user: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  senderName: string;
  replyTo?: string;
  dailyRecipientLimit: number;
  maxRecipientsPerMessage: number;
  quotaGuard: MailQuotaGuard;
  brandingLoader?: () => Promise<GmailMailBranding>;
  transport?: GmailMailTransport;
  clock?: () => Date;
}

export interface GmailMailBranding {
  organizationName: string;
  logo?: {
    content: Uint8Array;
    mimeType: string;
  };
}

export class MailProviderNotConfiguredError extends Error {
  constructor() {
    super("Il provider Gmail OAuth 2.0 non è configurato.");
    this.name = "MailProviderNotConfiguredError";
  }
}

export class GmailSmtpMailProvider implements MailProvider {
  private readonly clock: () => Date;
  private readonly transport: GmailMailTransport;

  constructor(private readonly options: GmailSmtpMailProviderOptions) {
    this.clock = options.clock ?? (() => new Date());
    this.transport = options.transport ?? createGmailTransport(options);
  }

  sendRegistrationConfirmation(input: RegistrationMailInput): Promise<void> {
    return this.renderAndSend(input.recipients, (options) =>
      registrationConfirmationMail(input, options),
    );
  }

  sendAcceptanceConfirmation(input: StatusMailInput): Promise<void> {
    return this.renderAndSend(input.recipients, (options) =>
      acceptanceConfirmationMail(input, options),
    );
  }

  sendRejectionConfirmation(input: StatusMailInput): Promise<void> {
    return this.renderAndSend(input.recipients, (options) =>
      rejectionConfirmationMail(input, options),
    );
  }

  sendStaffInvitation(input: StaffInvitationMailInput): Promise<void> {
    return this.renderAndSend([input.recipient], (options) =>
      staffInvitationMail(input, options),
    );
  }

  sendPasswordReset(input: PasswordResetMailInput): Promise<void> {
    return this.renderAndSend([input.recipient], (options) =>
      passwordResetMail(input, options),
    );
  }

  sendDiagnosticMessage(recipient: string): Promise<void> {
    return this.renderAndSend([recipient], diagnosticMail);
  }

  async verifyConnection(): Promise<void> {
    this.assertConfigured();
    try {
      await this.transport.verify();
    } catch (error) {
      throw safeSmtpError(error);
    }
  }

  close(): void {
    this.transport.close();
  }

  private async renderAndSend(
    recipients: string[],
    render: (options: TemplateOptions) => MailContent,
  ): Promise<void> {
    const branding = await this.loadBranding();
    const content = render({
      organizationName: branding.organizationName,
      ...(branding.logo ? { logoCid: MAIL_LOGO_CID } : {}),
    });
    await this.send(recipients, content, branding);
  }

  private async loadBranding(): Promise<GmailMailBranding> {
    const fallback = { organizationName: this.options.senderName.trim() };
    if (!this.options.brandingLoader) return fallback;

    try {
      const loaded = await this.options.brandingLoader();
      const organizationName = loaded.organizationName.trim();
      if (!organizationName || organizationName.length > 120 || /[\r\n]/.test(organizationName)) {
        return fallback;
      }
      return {
        organizationName,
        ...(isSupportedInlineLogo(loaded.logo) ? { logo: loaded.logo } : {}),
      };
    } catch {
      console.error("Impossibile caricare il branding per il messaggio email.");
      return fallback;
    }
  }

  private async send(
    recipients: string[],
    content: MailContent,
    branding: GmailMailBranding,
  ): Promise<void> {
    this.assertConfigured();
    const normalizedRecipients = normalizeRecipients(recipients);
    if (normalizedRecipients.length > this.options.maxRecipientsPerMessage) {
      throw new Error("Il messaggio supera il limite prudenziale di destinatari configurato.");
    }

    try {
      await this.options.quotaGuard.reserve({
        sender: this.options.user,
        recipientCount: normalizedRecipients.length,
        limit: this.options.dailyRecipientLimit,
        now: this.clock(),
      });
    } catch (error) {
      if (error instanceof MailDailyQuotaExceededError) throw error;
      throw new Error("Impossibile verificare in sicurezza la quota di invio email.");
    }

    let result: GmailTransportResult;
    try {
      result = await this.transport.sendMail({
        from: { name: branding.organizationName, address: this.options.user.trim().toLowerCase() },
        replyTo: (this.options.replyTo || this.options.user).trim().toLowerCase(),
        bcc: normalizedRecipients,
        subject: content.subject,
        text: content.text,
        html: content.html,
        ...(branding.logo
          ? {
              attachments: [{
                filename: inlineLogoFilename(branding.logo.mimeType),
                content: Buffer.from(branding.logo.content),
                contentType: branding.logo.mimeType,
                contentDisposition: "inline",
                cid: MAIL_LOGO_CID,
              }],
            }
          : {}),
        headers: { "Auto-Submitted": "auto-generated" },
        disableFileAccess: true,
        disableUrlAccess: true,
      });
    } catch (error) {
      throw safeSmtpError(error);
    }

    if (result.rejected.length > 0 || result.accepted.length < normalizedRecipients.length) {
      throw new Error("Gmail non ha accettato tutti i destinatari del messaggio.");
    }
  }

  private assertConfigured(): void {
    const addressesValid = [this.options.user, this.options.replyTo || this.options.user].every(
      (value) => z.email().safeParse(value.trim().toLowerCase()).success,
    );
    const credentialsPresent = [
      this.options.clientId,
      this.options.clientSecret,
      this.options.refreshToken,
      this.options.senderName,
    ].every((value) => value.trim().length > 0 && !/[\r\n]/.test(value));

    if (!addressesValid || !credentialsPresent) {
      throw new MailProviderNotConfiguredError();
    }
  }
}

function isSupportedInlineLogo(
  logo: GmailMailBranding["logo"],
): logo is NonNullable<GmailMailBranding["logo"]> {
  return Boolean(
    logo &&
      logo.content.byteLength > 0 &&
      ["image/png", "image/jpeg", "image/webp"].includes(logo.mimeType),
  );
}

function inlineLogoFilename(mimeType: string): string {
  if (mimeType === "image/jpeg") return "logo-gruppo.jpg";
  if (mimeType === "image/webp") return "logo-gruppo.webp";
  return "logo-gruppo.png";
}

function createGmailTransport(options: GmailSmtpMailProviderOptions): GmailMailTransport {
  return nodemailer.createTransport(
    {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      pool: true,
      maxConnections: 1,
      maxMessages: 50,
      rateDelta: 1_000,
      rateLimit: 1,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      forceAuth: true,
      auth: {
        type: "OAuth2",
        user: options.user,
        clientId: options.clientId,
        clientSecret: options.clientSecret,
        refreshToken: options.refreshToken,
      },
      tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
        servername: "smtp.gmail.com",
      },
    },
    { maxRecipients: options.maxRecipientsPerMessage },
  );
}

function normalizeRecipients(recipients: string[]): string[] {
  const normalized = [...new Set(recipients.map((recipient) => recipient.trim().toLowerCase()))];
  if (normalized.length === 0 || normalized.some((recipient) => !z.email().safeParse(recipient).success)) {
    throw new Error("Il messaggio contiene destinatari non validi.");
  }
  return normalized;
}

function safeSmtpError(error: unknown): Error {
  const smtpError = error as {
    code?: unknown;
    responseCode?: unknown;
    response?: unknown;
  };
  const code = typeof smtpError.code === "string" ? smtpError.code.toUpperCase() : "";
  const responseCode = typeof smtpError.responseCode === "number" ? smtpError.responseCode : 0;
  const response = typeof smtpError.response === "string" ? smtpError.response.toLowerCase() : "";

  if (code === "EAUTH" || responseCode === 534 || responseCode === 535) {
    return new Error("Autenticazione Gmail OAuth 2.0 non riuscita.");
  }
  if (/4\.7\.28|5\.4\.5|daily user sending limit|rate limit|quota/.test(response)) {
    return new Error("Gmail ha temporaneamente limitato gli invii. Attendi il ripristino della quota prima di ritentare.");
  }
  if ((responseCode >= 400 && responseCode < 500) || ["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(code)) {
    return new Error("Il servizio Gmail SMTP è temporaneamente non disponibile. Riprova più tardi.");
  }
  return new Error("Invio tramite Gmail SMTP non riuscito.");
}
