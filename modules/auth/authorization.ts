export type UserRole = "ADMIN" | "STAFF";

export type Capability =
  | "dashboard:read"
  | "applicants:read"
  | "applicants:update"
  | "applicants:delete"
  | "applicants:change-status"
  | "years:manage"
  | "users:manage"
  | "mailing:manage"
  | "branches:manage"
  | "branding:manage"
  | "privacy:manage"
  | "statistics:read";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

const STAFF_CAPABILITIES = new Set<Capability>([
  "dashboard:read",
  "applicants:read",
  "applicants:update",
  "applicants:delete",
  "applicants:change-status",
]);

export class AuthorizationError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code === "UNAUTHENTICATED" ? "Autenticazione richiesta." : "Permessi insufficienti.");
    this.name = "AuthorizationError";
  }
}

export function hasPermission(role: UserRole, capability: Capability): boolean {
  return role === "ADMIN" || STAFF_CAPABILITIES.has(capability);
}

export function assertAuthorized(
  user: AuthenticatedUser | null,
  capability: Capability,
): asserts user is AuthenticatedUser {
  if (!user) {
    throw new AuthorizationError("UNAUTHENTICATED");
  }

  if (!hasPermission(user.role, capability)) {
    throw new AuthorizationError("FORBIDDEN");
  }
}
