import { monotonicFactory } from "ulid";

import type { PrismaClient } from "@/generated/prisma/client";
import type {
  ApplicantMutationRepository,
  DeleteApplicantCommand,
  StatusTransitionCommand,
  UpdateApplicantCommand,
} from "@/modules/applicants/services/applicant-mutation.service";
import { redactTechnicalMessage } from "@/modules/mail/redact-technical-message";

interface RepositoryOptions {
  createId?: (timestamp?: number) => string;
}

export class PrismaApplicantMutationRepository implements ApplicantMutationRepository {
  private readonly createId: (timestamp?: number) => string;

  constructor(
    private readonly client: PrismaClient,
    options: RepositoryOptions = {},
  ) {
    this.createId = options.createId ?? monotonicFactory();
  }

  async getApplicant(id: string) {
    const entry = await this.client.waitingListEntry.findUnique({
      where: { id },
      select: {
        id: true,
        registrationNumber: true,
        firstName: true,
        lastName: true,
        fiscalCode: true,
        status: true,
        guardians: { select: { email: true }, orderBy: { type: "asc" } },
      },
    });
    if (!entry) return null;
    return {
      ...entry,
      recipients: uniqueEmails(entry.guardians.map(({ email }) => email)),
    };
  }

  async updateApplicant(id: string, command: UpdateApplicantCommand): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      const updated = await transaction.waitingListEntry.updateMany({
        where: { id },
        data: {
          firstName: command.minor.firstName,
          lastName: command.minor.lastName,
          gender: command.minor.gender,
          birthDate: command.minor.birthDate,
          birthYear: command.minor.birthYear,
          birthPlace: command.minor.birthPlace,
          birthProvince: command.minor.birthProvince,
          fiscalCode: command.minor.fiscalCode,
          residenceAddress: command.minor.residenceAddress,
          residenceCity: command.minor.residenceCity,
          residenceProvince: command.minor.residenceProvince,
          residencePostalCode: command.minor.residencePostalCode,
          notes: command.minor.notes,
        },
      });
      if (updated.count !== 1) return false;

      for (const guardian of command.guardians) {
        const data = {
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          birthDate: guardian.birthDate,
          birthPlace: guardian.birthPlace,
          birthProvince: guardian.birthProvince,
          fiscalCode: guardian.fiscalCode,
          address: guardian.address,
          city: guardian.city,
          province: guardian.province,
          postalCode: guardian.postalCode,
          email: guardian.email,
          phone: guardian.phone,
        };
        await transaction.guardian.upsert({
          where: { applicantId_type: { applicantId: id, type: guardian.type } },
          update: data,
          create: {
            id: this.createId(),
            applicantId: id,
            type: guardian.type,
            ...data,
          },
        });
      }
      await transaction.guardian.deleteMany({
        where: { applicantId: id, type: { notIn: command.guardians.map(({ type }) => type) } },
      });
      return true;
    });
  }

  async transitionStatus(command: StatusTransitionCommand) {
    return this.client.$transaction(async (transaction) => {
      const isTerminal = command.to === "ACCETTATO" || command.to === "RIFIUTATO";
      const updated = await transaction.waitingListEntry.updateMany({
        where: { id: command.id, status: command.from },
        data: {
          status: command.to,
          terminalStatusAt: isTerminal ? command.changedAt : null,
        },
      });
      if (updated.count !== 1) return { changed: false as const };

      await transaction.callParticipation.updateMany({
        where: {
          applicantId: command.id,
          outcome: command.from,
          associativeYear: { status: "CALLS_OPEN" },
        },
        data: { outcome: command.to },
      });

      if (command.blockedIdentifierHash) {
        await transaction.blockedIdentifier.upsert({
          where: { identifierHash: command.blockedIdentifierHash },
          create: {
            id: this.createId(command.changedAt.getTime()),
            identifierHash: command.blockedIdentifierHash,
            reason: "Rifiuto registrato",
            createdAt: command.changedAt,
          },
          update: {},
        });
      }

      if (!isTerminal) {
        return { changed: true as const, outboxId: null };
      }

      const applicant = await transaction.waitingListEntry.findUnique({
        where: { id: command.id },
        select: {
          registrationNumber: true,
          firstName: true,
          lastName: true,
          guardians: { select: { email: true }, orderBy: { type: "asc" } },
        },
      });
      if (!applicant) throw new Error("Applicant disappeared during status transaction");
      const internalRecipients = await transaction.mailingRecipient.findMany({
        where: { isActive: true },
        orderBy: { email: "asc" },
        select: { email: true },
      });
      const recipients = uniqueEmails(applicant.guardians.map(({ email }) => email));
      const recipientSet = new Set(recipients);
      const bccRecipients = uniqueEmails(internalRecipients.map(({ email }) => email))
        .filter((email) => !recipientSet.has(email));
      const allRecipients = [...recipients, ...bccRecipients];

      const outboxId = this.createId(command.changedAt.getTime());
      await transaction.mailOutbox.create({
        data: {
          id: outboxId,
          type: command.to === "ACCETTATO" ? "ACCEPTANCE_CONFIRMATION" : "REJECTION_CONFIRMATION",
          recipients: allRecipients,
          payload: {
            applicantName: `${applicant.firstName} ${applicant.lastName}`,
            registrationNumber: applicant.registrationNumber,
          },
          applicantId: command.id,
          createdAt: command.changedAt,
        },
      });

      return { changed: true as const, outboxId, recipients, bccRecipients };
    });
  }

  async deleteApplicant(command: DeleteApplicantCommand): Promise<boolean> {
    return this.client.$transaction(async (transaction) => {
      if (command.blockedIdentifierHash) {
        await transaction.blockedIdentifier.upsert({
          where: { identifierHash: command.blockedIdentifierHash },
          create: {
            id: this.createId(),
            identifierHash: command.blockedIdentifierHash,
            reason: "Rifiuto registrato",
          },
          update: {},
        });
      }
      const deleted = await transaction.waitingListEntry.deleteMany({ where: { id: command.id } });
      return deleted.count === 1;
    });
  }

  async markMailDelivered(outboxId: string, deliveredAt: Date): Promise<void> {
    await this.client.mailOutbox.update({
      where: { id: outboxId },
      data: {
        status: "SENT",
        sentAt: deliveredAt,
        lastError: null,
        attemptCount: { increment: 1 },
      },
    });
  }

  async markMailFailed(outboxId: string, _failedAt: Date, reason: string): Promise<void> {
    await this.client.mailOutbox.update({
      where: { id: outboxId },
      data: {
        status: "FAILED",
        lastError: redactTechnicalMessage(reason),
        attemptCount: { increment: 1 },
      },
    });
  }
}

function uniqueEmails(emails: Array<string | null | undefined>): string[] {
  return [...new Set(
    emails
      .filter((email): email is string => Boolean(email?.trim()))
      .map((email) => email.trim().toLowerCase()),
  )];
}
