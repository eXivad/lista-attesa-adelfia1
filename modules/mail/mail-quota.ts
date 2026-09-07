export const MAIL_QUOTA_WINDOW_MS = 24 * 60 * 60 * 1_000;

export interface ReserveMailQuotaCommand {
  sender: string;
  recipientCount: number;
  limit: number;
  now: Date;
}

export interface MailQuotaGuard {
  reserve(command: ReserveMailQuotaCommand): Promise<void>;
}

export class MailDailyQuotaExceededError extends Error {
  constructor(public readonly retryAfter: Date) {
    super("Il limite prudenziale di invio Gmail nelle ultime 24 ore è stato raggiunto. Riprova più tardi.");
    this.name = "MailDailyQuotaExceededError";
  }
}
