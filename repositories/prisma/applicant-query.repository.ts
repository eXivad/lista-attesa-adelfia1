import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import type { ApplicantListQuery } from "@/modules/applicants/schemas/list-query";
import type { BranchConfiguration } from "@/modules/branches/domain/branch";

const listSelection = {
  id: true,
  registrationNumber: true,
  firstName: true,
  lastName: true,
  gender: true,
  birthDate: true,
  birthYear: true,
  createdAt: true,
  status: true,
  guardians: {
    select: { firstName: true, lastName: true, email: true, phone: true },
    orderBy: { type: "asc" as const },
  },
} satisfies Prisma.WaitingListEntrySelect;

const detailSelection = {
  id: true,
  registrationNumber: true,
  firstName: true,
  lastName: true,
  gender: true,
  birthDate: true,
  birthYear: true,
  birthPlace: true,
  birthProvince: true,
  fiscalCode: true,
  residenceAddress: true,
  residenceCity: true,
  residenceProvince: true,
  residencePostalCode: true,
  notes: true,
  status: true,
  privacyAccepted: true,
  privacyPolicyVersion: true,
  privacyAcceptedAt: true,
  terminalStatusAt: true,
  createdAt: true,
  updatedAt: true,
  guardians: { orderBy: { type: "asc" as const } },
} satisfies Prisma.WaitingListEntrySelect;

export class PrismaApplicantQueryRepository {
  constructor(private readonly client: PrismaClient) {}

  async list(filters: ApplicantListQuery) {
    const where = buildWhere(filters);
    const skip = (filters.page - 1) * filters.pageSize;
    const [entries, total, branchRows] = await this.client.$transaction([
      this.client.waitingListEntry.findMany({
        where,
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        skip,
        take: filters.pageSize,
        select: listSelection,
      }),
      this.client.waitingListEntry.count({ where }),
      this.client.branchConfiguration.findMany({ orderBy: { minAge: "asc" } }),
    ]);

    const branchConfiguration: BranchConfiguration[] = branchRows.map(
      ({ branch, minAge, maxAge, entryAge }) => ({
        branch,
        minAge,
        maxAge,
        entryAge,
      }),
    );

    return {
      items: entries.map((entry, index) => ({ ...entry, position: skip + index + 1 })),
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
      branchConfiguration,
    };
  }

  async getById(id: string) {
    const [entry, branchRows] = await this.client.$transaction([
      this.client.waitingListEntry.findUnique({ where: { id }, select: detailSelection }),
      this.client.branchConfiguration.findMany({ orderBy: { minAge: "asc" } }),
    ]);

    return {
      entry,
      branchConfiguration: branchRows.map(
        ({ branch, minAge, maxAge, entryAge }) =>
          ({ branch, minAge, maxAge, entryAge }) satisfies BranchConfiguration,
      ),
    };
  }
}

function buildWhere(filters: ApplicantListQuery): Prisma.WaitingListEntryWhereInput {
  const query = filters.query;
  return {
    ...(filters.gender ? { gender: filters.gender } : {}),
    ...(filters.birthYear ? { birthYear: filters.birthYear } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(query
      ? {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { fiscalCode: { contains: query.replace(/\s+/g, "").toUpperCase(), mode: "insensitive" } },
            { registrationNumber: { contains: query.toUpperCase(), mode: "insensitive" } },
            {
              guardians: {
                some: {
                  OR: [
                    { firstName: { contains: query, mode: "insensitive" } },
                    { lastName: { contains: query, mode: "insensitive" } },
                    { email: { contains: query, mode: "insensitive" } },
                    { phone: { contains: query, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}
