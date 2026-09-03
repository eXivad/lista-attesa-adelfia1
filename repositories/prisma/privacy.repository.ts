import type { PrismaClient } from "@/generated/prisma/client";

export interface PublicPrivacyPolicy {
  version: string;
  fileUrl: string;
  publishedAt: Date;
}

export class PrismaPrivacyRepository {
  constructor(private readonly client: PrismaClient) {}

  async getActive(): Promise<PublicPrivacyPolicy | null> {
    return this.client.privacyPolicyVersion.findFirst({
      where: { isActive: true },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: { version: true, fileUrl: true, publishedAt: true },
    });
  }
}
