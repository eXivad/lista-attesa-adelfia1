import "server-only";

import { getAuthEnvironment } from "@/lib/server/environment";
import { getAuth } from "@/lib/server/auth";
import { getPrismaClient } from "@/lib/server/prisma";
import { StaffInvitationService, type PendingStaffInvitation } from "@/modules/staff/services/staff-invitation.service";
import { PowerAutomateMailProvider } from "@/providers/mail/power-automate-mail-provider";
import { PrismaStaffInvitationRepository } from "@/repositories/prisma/staff-invitation.repository";

export function getStaffInvitationService() {
  const environment = getAuthEnvironment();
  return new StaffInvitationService({
    repository: new PrismaStaffInvitationRepository(getPrismaClient()),
    mailProvider: new PowerAutomateMailProvider({
      webhookUrl: environment.POWER_AUTOMATE_WEBHOOK_URL,
      bearerToken: environment.POWER_AUTOMATE_BEARER_TOKEN,
      sender: environment.MAIL_FROM,
    }),
    accountProvisioner: {
      async create(input: PendingStaffInvitation & { password: string }) {
        const result = await getAuth().api.createUser({
          body: {
            email: input.email,
            password: input.password,
            name: `${input.firstName} ${input.lastName}`,
            data: {
              role: input.role,
              firstName: input.firstName,
              lastName: input.lastName,
              memberCode: input.memberCode,
            },
          },
        });
        return { id: result.user.id };
      },
    },
    baseUrl: environment.BETTER_AUTH_URL,
  });
}
