import { randomUUID } from "node:crypto";
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
import {
  EMAIL_LOGO_MAX_BYTES,
  EMAIL_LOGO_MAX_DIMENSION,
  optimizeGmailInlineLogo,
  type GmailMailLogo,
  type GmailMailLogoOptimizer,
} from "./gmail-mail-logo";

const MAIL_LOGO_CID = "logo-lista-attesa@agesci";

type MailMessageType =
  | "registration_confirmation"
  | "acceptance_confirmation"
  | "rejection_confirmation"
  | "staff_invitation"
  | "password_reset"
  | "diagnostic";

type MailLogContext = Record<string, string | number | boolean | null>;

export interface MailLogger {
  info(message: string, context: MailLogContext): void;
  warn(message: string, context: MailLogContext): void;
  error(message: string, context: MailLogContext): void;
}

const consoleMailLogger: MailLogger = {
  info(message, context) {
    console.info(`[mail] ${message}`, context);
  },
  warn(message, context) {
    console.warn(`[mail] ${message}`, context);
  },
  error(message, context) {
    console.error(`[mail] ${message}`, context);
  },
};

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
  logger?: MailLogger;
  createOperationId?: () => string;
  logoOptimizer?: GmailMailLogoOptimizer;
}

export interface GmailMailBranding {
  organizationName: string;
  logo?: GmailMailLogo;
}

export class MailProviderNotConfiguredError extends Error {
  constructor() {
    super("Il provider Gmail OAuth 2.0 non è configurato.");
    this.name = "MailProviderNotConfiguredError";
  }
}

export class GmailSmtpMailProvider implements MailProvider {
  private readonly clock: () => Date;
  private readonly createOperationId: () => string;
  private readonly logger: MailLogger;
  private readonly logoOptimizer: GmailMailLogoOptimizer;
  private readonly transport: GmailMailTransport;

  constructor(private readonly options: GmailSmtpMailProviderOptions) {
    this.clock = options.clock ?? (() => new Date());
    this.createOperationId = options.createOperationId ?? randomUUID;
    this.logger = options.logger ?? consoleMailLogger;
    this.logoOptimizer = options.logoOptimizer ?? optimizeGmailInlineLogo;
    this.transport = options.transport ?? createGmailTransport(options);
    this.info("Provider email Gmail inizializzato.", {
      event: "mail.provider.initialized",
      authentication: "OAuth2",
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      secure: true,
      pooled: true,
      dailyRecipientLimit: options.dailyRecipientLimit,
      maxRecipientsPerOperation: options.maxRecipientsPerMessage,
    });
  }

  sendRegistrationConfirmation(input: RegistrationMailInput): Promise<void> {
    return this.renderAndSendGrouped(
      "registration_confirmation",
      input.recipients,
      input.bccRecipients,
      (options) => registrationConfirmationMail(input, options),
    );
  }

  sendAcceptanceConfirmation(input: StatusMailInput): Promise<void> {
    return this.renderAndSendGrouped(
      "acceptance_confirmation",
      input.recipients,
      input.bccRecipients,
      (options) => acceptanceConfirmationMail(input, options),
    );
  }

  sendRejectionConfirmation(input: StatusMailInput): Promise<void> {
    return this.renderAndSendGrouped(
      "rejection_confirmation",
      input.recipients,
      input.bccRecipients,
      (options) => rejectionConfirmationMail(input, options),
    );
  }

  sendStaffInvitation(input: StaffInvitationMailInput): Promise<void> {
    return this.renderAndSend("staff_invitation", [input.recipient], (options) =>
      staffInvitationMail(input, options),
    );
  }

  sendPasswordReset(input: PasswordResetMailInput): Promise<void> {
    return this.renderAndSend("password_reset", [input.recipient], (options) =>
      passwordResetMail(input, options),
    );
  }

  sendDiagnosticMessage(recipient: string): Promise<void> {
    return this.renderAndSend("diagnostic", [recipient], diagnosticMail);
  }

  async verifyConnection(): Promise<void> {
    const operationId = this.createOperationId();
    this.info("Verifica connessione e autenticazione Gmail SMTP avviata.", {
      event: "mail.smtp.authentication.started",
      operationId,
      source: "verify",
      smtpHost: "smtp.gmail.com",
    });
    this.assertConfigured({ operationId, source: "verify" });
    try {
      await this.transport.verify();
      this.info("Autenticazione Gmail OAuth 2.0 riuscita.", {
        event: "mail.smtp.authentication.succeeded",
        operationId,
        source: "verify",
        smtpHost: "smtp.gmail.com",
        secure: true,
      });
    } catch (error) {
      const diagnostic = smtpFailureDiagnostic(error);
      this.error("Autenticazione o connessione Gmail SMTP non riuscita.", {
        event: "mail.smtp.authentication.failed",
        operationId,
        source: "verify",
        ...diagnostic,
      });
      throw safeSmtpError(error);
    }
  }

  close(): void {
    this.transport.close();
    this.info("Pool SMTP Gmail chiuso.", {
      event: "mail.smtp.pool.closed",
    });
  }

  private async renderAndSend(
    messageType: MailMessageType,
    recipients: string[],
    render: (options: TemplateOptions) => Promise<MailContent>,
  ): Promise<void> {
    const operationId = this.createOperationId();
    const branding = await this.loadBranding(operationId, messageType);
    const content = await render({
      organizationName: branding.organizationName,
      ...(branding.logo ? { logoCid: MAIL_LOGO_CID } : {}),
    });
    await this.send(operationId, messageType, recipients, content, branding);
  }

  private async renderAndSendGrouped(
    messageType: MailMessageType,
    recipients: string[],
    bccRecipients: string[],
    render: (options: TemplateOptions) => Promise<MailContent>,
  ): Promise<void> {
    const operationId = this.createOperationId();
    const branding = await this.loadBranding(operationId, messageType);
    const content = await render({
      organizationName: branding.organizationName,
      ...(branding.logo ? { logoCid: MAIL_LOGO_CID } : {}),
    });
    await this.send(operationId, messageType, recipients, content, branding, bccRecipients);
  }

  private async loadBranding(
    operationId: string,
    messageType: MailMessageType,
  ): Promise<GmailMailBranding> {
    const fallback = { organizationName: this.options.senderName.trim() };
    if (!this.options.brandingLoader) return fallback;

    try {
      const loaded = await this.options.brandingLoader();
      const organizationName = loaded.organizationName.trim();
      if (!organizationName || organizationName.length > 120 || /[\r\n]/.test(organizationName)) {
        this.warn("Branding email non valido: uso la configurazione di fallback.", {
          event: "mail.branding.fallback",
          operationId,
          messageType,
          reasonCode: "BRANDING_INVALID",
        });
        return fallback;
      }
      const logo = await this.optimizeLogo(loaded.logo, operationId, messageType);
      return {
        organizationName,
        ...(logo ? { logo } : {}),
      };
    } catch {
      this.warn("Branding email non disponibile: uso la configurazione di fallback.", {
        event: "mail.branding.fallback",
        operationId,
        messageType,
        reasonCode: "BRANDING_LOAD_FAILED",
      });
      return fallback;
    }
  }

  private async optimizeLogo(
    logo: GmailMailBranding["logo"],
    operationId: string,
    messageType: MailMessageType,
  ): Promise<GmailMailLogo | undefined> {
    if (!logo) return undefined;
    if (!isSupportedInlineLogo(logo)) {
      this.warn("Logo email non supportato: invio senza immagine.", {
        event: "mail.branding.logo.omitted",
        operationId,
        messageType,
        reasonCode: "LOGO_UNSUPPORTED",
      });
      return undefined;
    }

    try {
      const optimized = await this.logoOptimizer(logo);
      if (!isSupportedInlineLogo(optimized) || optimized.content.byteLength > EMAIL_LOGO_MAX_BYTES) {
        throw new Error("unsafe optimized logo");
      }
      this.info("Logo email ottimizzato.", {
        event: "mail.branding.logo.optimized",
        operationId,
        messageType,
        originalByteSize: logo.content.byteLength,
        optimizedByteSize: optimized.content.byteLength,
        maxDimension: EMAIL_LOGO_MAX_DIMENSION,
      });
      return optimized;
    } catch {
      this.warn("Logo email non ottimizzabile: invio senza immagine.", {
        event: "mail.branding.logo.omitted",
        operationId,
        messageType,
        reasonCode: "LOGO_OPTIMIZATION_FAILED",
      });
      return undefined;
    }
  }

  private async send(
    operationId: string,
    messageType: MailMessageType,
    recipients: string[],
    content: MailContent,
    branding: GmailMailBranding,
    bccRecipients?: string[],
  ): Promise<void> {
    this.assertConfigured({ operationId, messageType });
    let normalizedRecipients: string[];
    let normalizedBccRecipients: string[] = [];
    try {
      normalizedRecipients = normalizeRecipients(recipients);
      const visibleRecipientSet = new Set(normalizedRecipients);
      normalizedBccRecipients = normalizeOptionalRecipients(bccRecipients ?? [])
        .filter((recipient) => !visibleRecipientSet.has(recipient));
    } catch (error) {
      this.error("Invio email bloccato: destinatari non validi.", {
        event: "mail.delivery.rejected",
        operationId,
        messageType,
        reasonCode: "INVALID_RECIPIENTS",
        recipientCount: recipients.length + (bccRecipients?.length ?? 0),
      });
      throw error;
    }
    const allRecipients = [...normalizedRecipients, ...normalizedBccRecipients];
    const groupedDelivery = bccRecipients !== undefined;
    this.info("Invio email avviato.", {
      event: "mail.delivery.started",
      operationId,
      messageType,
      recipientCount: allRecipients.length,
      deliveryMode: groupedDelivery ? "grouped_to_bcc" : "individual_to",
      toRecipients: normalizedRecipients.map(maskEmailAddress).join(","),
      bccRecipients: normalizedBccRecipients.map(maskEmailAddress).join(","),
      priority: "normal",
    });
    if (allRecipients.length > this.options.maxRecipientsPerMessage) {
      this.warn("Invio email bloccato dal limite prudenziale per operazione.", {
        event: "mail.delivery.rejected",
        operationId,
        messageType,
        reasonCode: "RECIPIENT_LIMIT_EXCEEDED",
        recipientCount: allRecipients.length,
        configuredLimit: this.options.maxRecipientsPerMessage,
      });
      throw new Error("Il messaggio supera il limite prudenziale di destinatari configurato.");
    }

    try {
      await this.options.quotaGuard.reserve({
        sender: this.options.user,
        recipientCount: allRecipients.length,
        limit: this.options.dailyRecipientLimit,
        now: this.clock(),
      });
      this.info("Quota prudenziale di invio riservata.", {
        event: "mail.quota.reserved",
        operationId,
        messageType,
        recipientCount: allRecipients.length,
        dailyRecipientLimit: this.options.dailyRecipientLimit,
      });
    } catch (error) {
      if (error instanceof MailDailyQuotaExceededError) {
        this.warn("Invio email bloccato: quota prudenziale esaurita.", {
          event: "mail.quota.exceeded",
          operationId,
          messageType,
          reasonCode: "DAILY_RECIPIENT_QUOTA_EXCEEDED",
          recipientCount: allRecipients.length,
          dailyRecipientLimit: this.options.dailyRecipientLimit,
          retryAfter: error.retryAfter.toISOString(),
        });
        throw error;
      }
      this.error("Verifica della quota email non riuscita.", {
        event: "mail.quota.failed",
        operationId,
        messageType,
        reasonCode: "QUOTA_GUARD_FAILED",
        recipientCount: allRecipients.length,
      });
      throw new Error("Impossibile verificare in sicurezza la quota di invio email.");
    }

    const message: SendMailOptions = {
      from: { name: branding.organizationName, address: this.options.user.trim().toLowerCase() },
      replyTo: (this.options.replyTo || this.options.user).trim().toLowerCase(),
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
    };
    if (groupedDelivery) {
      let result: GmailTransportResult;
      try {
        result = await this.transport.sendMail({
          ...message,
          to: normalizedRecipients,
          ...(normalizedBccRecipients.length > 0 ? { bcc: normalizedBccRecipients } : {}),
        });
      } catch (error) {
        const diagnostic = smtpFailureDiagnostic(error);
        this.error("Invio email raggruppato non riuscito.", {
          event: "mail.delivery.failed",
          operationId,
          messageType,
          recipientCount: allRecipients.length,
          succeededCount: 0,
          failedCount: allRecipients.length,
          ...diagnostic,
        });
        if (diagnostic.authenticationFailure) {
          this.error("Autenticazione Gmail OAuth 2.0 non riuscita durante l'invio.", {
            event: "mail.smtp.authentication.failed",
            operationId,
            messageType,
            source: "delivery",
            ...diagnostic,
          });
        }
        throw safeSmtpError(error);
      }

      if (result.rejected.length > 0 || result.accepted.length < allRecipients.length) {
        this.error("Gmail SMTP non ha accettato tutti i destinatari del messaggio raggruppato.", {
          event: "mail.delivery.failed",
          operationId,
          messageType,
          recipientCount: allRecipients.length,
          succeededCount: result.accepted.length,
          failedCount: Math.max(result.rejected.length, allRecipients.length - result.accepted.length),
          reasonCode: "SMTP_RECIPIENT_REJECTED",
        });
        throw new Error("Gmail non ha accettato tutti i destinatari del messaggio.");
      }

      this.info("Autenticazione Gmail OAuth 2.0 confermata durante l'invio.", {
        event: "mail.smtp.authentication.succeeded",
        operationId,
        messageType,
        source: "delivery",
        evidence: "smtp_message_accepted",
      });
      this.info("Invio email completato con successo.", {
        event: "mail.delivery.succeeded",
        operationId,
        messageType,
        recipientCount: allRecipients.length,
        succeededCount: allRecipients.length,
      });
      return;
    }

    let firstFailure: Error | null = null;
    let firstFailureReasonCode: string | null = null;
    let succeededCount = 0;
    let failedCount = 0;
    let authenticationConfirmed = false;
    for (const [recipientIndex, recipient] of normalizedRecipients.entries()) {
      const maskedRecipient = maskEmailAddress(recipient);
      this.info("Invio al destinatario avviato.", {
        event: "mail.delivery.recipient.started",
        operationId,
        messageType,
        recipient: maskedRecipient,
        recipientIndex: recipientIndex + 1,
        recipientCount: allRecipients.length,
      });
      let result: GmailTransportResult;
      try {
        result = await this.transport.sendMail({ ...message, to: recipient });
      } catch (error) {
        const diagnostic = smtpFailureDiagnostic(error);
        firstFailure ??= safeSmtpError(error);
        firstFailureReasonCode ??= diagnostic.reasonCode;
        failedCount += 1;
        this.error("Invio al destinatario non riuscito.", {
          event: "mail.delivery.recipient.failed",
          operationId,
          messageType,
          recipient: maskedRecipient,
          recipientIndex: recipientIndex + 1,
          ...diagnostic,
        });
        if (diagnostic.authenticationFailure) {
          this.error("Autenticazione Gmail OAuth 2.0 non riuscita durante l'invio.", {
            event: "mail.smtp.authentication.failed",
            operationId,
            messageType,
            source: "delivery",
            ...diagnostic,
          });
        }
        continue;
      }

      if (result.rejected.length > 0 || result.accepted.length < 1) {
        firstFailure ??= new Error("Gmail non ha accettato tutti i destinatari del messaggio.");
        firstFailureReasonCode ??= "SMTP_RECIPIENT_REJECTED";
        failedCount += 1;
        this.error("Gmail SMTP non ha accettato il destinatario.", {
          event: "mail.delivery.recipient.failed",
          operationId,
          messageType,
          recipient: maskedRecipient,
          recipientIndex: recipientIndex + 1,
          reasonCode: "SMTP_RECIPIENT_REJECTED",
          reason: "Gmail SMTP non ha accettato il destinatario.",
          acceptedCount: result.accepted.length,
          rejectedCount: result.rejected.length,
        });
        continue;
      }

      if (!authenticationConfirmed) {
        authenticationConfirmed = true;
        this.info("Autenticazione Gmail OAuth 2.0 confermata durante l'invio.", {
          event: "mail.smtp.authentication.succeeded",
          operationId,
          messageType,
          source: "delivery",
          evidence: "smtp_message_accepted",
        });
      }
      succeededCount += 1;
      this.info("Invio al destinatario accettato da Gmail SMTP.", {
        event: "mail.delivery.recipient.succeeded",
        operationId,
        messageType,
        recipient: maskedRecipient,
        recipientIndex: recipientIndex + 1,
        acceptedCount: result.accepted.length,
      });
    }

    if (firstFailure) {
      this.error("Invio email completato con errori.", {
        event: "mail.delivery.failed",
        operationId,
        messageType,
        recipientCount: allRecipients.length,
        succeededCount,
        failedCount,
        reasonCode: firstFailureReasonCode ?? "UNKNOWN_SMTP_FAILURE",
      });
      throw firstFailure;
    }

    this.info("Invio email completato con successo.", {
      event: "mail.delivery.succeeded",
      operationId,
      messageType,
      recipientCount: normalizedRecipients.length,
      succeededCount,
    });
  }

  private assertConfigured(context: MailLogContext): void {
    const invalidFields = invalidConfigurationFields(this.options);
    if (invalidFields.length > 0) {
      this.error("Configurazione Gmail OAuth 2.0 non valida.", {
        event: "mail.configuration.invalid",
        ...context,
        invalidFields: invalidFields.join(","),
      });
      throw new MailProviderNotConfiguredError();
    }
  }

  private info(message: string, context: MailLogContext): void {
    safelyLog(() => this.logger.info(message, context));
  }

  private warn(message: string, context: MailLogContext): void {
    safelyLog(() => this.logger.warn(message, context));
  }

  private error(message: string, context: MailLogContext): void {
    safelyLog(() => this.logger.error(message, context));
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
  const normalized = normalizeOptionalRecipients(recipients);
  if (normalized.length === 0) {
    throw new Error("Il messaggio contiene destinatari non validi.");
  }
  return normalized;
}

function normalizeOptionalRecipients(recipients: string[]): string[] {
  const normalized = [...new Set(recipients.map((recipient) => recipient.trim().toLowerCase()))];
  if (normalized.some((recipient) => !z.email().safeParse(recipient).success)) {
    throw new Error("Il messaggio contiene destinatari non validi.");
  }
  return normalized;
}

function invalidConfigurationFields(options: GmailSmtpMailProviderOptions): string[] {
  const invalidFields: string[] = [];
  const user = options.user.trim().toLowerCase();
  const replyTo = (options.replyTo || options.user).trim().toLowerCase();

  if (!z.email().safeParse(user).success) invalidFields.push("GMAIL_USER");
  if (!z.email().safeParse(replyTo).success) invalidFields.push("MAIL_REPLY_TO");
  if (!isSafeConfigurationValue(options.clientId)) invalidFields.push("GMAIL_OAUTH_CLIENT_ID");
  if (!isSafeConfigurationValue(options.clientSecret)) invalidFields.push("GMAIL_OAUTH_CLIENT_SECRET");
  if (!isSafeConfigurationValue(options.refreshToken)) invalidFields.push("GMAIL_OAUTH_REFRESH_TOKEN");
  if (!isSafeConfigurationValue(options.senderName)) invalidFields.push("MAIL_FROM_NAME");

  return invalidFields;
}

function isSafeConfigurationValue(value: string): boolean {
  return value.trim().length > 0 && !/[\r\n]/.test(value);
}

function maskEmailAddress(address: string): string {
  const atIndex = address.lastIndexOf("@");
  if (atIndex < 1) return "***";
  return `${address.slice(0, 1)}***${address.slice(atIndex)}`;
}

interface SmtpFailureDiagnostic extends MailLogContext {
  reasonCode: string;
  reason: string;
  smtpCode: string;
  responseCode: number | null;
  command: string;
  authenticationFailure: boolean;
}

function smtpFailureDiagnostic(error: unknown): SmtpFailureDiagnostic {
  const smtpError = error as {
    code?: unknown;
    responseCode?: unknown;
    response?: unknown;
    command?: unknown;
  };
  const smtpCode = sanitizeSmtpMetadata(smtpError.code, 32);
  const responseCode = typeof smtpError.responseCode === "number"
    ? smtpError.responseCode
    : null;
  const command = sanitizeSmtpMetadata(smtpError.command, 40, true);
  const response = typeof smtpError.response === "string"
    ? smtpError.response.toLowerCase()
    : "";

  if (/invalid_grant|token.+(?:revoked|expired|invalid)/.test(response)) {
    return {
      reasonCode: "OAUTH_REFRESH_TOKEN_REJECTED",
      reason: "Il refresh token OAuth è scaduto, revocato o non valido.",
      smtpCode,
      responseCode,
      command,
      authenticationFailure: true,
    };
  }
  if (/invalid_client/.test(response)) {
    return {
      reasonCode: "OAUTH_CLIENT_REJECTED",
      reason: "Client ID o client secret OAuth non accettati da Google.",
      smtpCode,
      responseCode,
      command,
      authenticationFailure: true,
    };
  }
  if (smtpCode === "EAUTH" || responseCode === 534 || responseCode === 535) {
    return {
      reasonCode: "OAUTH_AUTHENTICATION_REJECTED",
      reason: "Credenziali OAuth rifiutate da Gmail SMTP.",
      smtpCode,
      responseCode,
      command,
      authenticationFailure: true,
    };
  }
  if (/4\.7\.28|5\.4\.5|daily user sending limit|rate limit|quota/.test(response)) {
    return {
      reasonCode: "GMAIL_QUOTA_EXCEEDED",
      reason: "Gmail ha applicato un limite temporaneo o giornaliero agli invii.",
      smtpCode,
      responseCode,
      command,
      authenticationFailure: false,
    };
  }
  if (
    (responseCode !== null && responseCode >= 400 && responseCode < 500) ||
    ["ETIMEDOUT", "ECONNECTION", "ESOCKET"].includes(smtpCode)
  ) {
    return {
      reasonCode: "SMTP_TEMPORARY_FAILURE",
      reason: "Il servizio Gmail SMTP è temporaneamente non disponibile.",
      smtpCode,
      responseCode,
      command,
      authenticationFailure: false,
    };
  }
  if (responseCode !== null && responseCode >= 500 && responseCode < 600) {
    return {
      reasonCode: "SMTP_REJECTED",
      reason: "Gmail SMTP ha rifiutato definitivamente la richiesta.",
      smtpCode,
      responseCode,
      command,
      authenticationFailure: false,
    };
  }
  return {
    reasonCode: "UNKNOWN_SMTP_FAILURE",
    reason: "Errore SMTP non classificato.",
    smtpCode,
    responseCode,
    command,
    authenticationFailure: false,
  };
}

function sanitizeSmtpMetadata(value: unknown, maxLength: number, allowSpaces = false): string {
  if (typeof value !== "string") return "UNKNOWN";
  const normalized = value.trim().toUpperCase();
  const pattern = allowSpaces ? /^[A-Z0-9 _-]+$/ : /^[A-Z0-9_-]+$/;
  return normalized.length > 0 && normalized.length <= maxLength && pattern.test(normalized)
    ? normalized
    : "UNKNOWN";
}

function safelyLog(log: () => void): void {
  try {
    log();
  } catch {
    // Un logger esterno non deve mai interrompere l'invio delle email.
  }
}

function safeSmtpError(error: unknown): Error {
  const diagnostic = smtpFailureDiagnostic(error);

  if (diagnostic.authenticationFailure) {
    return new Error("Autenticazione Gmail OAuth 2.0 non riuscita.");
  }
  if (diagnostic.reasonCode === "GMAIL_QUOTA_EXCEEDED") {
    return new Error("Gmail ha temporaneamente limitato gli invii. Attendi il ripristino della quota prima di ritentare.");
  }
  if (diagnostic.reasonCode === "SMTP_TEMPORARY_FAILURE") {
    return new Error("Il servizio Gmail SMTP è temporaneamente non disponibile. Riprova più tardi.");
  }
  return new Error("Invio tramite Gmail SMTP non riuscito.");
}
