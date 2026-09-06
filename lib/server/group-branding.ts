import "server-only";

import { unstable_cache } from "next/cache";

import { getPrismaClient } from "@/lib/server/prisma";
import { PrismaGroupBrandingRepository } from "@/repositories/prisma/group-branding.repository";

export const GROUP_BRANDING_CACHE_TAG = "group-branding";

export function getGroupBrandingRepository() {
  return new PrismaGroupBrandingRepository(getPrismaClient());
}

const getCachedGroupBrandingSettings = unstable_cache(
  async () => getGroupBrandingRepository().getSettings(),
  ["group-branding-settings-v1"],
  {
    revalidate: 300,
    tags: [GROUP_BRANDING_CACHE_TAG],
  },
);

export function getGroupBrandingSettings() {
  return getCachedGroupBrandingSettings();
}
