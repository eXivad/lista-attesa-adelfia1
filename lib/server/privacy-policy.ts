import "server-only";

import { unstable_cache } from "next/cache";

import { getPrismaClient } from "@/lib/server/prisma";
import { PrismaPrivacyRepository } from "@/repositories/prisma/privacy.repository";

export const PRIVACY_POLICY_CACHE_TAG = "privacy-policy";

const getCachedActivePrivacyPolicy = unstable_cache(
  async () => new PrismaPrivacyRepository(getPrismaClient()).getActive(),
  ["active-privacy-policy-v1"],
  {
    revalidate: 300,
    tags: [PRIVACY_POLICY_CACHE_TAG],
  },
);

export async function getActivePrivacyPolicySafely() {
  try {
    return await getCachedActivePrivacyPolicy();
  } catch (error) {
    console.error("Privacy policy non disponibile", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}
