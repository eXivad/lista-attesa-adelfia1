import "server-only";

import { getPrismaClient } from "@/lib/server/prisma";
import { ApplicantRegistrationService } from "@/modules/applicants/services/registration.service";
import { PowerAutomateMailProvider } from "@/providers/mail/power-automate-mail-provider";
import { PrismaApplicantRegistrationRepository } from "@/repositories/prisma/applicant-registration.repository";
import { getRegistrationEnvironment } from "./environment";

export function getApplicantRegistrationService(): ApplicantRegistrationService {
  const environment = getRegistrationEnvironment();
  const repository = new PrismaApplicantRegistrationRepository(getPrismaClient());
  const mailProvider = new PowerAutomateMailProvider({
    webhookUrl: environment.POWER_AUTOMATE_WEBHOOK_URL,
    bearerToken: environment.POWER_AUTOMATE_BEARER_TOKEN,
    sender: environment.MAIL_FROM,
  });

  return new ApplicantRegistrationService({
    repository,
    mailProvider,
    hmacSecret: environment.IDENTIFIER_HMAC_KEY,
  });
}
