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
} from "./gmail-mail-templates";

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
  transport?: GmailMailTransport;
  clock?: () => Date;
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
    return this.send(input.recipients, registrationConfirmationMail(input, this.templateOptions));
  }

  sendAcceptanceConfirmation(input: StatusMailInput): Promise<void> {
    return this.send(input.recipients, acceptanceConfirmationMail(input, this.templateOptions));
  }

  sendRejectionConfirmation(input: StatusMailInput): Promise<void> {
    return this.send(input.recipients, rejectionConfirmationMail(input, this.templateOptions));
  }

  sendStaffInvitation(input: StaffInvitationMailInput): Promise<void> {
    return this.send([input.recipient], staffInvitationMail(input, this.templateOptions));
  }

  sendPasswordReset(input: PasswordResetMailInput): Promise<void> {
    return this.send([input.recipient], passwordResetMail(input, this.templateOptions));
  }

  sendDiagnosticMessage(recipient: string): Promise<void> {
    return this.send([recipient], diagnosticMail(this.templateOptions));
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

  private get templateOptions() {
    return { organizationName: this.options.senderName.trim() };
  }

  private async send(recipients: string[], content: MailContent): Promise<void> {
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
        from: { name: this.options.senderName.trim(), address: this.options.user.trim().toLowerCase() },
        replyTo: (this.options.replyTo || this.options.user).trim().toLowerCase(),
        bcc: normalizedRecipients,
        subject: content.subject,
        text: content.text,
        html: content.html,
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
