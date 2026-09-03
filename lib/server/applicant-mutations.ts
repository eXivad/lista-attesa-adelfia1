import "server-only";

import { getRegistrationEnvironment } from "@/lib/server/environment";
import { getPrismaClient } from "@/lib/server/prisma";
import { ApplicantMutationService } from "@/modules/applicants/services/applicant-mutation.service";
import { PowerAutomateMailProvider } from "@/providers/mail/power-automate-mail-provider";
import { PrismaApplicantMutationRepository } from "@/repositories/prisma/applicant-mutation.repository";

export function getApplicantMutationService(): ApplicantMutationService {
  const environment = getRegistrationEnvironment();
  return new ApplicantMutationService({
    repository: new PrismaApplicantMutationRepository(getPrismaClient()),
    mailProvider: new PowerAutomateMailProvider({
      webhookUrl: environment.POWER_AUTOMATE_WEBHOOK_URL,
      bearerToken: environment.POWER_AUTOMATE_BEARER_TOKEN,
      sender: environment.MAIL_FROM,
    }),
    hmacSecret: environment.IDENTIFIER_HMAC_KEY,
  });
}
