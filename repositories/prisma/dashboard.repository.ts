import { Prisma, type PrismaClient } from "@/generated/prisma/client";

const applicantCardSelection = {
  id: true,
  firstName: true,
  lastName: true,
  registrationNumber: true,
  createdAt: true,
  status: true,
} as const;

export class PrismaDashboardRepository {
  constructor(private readonly client: PrismaClient) {}

  async getOverview(now: Date) {
    const rangeStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
    const [total, statuses, oldest, latest, monthlyRows] = await this.client.$transaction([
      this.client.waitingListEntry.count(),
      this.client.waitingListEntry.groupBy({ by: ["status"], _count: { _all: true } }),
      this.client.waitingListEntry.findMany({
        where: { status: { in: ["IN_ATTESA", "DA_CHIAMARE"] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 5,
        select: applicantCardSelection,
      }),
      this.client.waitingListEntry.findMany({
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 5,
        select: applicantCardSelection,
      }),
      this.client.$queryRaw<Array<{ month: Date | string; total: bigint | number }>>(Prisma.sql`
        SELECT TO_CHAR(DATE_TRUNC('month', "createdAt" AT TIME ZONE 'Europe/Rome'), 'YYYY-MM') AS "month",
               COUNT(*)::bigint AS "total"
        FROM "WaitingListEntry"
        WHERE "createdAt" >= ${rangeStart}
        GROUP BY 1
        ORDER BY 1 ASC
      `),
    ]);

    const statusCount = Object.fromEntries(statuses.map((row) => [row.status, row._count._all]));
    return {
      metrics: {
        total,
        waiting: statusCount.IN_ATTESA ?? 0,
        toCall: statusCount.DA_CHIAMARE ?? 0,
        accepted: statusCount.ACCETTATO ?? 0,
        refused: statusCount.RIFIUTATO ?? 0,
      },
      oldest,
      latest,
      monthly: monthlyRows.map((row) => ({
        month: typeof row.month === "string" ? row.month : row.month.toISOString().slice(0, 7),
        total: Number(row.total),
      })),
    };
  }
}
