import "server-only";

import { getRegistrationEnvironment } from "@/lib/server/environment";
import { getMailProvider } from "@/lib/server/mail";
import { getPrismaClient } from "@/lib/server/prisma";
import { ApplicantMutationService } from "@/modules/applicants/services/applicant-mutation.service";
import { PrismaApplicantMutationRepository } from "@/repositories/prisma/applicant-mutation.repository";

export function getApplicantMutationService(): ApplicantMutationService {
  const environment = getRegistrationEnvironment();
  return new ApplicantMutationService({
    repository: new PrismaApplicantMutationRepository(getPrismaClient()),
    mailProvider: getMailProvider(),
    hmacSecret: environment.IDENTIFIER_HMAC_KEY,
  });
}
