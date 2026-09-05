import { monotonicFactory } from "ulid";

import type { ApplicantGender, Branch, PrismaClient } from "@/generated/prisma/client";
import type { BranchConfiguration } from "@/modules/branches/domain/branch";
import type {
  AssociativeYearRepository,
  CloseCallsCommand,
  CreateAssociativeYearCommand,
  OpenCallsCommand,
} from "@/modules/years/services/associative-year.service";

interface RepositoryOptions {
  createId?: (timestamp?: number) => string;
}

export class PrismaAssociativeYearRepository implements AssociativeYearRepository {
  private readonly createId: (timestamp?: number) => string;

  constructor(
    private readonly client: PrismaClient,
    options: RepositoryOptions = {},
  ) {
    this.createId = options.createId ?? monotonicFactory();
  }

  async getCurrent() {
    return this.client.associativeYear.findFirst({
      where: { currentKey: 1 },
      select: { id: true, label: true, startYear: true, status: true },
    });
  }

  async getBranchConfiguration() {
    return this.client.branchConfiguration.findMany({
      orderBy: { minAge: "asc" },
      select: { branch: true, minAge: true, maxAge: true, entryAge: true },
    });
  }

  async getManagementOverview() {
    const [current, years, branches] = await this.client.$transaction([
      this.client.associativeYear.findFirst({
        where: { currentKey: 1 },
        select: { id: true, label: true, startYear: true, endYear: true, status: true, callsOpenedAt: true, callsClosedAt: true },
      }),
      this.client.associativeYear.findMany({ orderBy: { startYear: "desc" } }),
      this.client.branchConfiguration.findMany({ orderBy: { minAge: "asc" } }),
    ]);
    return { current, years, branches };
  }

  async getStatistics() {
    return this.client.associativeYear.findMany({
      where: { statistics: { some: {} } },
      orderBy: { startYear: "desc" },
      select: {
        id: true,
        label: true,
        callsClosedAt: true,
        statistics: { orderBy: [{ branch: "asc" }, { gender: "asc" }, { birthYear: "desc" }] },
      },
    });
  }

  async updateBranchConfigurations(configuration: BranchConfiguration[]): Promise<void> {
    await this.client.$transaction(
      configuration.map((row) => this.client.branchConfiguration.upsert({
        where: { branch: row.branch },
        create: row,
        update: { minAge: row.minAge, maxAge: row.maxAge, entryAge: row.entryAge },
      })),
    );
  }

  async createCurrentYear(command: CreateAssociativeYearCommand) {
    return this.client.$transaction(async (transaction) => {
      await transaction.associativeYear.updateMany({
        where: { currentKey: 1 },
        data: { currentKey: null, status: "CLOSED" },
      });
      return transaction.associativeYear.create({
        data: {
          id: this.createId(command.createdAt.getTime()),
          label: command.label,
          startYear: command.startYear,
          endYear: command.endYear,
          status: "ACTIVE_CALLS_CLOSED",
          currentKey: 1,
          createdAt: command.createdAt,
        },
        select: { id: true, label: true, startYear: true, status: true },
      });
    });
  }

  async openCalls(command: OpenCallsCommand) {
    return this.client.$transaction(async (transaction) => {
      const yearChanged = await transaction.associativeYear.updateMany({
        where: {
          id: command.associativeYearId,
          currentKey: 1,
          status: "ACTIVE_CALLS_CLOSED",
        },
        data: {
          status: "CALLS_OPEN",
          callsOpenedAt: command.openedAt,
          callsClosedAt: null,
        },
      });
      if (yearChanged.count !== 1) return { changed: false, candidates: 0 };

      const candidates: Array<{
        id: string;
        branch: Branch;
        gender: ApplicantGender;
        birthYear: number;
      }> = [];
      const entries = Object.entries(command.entryBirthYears) as Array<[Branch, number]>;
      for (const [branch, birthYear] of entries) {
        const applicants = await transaction.waitingListEntry.findMany({
          where: { status: "IN_ATTESA", birthYear },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true, gender: true, birthYear: true },
        });
        candidates.push(...applicants.map((applicant) => ({ ...applicant, branch })));
      }

      if (candidates.length > 0) {
        await transaction.waitingListEntry.updateMany({
          where: { id: { in: candidates.map(({ id }) => id) }, status: "IN_ATTESA" },
          data: { status: "DA_CHIAMARE", terminalStatusAt: null },
        });
        await transaction.callParticipation.createMany({
          data: candidates.map((applicant) => ({
            id: this.createId(command.openedAt.getTime()),
            associativeYearId: command.associativeYearId,
            applicantId: applicant.id,
            branch: applicant.branch,
            gender: applicant.gender,
            birthYear: applicant.birthYear,
            outcome: "DA_CHIAMARE" as const,
            createdAt: command.openedAt,
          })),
          skipDuplicates: true,
        });
      }
      return { changed: true, candidates: candidates.length };
    });
  }

  async closeCalls(command: CloseCallsCommand) {
    return this.client.$transaction(async (transaction) => {
      const yearChanged = await transaction.associativeYear.updateMany({
        where: { id: command.associativeYearId, currentKey: 1, status: "CALLS_OPEN" },
        data: { status: "ACTIVE_CALLS_CLOSED", callsClosedAt: command.closedAt },
      });
      if (yearChanged.count !== 1) {
        return { changed: false, resetApplicants: 0, statisticsRows: 0 };
      }

      const grouped = await transaction.callParticipation.groupBy({
        by: ["branch", "gender", "birthYear", "outcome"],
        where: { associativeYearId: command.associativeYearId },
        _count: { _all: true },
      });
      const snapshots = aggregateStatistics(grouped);
      await transaction.annualStatistics.deleteMany({
        where: { associativeYearId: command.associativeYearId },
      });
      if (snapshots.length > 0) {
        await transaction.annualStatistics.createMany({
          data: snapshots.map((snapshot) => ({
            id: this.createId(command.closedAt.getTime()),
            associativeYearId: command.associativeYearId,
            ...snapshot,
            createdAt: command.closedAt,
          })),
        });
      }

      const remaining = await transaction.callParticipation.findMany({
        where: { associativeYearId: command.associativeYearId, outcome: "DA_CHIAMARE" },
        select: { applicantId: true },
      });
      const applicantIds = remaining.flatMap(({ applicantId }) => applicantId ? [applicantId] : []);
      const reset = applicantIds.length > 0
        ? await transaction.waitingListEntry.updateMany({
            where: { id: { in: applicantIds }, status: "DA_CHIAMARE" },
            data: { status: "IN_ATTESA", terminalStatusAt: null },
          })
        : { count: 0 };

      return {
        changed: true,
        resetApplicants: reset.count,
        statisticsRows: snapshots.length,
      };
    });
  }
}

interface GroupedOutcome {
  branch: Branch;
  gender: ApplicantGender;
  birthYear: number;
  outcome: "IN_ATTESA" | "DA_CHIAMARE" | "ACCETTATO" | "RIFIUTATO";
  _count: { _all: number };
}

function aggregateStatistics(groups: GroupedOutcome[]) {
  const rows = new Map<string, {
    branch: Branch;
    gender: ApplicantGender;
    birthYear: number;
    totalCandidates: number;
    accepted: number;
    refused: number;
    remaining: number;
  }>();
  for (const group of groups) {
    const key = `${group.branch}:${group.gender}:${group.birthYear}`;
    const row = rows.get(key) ?? {
      branch: group.branch,
      gender: group.gender,
      birthYear: group.birthYear,
      totalCandidates: 0,
      accepted: 0,
      refused: 0,
      remaining: 0,
    };
    row.totalCandidates += group._count._all;
    if (group.outcome === "ACCETTATO") row.accepted += group._count._all;
    if (group.outcome === "RIFIUTATO") row.refused += group._count._all;
    if (group.outcome === "DA_CHIAMARE") row.remaining += group._count._all;
    rows.set(key, row);
  }
  return [...rows.values()];
}
