import { hashFiscalCode } from "@/modules/applicants/domain/identifier-hash";
import { canTransition, type ApplicantStatus } from "@/modules/applicants/domain/state-machine";
import {
  createApplicantDataSchema,
  type ApplicantDataInput,
  type ValidatedApplicantData,
} from "@/modules/applicants/schemas/applicant-data";
import type { StatusMailInput } from "@/modules/mail/mail-provider";

export type ApplicantMutationErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CONCURRENT_CHANGE";

export class ApplicantMutationError extends Error {
  constructor(
    public readonly code: ApplicantMutationErrorCode,
    public readonly userMessage: string,
    options?: ErrorOptions,
  ) {
    super(userMessage, options);
    this.name = "ApplicantMutationError";
  }
}

export interface ApplicantMutationSummary {
  id: string;
  registrationNumber: string;
  firstName: string;
  lastName: string;
  fiscalCode: string | null;
  status: ApplicantStatus;
  recipients: string[];
}

export interface UpdateApplicantCommand {
  minor: Omit<ValidatedApplicantData["minor"], "birthDate"> & {
    birthDate: Date;
    birthYear: number;
  };
  guardians: Array<
    Omit<ValidatedApplicantData["guardians"][number], "birthDate"> & { birthDate: Date }
  >;
}

export interface StatusTransitionCommand {
  id: string;
  from: ApplicantStatus;
  to: ApplicantStatus;
  changedAt: Date;
  blockedIdentifierHash?: string;
}

export interface DeleteApplicantCommand {
  id: string;
  blockedIdentifierHash?: string;
}

export type StatusTransitionResult =
  | { changed: false }
  | { changed: true; outboxId: null }
  | { changed: true; outboxId: string; recipients: string[]; bccRecipients: string[] };

export interface ApplicantMutationRepository {
  getApplicant(id: string): Promise<ApplicantMutationSummary | null>;
  updateApplicant(id: string, command: UpdateApplicantCommand): Promise<boolean>;
  transitionStatus(command: StatusTransitionCommand): Promise<StatusTransitionResult>;
  deleteApplicant(command: DeleteApplicantCommand): Promise<boolean>;
  markMailDelivered(outboxId: string, deliveredAt: Date): Promise<void>;
  markMailFailed(outboxId: string, failedAt: Date, reason: string): Promise<void>;
}

export interface ApplicantStatusMailProvider {
  sendAcceptanceConfirmation(input: StatusMailInput): Promise<void>;
  sendRejectionConfirmation(input: StatusMailInput): Promise<void>;
}

interface ApplicantMutationServiceDependencies {
  repository: ApplicantMutationRepository;
  mailProvider: ApplicantStatusMailProvider;
  hmacSecret: string;
  clock?: () => Date;
}

export class ApplicantMutationService {
  private readonly clock: () => Date;

  constructor(private readonly dependencies: ApplicantMutationServiceDependencies) {
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async update(id: string, input: ApplicantDataInput | unknown) {
    const now = this.clock();
    const parsed = createApplicantDataSchema(() => now).safeParse(input);
    if (!parsed.success) {
      throw new ApplicantMutationError("INVALID_INPUT", "Controlla i dati inseriti e riprova.", {
        cause: parsed.error,
      });
    }

    const changed = await this.dependencies.repository.updateApplicant(id, {
      minor: {
        ...parsed.data.minor,
        birthDate: toDate(parsed.data.minor.birthDate),
        birthYear: Number(parsed.data.minor.birthDate.slice(0, 4)),
      },
      guardians: parsed.data.guardians.map((guardian) => ({
        ...guardian,
        birthDate: toDate(guardian.birthDate),
      })),
    });
    if (!changed) {
      throw new ApplicantMutationError("NOT_FOUND", "L'iscritto non esiste più.");
    }
    return { id };
  }

  async changeStatus(id: string, targetStatus: ApplicantStatus) {
    const applicant = await this.requireApplicant(id);
    if (!canTransition(applicant.status, targetStatus)) {
      throw new ApplicantMutationError(
        "INVALID_TRANSITION",
        `Il passaggio da ${applicant.status} a ${targetStatus} non è consentito.`,
      );
    }

    const now = this.clock();
    const transition = await this.dependencies.repository.transitionStatus({
      id,
      from: applicant.status,
      to: targetStatus,
      changedAt: now,
      ...(targetStatus === "RIFIUTATO" && applicant.fiscalCode
        ? { blockedIdentifierHash: hashFiscalCode(applicant.fiscalCode, this.dependencies.hmacSecret) }
        : {}),
    });
    if (!transition.changed) {
      throw new ApplicantMutationError(
        "CONCURRENT_CHANGE",
        "Lo stato è stato modificato da un altro utente. Ricarica la pagina.",
      );
    }

    if (!transition.outboxId) {
      return { id, status: targetStatus, emailDelivery: "NOT_REQUIRED" as const };
    }

    const mailInput: StatusMailInput = {
      applicantName: `${applicant.firstName} ${applicant.lastName}`,
      registrationNumber: applicant.registrationNumber,
      recipients: transition.recipients,
      bccRecipients: transition.bccRecipients,
    };
    let emailDelivery: "SENT" | "FAILED" = "SENT";
    try {
      if (targetStatus === "ACCETTATO") {
        await this.dependencies.mailProvider.sendAcceptanceConfirmation(mailInput);
      } else {
        await this.dependencies.mailProvider.sendRejectionConfirmation(mailInput);
      }
      await this.dependencies.repository.markMailDelivered(transition.outboxId, now);
    } catch (error) {
      emailDelivery = "FAILED";
      await this.dependencies.repository.markMailFailed(
        transition.outboxId,
        now,
        error instanceof Error ? error.message : "Errore provider email",
      );
    }

    return { id, status: targetStatus, emailDelivery } as const;
  }

  async delete(id: string) {
    const applicant = await this.requireApplicant(id);
    const deleted = await this.dependencies.repository.deleteApplicant({
      id,
      ...(applicant.status === "RIFIUTATO" && applicant.fiscalCode
        ? { blockedIdentifierHash: hashFiscalCode(applicant.fiscalCode, this.dependencies.hmacSecret) }
        : {}),
    });
    if (!deleted) {
      throw new ApplicantMutationError("CONCURRENT_CHANGE", "L'iscritto è già stato modificato o eliminato.");
    }
    return { id };
  }

  private async requireApplicant(id: string) {
    const applicant = await this.dependencies.repository.getApplicant(id);
    if (!applicant) {
      throw new ApplicantMutationError("NOT_FOUND", "L'iscritto non è stato trovato.");
    }
    return applicant;
  }
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
