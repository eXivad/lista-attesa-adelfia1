import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { RateLimitConsumeCommand, RateLimitRepository } from "@/lib/security/rate-limiter";

export class PrismaRateLimitRepository implements RateLimitRepository {
  constructor(private readonly client: PrismaClient) {}

  async consume(command: RateLimitConsumeCommand): Promise<boolean> {
    const expiresAt = new Date(command.now.getTime() + command.windowMs);
    const rows = await this.client.$queryRaw<Array<{ attempts: number }>>(Prisma.sql`
      INSERT INTO "RateLimitBucket" ("keyHash", "windowStart", "attempts", "expiresAt")
      VALUES (${command.keyHash}, ${command.now}, 1, ${expiresAt})
      ON CONFLICT ("keyHash") DO UPDATE SET
        "windowStart" = CASE
          WHEN "RateLimitBucket"."expiresAt" <= ${command.now} THEN ${command.now}
          ELSE "RateLimitBucket"."windowStart"
        END,
        "attempts" = CASE
          WHEN "RateLimitBucket"."expiresAt" <= ${command.now} THEN 1
          ELSE "RateLimitBucket"."attempts" + 1
        END,
        "expiresAt" = CASE
          WHEN "RateLimitBucket"."expiresAt" <= ${command.now} THEN ${expiresAt}
          ELSE "RateLimitBucket"."expiresAt"
        END
      RETURNING "attempts"
    `);
    return (rows[0]?.attempts ?? command.limit + 1) <= command.limit;
  }
}
