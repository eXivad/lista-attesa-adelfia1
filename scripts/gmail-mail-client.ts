import type { MailQuotaGuard } from "../modules/mail/mail-quota";
import { GmailSmtpMailProvider } from "../providers/mail/gmail-smtp-mail-provider";
import { getMailEnvironment } from "../lib/server/environment";

export function createScriptGmailMailProvider(quotaGuard: MailQuotaGuard): GmailSmtpMailProvider {
  const environment = getMailEnvironment();
  return new GmailSmtpMailProvider({
    user: environment.GMAIL_USER,
    clientId: environment.GMAIL_OAUTH_CLIENT_ID,
    clientSecret: environment.GMAIL_OAUTH_CLIENT_SECRET,
    refreshToken: environment.GMAIL_OAUTH_REFRESH_TOKEN,
    senderName: environment.MAIL_FROM_NAME,
    replyTo: environment.MAIL_REPLY_TO,
    dailyRecipientLimit: environment.GMAIL_DAILY_RECIPIENT_LIMIT,
    maxRecipientsPerMessage: environment.GMAIL_MAX_RECIPIENTS_PER_MESSAGE,
    quotaGuard,
  });
}
