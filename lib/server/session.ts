import "server-only";

import { headers } from "next/headers";

import type { Capability, UserRole } from "@/modules/auth/authorization";
import { assertAuthorized } from "@/modules/auth/authorization";
import { getAuth } from "./auth";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await getCurrentUser();
  assertAuthorized(user, capability);
  return user;
}
