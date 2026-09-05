import "server-only";

import { getPrismaClient } from "@/lib/server/prisma";
import { PrismaGroupBrandingRepository } from "@/repositories/prisma/group-branding.repository";

export function getGroupBrandingRepository() {
  return new PrismaGroupBrandingRepository(getPrismaClient());
}
