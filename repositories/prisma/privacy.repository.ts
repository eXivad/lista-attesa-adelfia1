import type { PrismaClient } from "@/generated/prisma/client";
import type { PrivacyPolicyInput } from "@/modules/privacy/privacy-policy";
import { monotonicFactory } from "ulid";

export interface PublicPrivacyPolicy {
  version: string;
  fileUrl: string;
  publishedAt: Date;
}

export interface PrivacyPolicyVersionSummary extends PublicPrivacyPolicy {
  isActive: boolean;
}

interface RepositoryOptions {
  createId?: (timestamp?: number) => string;
}

export class PrivacyPolicyVersionConflictError extends Error {
  constructor() {
    super("La versione indicata esiste già con un link differente.");
    this.name = "PrivacyPolicyVersionConflictError";
  }
}

export class PrismaPrivacyRepository {
  private readonly createId: (timestamp?: number) => string;

  constructor(
    private readonly client: PrismaClient,
    options: RepositoryOptions = {},
  ) {
    this.createId = options.createId ?? monotonicFactory();
  }

  async getActive(): Promise<PublicPrivacyPolicy | null> {
    return this.client.privacyPolicyVersion.findFirst({
      where: { isActive: true },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: { version: true, fileUrl: true, publishedAt: true },
    });
  }

  async listVersions(): Promise<PrivacyPolicyVersionSummary[]> {
    return this.client.privacyPolicyVersion.findMany({
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: { version: true, fileUrl: true, publishedAt: true, isActive: true },
    });
  }

  async publish(input: PrivacyPolicyInput, publishedAt = new Date()): Promise<PrivacyPolicyVersionSummary> {
    return this.client.$transaction(async (transaction) => {
      const existing = await transaction.privacyPolicyVersion.findUnique({
        where: { version: input.version },
        select: { version: true, fileUrl: true, publishedAt: true, isActive: true },
      });

      if (existing && normalizeUrl(existing.fileUrl) !== normalizeUrl(input.fileUrl)) {
        throw new PrivacyPolicyVersionConflictError();
      }

      await transaction.privacyPolicyVersion.updateMany({
        where: { isActive: true, version: { not: input.version } },
        data: { isActive: false },
      });

      if (existing) {
        return transaction.privacyPolicyVersion.update({
          where: { version: input.version },
          data: { isActive: true },
          select: { version: true, fileUrl: true, publishedAt: true, isActive: true },
        });
      }

      return transaction.privacyPolicyVersion.create({
        data: {
          id: this.createId(publishedAt.getTime()),
          version: input.version,
          fileUrl: input.fileUrl,
          publishedAt,
          isActive: true,
        },
        select: { version: true, fileUrl: true, publishedAt: true, isActive: true },
      });
    });
  }
}

function normalizeUrl(value: string): string {
  try {
    return new URL(value).toString();
  } catch {
    return value;
  }
}
