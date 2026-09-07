import "server-only";

import { getMailProvider } from "@/lib/server/mail";
import { getPrismaClient } from "@/lib/server/prisma";
import { ApplicantRegistrationService } from "@/modules/applicants/services/registration.service";
import { PrismaApplicantRegistrationRepository } from "@/repositories/prisma/applicant-registration.repository";
import { getRegistrationEnvironment } from "./environment";

export function getApplicantRegistrationService(): ApplicantRegistrationService {
  const environment = getRegistrationEnvironment();
  const repository = new PrismaApplicantRegistrationRepository(getPrismaClient());

  return new ApplicantRegistrationService({
    repository,
    mailProvider: getMailProvider(),
    hmacSecret: environment.IDENTIFIER_HMAC_KEY,
  });
}
