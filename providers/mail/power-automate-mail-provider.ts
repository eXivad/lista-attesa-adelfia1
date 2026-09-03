import type {
  MailProvider,
  PasswordResetMailInput,
  RegistrationMailInput,
  StaffInvitationMailInput,
  StatusMailInput,
} from "@/modules/mail/mail-provider";

type FetchImplementation = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface PowerAutomateMailProviderOptions {
  webhookUrl: string;
  bearerToken?: string;
  sender: string;
  timeoutMs?: number;
  fetchImplementation?: FetchImplementation;
}

export class MailProviderNotConfiguredError extends Error {
  constructor() {
    super("Il provider email non è configurato.");
    this.name = "MailProviderNotConfiguredError";
  }
}

export class PowerAutomateMailProvider implements MailProvider {
  private readonly fetchImplementation: FetchImplementation;
  private readonly timeoutMs: number;

  constructor(private readonly options: PowerAutomateMailProviderOptions) {
    this.fetchImplementation = options.fetchImplementation ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  sendRegistrationConfirmation(input: RegistrationMailInput): Promise<void> {
    return this.send("REGISTRATION_CONFIRMATION", input.recipients, {
      applicantName: input.applicantName,
      registrationNumber: input.registrationNumber,
    });
  }

  sendAcceptanceConfirmation(input: StatusMailInput): Promise<void> {
    return this.send("ACCEPTANCE_CONFIRMATION", input.recipients, {
      applicantName: input.applicantName,
      registrationNumber: input.registrationNumber,
    });
  }

  sendRejectionConfirmation(input: StatusMailInput): Promise<void> {
    return this.send("REJECTION_CONFIRMATION", input.recipients, {
      applicantName: input.applicantName,
      registrationNumber: input.registrationNumber,
    });
  }

  sendStaffInvitation(input: StaffInvitationMailInput): Promise<void> {
    return this.send("STAFF_INVITATION", [input.recipient], {
      staffName: input.staffName,
      invitationUrl: input.invitationUrl,
      expiresAt: input.expiresAt.toISOString(),
    });
  }

  sendPasswordReset(input: PasswordResetMailInput): Promise<void> {
    return this.send("PASSWORD_RESET", [input.recipient], {
      staffName: input.staffName,
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt.toISOString(),
    });
  }

  private async send(type: string, recipients: string[], data: Record<string, string>): Promise<void> {
    const webhookUrl = this.options.webhookUrl.trim();
    if (!webhookUrl) {
      throw new MailProviderNotConfiguredError();
    }

    assertSafeWebhookUrl(webhookUrl);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.options.bearerToken) {
      headers.Authorization = `Bearer ${this.options.bearerToken}`;
    }

    const response = await this.fetchImplementation(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type,
        sender: this.options.sender,
        recipients,
        data,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
      redirect: "error",
    });

    if (!response.ok) {
      throw new Error(`Power Automate ha risposto con stato ${response.status}.`);
    }
  }
}

function assertSafeWebhookUrl(value: string): void {
  const url = new URL(value);
  const isLocalDevelopment = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalDevelopment)) {
    throw new Error("Il webhook email deve usare HTTPS.");
  }
}
