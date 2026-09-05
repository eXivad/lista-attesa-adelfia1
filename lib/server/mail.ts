import "server-only";

import { getMailEnvironment } from "@/lib/server/environment";
import { getPrismaClient } from "@/lib/server/prisma";
import { GmailSmtpMailProvider } from "@/providers/mail/gmail-smtp-mail-provider";
import { PrismaMailQuotaGuard } from "@/repositories/prisma/mail-quota.repository";

const globalForMail = globalThis as unknown as { gmailMailProvider?: GmailSmtpMailProvider };

export function getMailProvider(): GmailSmtpMailProvider {
  if (!globalForMail.gmailMailProvider) {
    const environment = getMailEnvironment();
    globalForMail.gmailMailProvider = new GmailSmtpMailProvider({
      user: environment.GMAIL_USER,
      clientId: environment.GMAIL_OAUTH_CLIENT_ID,
      clientSecret: environment.GMAIL_OAUTH_CLIENT_SECRET,
      refreshToken: environment.GMAIL_OAUTH_REFRESH_TOKEN,
      senderName: environment.MAIL_FROM_NAME,
      replyTo: environment.MAIL_REPLY_TO,
      dailyRecipientLimit: environment.GMAIL_DAILY_RECIPIENT_LIMIT,
      maxRecipientsPerMessage: environment.GMAIL_MAX_RECIPIENTS_PER_MESSAGE,
      quotaGuard: new PrismaMailQuotaGuard(getPrismaClient()),
    });
  }

  return globalForMail.gmailMailProvider;
}
