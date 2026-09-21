import { hashFiscalCode } from "@/modules/applicants/domain/identifier-hash";
import type { ApplicantStatus } from "@/modules/applicants/domain/state-machine";
import type { Branch, BranchConfiguration } from "@/modules/branches/domain/branch";
import { getEntryBirthYears } from "@/modules/branches/domain/branch";
import type { RegistrationMailInput } from "@/modules/mail/mail-provider";
import {
  createApplicantRegistrationSchema,
  type ApplicantRegistrationInput,
  type ValidatedApplicantRegistration,
} from "@/modules/applicants/schemas/registration";

const ALREADY_REGISTERED_MESSAGE =
  "Questo ragazzo risulta già registrato nella lista d'attesa. Contattare il Gruppo o i Capi Gruppo per maggiori informazioni.";

export type RegistrationErrorCode =
  | "ALREADY_REGISTERED"
  | "INVALID_INPUT"
  | "PRIVACY_VERSION_EXPIRED";

export class ApplicantRegistrationError extends Error {
  constructor(
    public readonly code: RegistrationErrorCode,
    public readonly userMessage: string,
    options?: ErrorOptions,
  ) {
    super(userMessage, options);
    this.name = "ApplicantRegistrationError";
  }
}

export class DuplicateApplicantError extends Error {
  constructor() {
    super(ALREADY_REGISTERED_MESSAGE);
    this.name = "DuplicateApplicantError";
  }
}

export interface RegistrationContext {
  activePrivacyPolicyVersion: string | null;
  openCalls: { associativeYearId: string; startYear: number } | null;
  branchConfiguration: BranchConfiguration[];
}

export interface CreateRegistrationCommand {
  createdAt: Date;
  privacyAcceptedAt: Date;
  privacyPolicyVersion: string;
  status: ApplicantStatus;
  associativeYearId?: string;
  branch?: Branch;
  minor: Omit<ValidatedApplicantRegistration["minor"], "birthDate"> & {
    birthDate: Date;
    birthYear: number;
  };
  guardians: Array<
    Omit<ValidatedApplicantRegistration["guardians"][number], "birthDate"> & { birthDate: Date }
  >;
}

export interface ApplicantRegistrationRepository {
  getRegistrationContext(): Promise<RegistrationContext>;
  isIdentifierBlocked(identifierHash: string): Promise<boolean>;
  createRegistration(command: CreateRegistrationCommand): Promise<{
    id: string;
    registrationNumber: string;
    status: ApplicantStatus;
    outboxId: string;
    recipients: string[];
    bccRecipients: string[];
  }>;
  markMailDelivered(outboxId: string, deliveredAt: Date): Promise<void>;
  markMailFailed(outboxId: string, failedAt: Date, reason: string): Promise<void>;
}

export interface RegistrationMailProvider {
  sendRegistrationConfirmation(input: RegistrationMailInput): Promise<void>;
}

interface ApplicantRegistrationServiceDependencies {
  repository: ApplicantRegistrationRepository;
  mailProvider: RegistrationMailProvider;
  hmacSecret: string;
  clock?: () => Date;
}

export class ApplicantRegistrationService {
  private readonly clock: () => Date;

  constructor(private readonly dependencies: ApplicantRegistrationServiceDependencies) {
    this.clock = dependencies.clock ?? (() => new Date());
  }

  async register(input: ApplicantRegistrationInput) {
    const now = this.clock();
    const parsed = createApplicantRegistrationSchema(() => now).safeParse(input);
    if (!parsed.success) {
      throw new ApplicantRegistrationError("INVALID_INPUT", "Controlla i dati inseriti e riprova.", {
        cause: parsed.error,
      });
    }

    const context = await this.dependencies.repository.getRegistrationContext();
    if (context.activePrivacyPolicyVersion !== parsed.data.privacyPolicyVersion) {
      throw new ApplicantRegistrationError(
        "PRIVACY_VERSION_EXPIRED",
        "L'informativa privacy è stata aggiornata. Rileggila e conferma nuovamente.",
      );
    }

    const identifierHash = hashFiscalCode(parsed.data.minor.fiscalCode, this.dependencies.hmacSecret);
    if (await this.dependencies.repository.isIdentifierBlocked(identifierHash)) {
      throw new ApplicantRegistrationError("ALREADY_REGISTERED", ALREADY_REGISTERED_MESSAGE);
    }

    const placement = this.getInitialPlacement(parsed.data.minor.birthDate, context);
    let registration;
    try {
      registration = await this.dependencies.repository.createRegistration({
        createdAt: now,
        privacyAcceptedAt: now,
        privacyPolicyVersion: parsed.data.privacyPolicyVersion,
        status: placement.status,
        ...(placement.associativeYearId ? { associativeYearId: placement.associativeYearId } : {}),
        ...(placement.branch ? { branch: placement.branch } : {}),
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
    } catch (error) {
      if (error instanceof DuplicateApplicantError) {
        throw new ApplicantRegistrationError("ALREADY_REGISTERED", ALREADY_REGISTERED_MESSAGE, {
          cause: error,
        });
      }
      throw error;
    }

    let emailDelivery: "SENT" | "FAILED" = "SENT";
    try {
      await this.dependencies.mailProvider.sendRegistrationConfirmation({
        applicantName: `${parsed.data.minor.firstName} ${parsed.data.minor.lastName}`,
        applicantBirthDate: toDate(parsed.data.minor.birthDate),
        registrationNumber: registration.registrationNumber,
        recipients: registration.recipients,
        bccRecipients: registration.bccRecipients,
      });
      await this.dependencies.repository.markMailDelivered(registration.outboxId, now);
    } catch (error) {
      emailDelivery = "FAILED";
      await this.dependencies.repository.markMailFailed(
        registration.outboxId,
        now,
        error instanceof Error ? error.message : "Errore provider email",
      );
    }

    return {
      id: registration.id,
      registrationNumber: registration.registrationNumber,
      status: registration.status,
      emailDelivery,
    } as const;
  }

  private getInitialPlacement(birthDate: string, context: RegistrationContext) {
    if (!context.openCalls) {
      return { status: "IN_ATTESA" as const };
    }

    const birthYear = Number(birthDate.slice(0, 4));
    const entryYears = getEntryBirthYears(context.openCalls.startYear, context.branchConfiguration);
    const branch = (Object.entries(entryYears) as Array<[Branch, number]>).find(
      ([, eligibleBirthYear]) => eligibleBirthYear === birthYear,
    )?.[0];

    if (!branch) {
      return { status: "IN_ATTESA" as const };
    }

    return {
      status: "DA_CHIAMARE" as const,
      associativeYearId: context.openCalls.associativeYearId,
      branch,
    };
  }
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
