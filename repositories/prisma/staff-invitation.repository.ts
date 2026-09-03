import { monotonicFactory } from "ulid";

import type { PrismaClient } from "@/generated/prisma/client";
import { redactTechnicalMessage } from "@/modules/mail/redact-technical-message";
import type { CreateStaffInvitationCommand, StaffInvitationRepository } from "@/modules/staff/services/staff-invitation.service";

export class PrismaStaffInvitationRepository implements StaffInvitationRepository {
  private readonly createId = monotonicFactory();
  constructor(private readonly client: PrismaClient) {}

  async create(command: CreateStaffInvitationCommand) {
    return this.client.$transaction(async (transaction) => {
      const invitationId = this.createId(command.createdAt.getTime());
      const outboxId = this.createId(command.createdAt.getTime());
      await transaction.staffInvitation.create({
        data: {
          id: invitationId,
          ...command,
          pendingEmail: command.email,
          pendingMemberCode: command.memberCode,
        },
      });
      await transaction.mailOutbox.create({
        data: {
          id: outboxId,
          type: "STAFF_INVITATION",
          recipients: [command.email],
          payload: { staffName: `${command.firstName} ${command.lastName}`, expiresAt: command.expiresAt.toISOString() },
          createdAt: command.createdAt,
        },
      });
      return { invitationId, outboxId };
    });
  }

  async findValidByTokenHash(tokenHash: string, now: Date) {
    return this.client.staffInvitation.findFirst({
      where: { tokenHash, acceptedAt: null, expiresAt: { gt: now } },
      select: { id: true, firstName: true, lastName: true, email: true, memberCode: true, role: true },
    });
  }

  async markAccepted(invitationId: string, acceptedAt: Date): Promise<boolean> {
    const result = await this.client.staffInvitation.updateMany({
      where: { id: invitationId, acceptedAt: null, expiresAt: { gt: acceptedAt } },
      data: { acceptedAt, pendingEmail: null, pendingMemberCode: null },
    });
    return result.count === 1;
  }

  async markMailDelivered(outboxId: string, deliveredAt: Date): Promise<void> {
    await this.client.mailOutbox.update({ where: { id: outboxId }, data: { status: "SENT", sentAt: deliveredAt, attemptCount: { increment: 1 }, lastError: null } });
  }

  async markMailFailed(outboxId: string, _failedAt: Date, reason: string): Promise<void> {
    await this.client.mailOutbox.update({ where: { id: outboxId }, data: { status: "FAILED", attemptCount: { increment: 1 }, lastError: redactTechnicalMessage(reason) } });
  }
}
