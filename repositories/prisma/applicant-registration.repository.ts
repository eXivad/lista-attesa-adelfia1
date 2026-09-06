import { monotonicFactory } from "ulid";

import type { PrismaClient } from "@/generated/prisma/client";
import { formatRegistrationNumber, getRegistrationYear } from "@/modules/applicants/domain/registration-number";
import {
  DuplicateApplicantError,
  type ApplicantRegistrationRepository,
  type CreateRegistrationCommand,
} from "@/modules/applicants/services/registration.service";
import type { BranchConfiguration } from "@/modules/branches/domain/branch";
import { redactTechnicalMessage } from "@/modules/mail/redact-technical-message";

interface RepositoryOptions {
  createId?: (timestamp?: number) => string;
}

export class PrismaApplicantRegistrationRepository implements ApplicantRegistrationRepository {
  private readonly createId: (timestamp?: number) => string;

  constructor(
    private readonly client: PrismaClient,
    options: RepositoryOptions = {},
  ) {
    this.createId = options.createId ?? monotonicFactory();
  }

  async getRegistrationContext() {
    const [privacyPolicy, openCalls, branches] = await Promise.all([
      this.client.privacyPolicyVersion.findFirst({
        where: { isActive: true },
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        select: { version: true },
      }),
      this.client.associativeYear.findFirst({
        where: { currentKey: 1, status: "CALLS_OPEN" },
        select: { id: true, startYear: true },
      }),
      this.client.branchConfiguration.findMany({ orderBy: { minAge: "asc" } }),
    ]);

    return {
      activePrivacyPolicyVersion: privacyPolicy?.version ?? null,
      openCalls: openCalls
        ? { associativeYearId: openCalls.id, startYear: openCalls.startYear }
        : null,
      branchConfiguration: branches.map(
        ({ branch, minAge, maxAge, entryAge }) =>
          ({ branch, minAge, maxAge, entryAge }) satisfies BranchConfiguration,
      ),
    };
  }

  async isIdentifierBlocked(identifierHash: string): Promise<boolean> {
    const blocked = await this.client.blockedIdentifier.findUnique({
      where: { identifierHash },
      select: { id: true },
    });
    return Boolean(blocked);
  }

  async createRegistration(command: CreateRegistrationCommand) {
    const timestamp = command.createdAt.getTime();
    const entryId = this.createId(timestamp);
    const guardianIds = command.guardians.map(() => this.createId(timestamp));
    const outboxId = this.createId(timestamp);

    try {
      return await this.client.$transaction(async (transaction) => {
        const registrationYear = getRegistrationYear(command.createdAt);
        const counter = await transaction.registrationCounter.upsert({
          where: { year: registrationYear },
          create: { year: registrationYear, lastValue: 1 },
          update: { lastValue: { increment: 1 } },
          select: { lastValue: true },
        });
        const registrationNumber = formatRegistrationNumber(registrationYear, counter.lastValue);
        const internalRecipients = await transaction.mailingRecipient.findMany({
          where: { isActive: true },
          orderBy: { email: "asc" },
          select: { email: true },
        });
        const recipients = uniqueEmails([
          ...command.guardians.map(({ email }) => email),
          ...internalRecipients.map(({ email }) => email),
        ]);

        await transaction.waitingListEntry.create({
          data: {
            id: entryId,
            registrationNumber,
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
            status: command.status,
            privacyAccepted: true,
            privacyAcceptedAt: command.privacyAcceptedAt,
            privacyPolicyVersion: command.privacyPolicyVersion,
            createdAt: command.createdAt,
            guardians: {
              create: command.guardians.map((guardian, index) => ({
                id: guardianIds[index],
                type: guardian.type,
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
                createdAt: command.createdAt,
              })),
            },
            ...(command.associativeYearId && command.branch
              ? {
                  participations: {
                    create: {
                      id: this.createId(timestamp),
                      associativeYearId: command.associativeYearId,
                      branch: command.branch,
                      gender: command.minor.gender,
                      birthYear: command.minor.birthYear,
                      outcome: "DA_CHIAMARE",
                      createdAt: command.createdAt,
                    },
                  },
                }
              : {}),
            mailOutbox: {
              create: {
                id: outboxId,
                type: "REGISTRATION_CONFIRMATION",
                recipients,
                payload: {
                  applicantName: `${command.minor.firstName} ${command.minor.lastName}`,
                  applicantBirthDate: command.minor.birthDate.toISOString(),
                  registrationNumber,
                },
                createdAt: command.createdAt,
              },
            },
          },
          select: { id: true },
        });

        return {
          id: entryId,
          registrationNumber,
          status: command.status,
          outboxId,
          recipients,
        };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new DuplicateApplicantError();
      }
      throw error;
    }
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

function uniqueEmails(emails: string[]): string[] {
  return [...new Set(emails.map((email) => email.trim().toLowerCase()))];
}

function isUniqueConstraintError(error: unknown): error is { code: "P2002" } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
