import { hashFiscalCode } from "@/modules/applicants/domain/identifier-hash";
import type { ApplicantStatus } from "@/modules/applicants/domain/state-machine";

export interface RetentionCandidate {
  id: string;
  status: ApplicantStatus;
  fiscalCode: string | null;
}

export interface RetentionDeleteCommand {
  id: string;
  blockedIdentifierHash?: string;
}

export interface RetentionRepository {
  getMaximumAge(): Promise<number>;
  findCandidates(cutoffs: { terminalOnOrBefore: Date; bornOnOrBefore: Date }): Promise<RetentionCandidate[]>;
  deleteCandidates(commands: RetentionDeleteCommand[]): Promise<number>;
}

export class RetentionService {
  private readonly clock: () => Date;
  constructor(private readonly options: { repository: RetentionRepository; hmacSecret: string; clock?: () => Date }) {
    this.clock = options.clock ?? (() => new Date());
  }

  async run({ retentionDays, apply }: { retentionDays: number; apply: boolean }) {
    if (!Number.isInteger(retentionDays) || retentionDays < 1) throw new Error("RETENTION_DAYS deve essere un intero positivo.");
    const now = this.clock();
    const maximumAge = await this.options.repository.getMaximumAge();
    const terminalOnOrBefore = new Date(now.getTime() - retentionDays * 24 * 60 * 60_000);
    const bornOnOrBefore = new Date(Date.UTC(now.getUTCFullYear() - maximumAge - 1, now.getUTCMonth(), now.getUTCDate()));
    const candidates = await this.options.repository.findCandidates({ terminalOnOrBefore, bornOnOrBefore });
    const commands = candidates.map((candidate) => ({
      id: candidate.id,
      ...(candidate.status === "RIFIUTATO" && candidate.fiscalCode
        ? { blockedIdentifierHash: hashFiscalCode(candidate.fiscalCode, this.options.hmacSecret) }
        : {}),
    }));
    const deleted = apply && commands.length > 0 ? await this.options.repository.deleteCandidates(commands) : 0;
    return { mode: apply ? "APPLY" as const : "DRY_RUN" as const, candidates: candidates.length, deleted, candidateIds: candidates.map(({ id }) => id) };
  }
}
