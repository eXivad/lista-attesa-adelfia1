import "server-only";

import { getRegistrationEnvironment } from "@/lib/server/environment";
import { getPrismaClient } from "@/lib/server/prisma";
import { HmacRateLimiter } from "@/lib/security/rate-limiter";
import { PrismaRateLimitRepository } from "@/repositories/prisma/rate-limit.repository";

export function getPublicRegistrationRateLimiter(): HmacRateLimiter {
  const environment = getRegistrationEnvironment();
  return new HmacRateLimiter({
    repository: new PrismaRateLimitRepository(getPrismaClient()),
    secret: environment.RATE_LIMIT_HMAC_KEY,
    limit: 5,
    windowMs: 15 * 60_000,
  });
}
