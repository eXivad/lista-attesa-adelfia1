import { describe, expect, it } from "vitest";

import {
  AuthorizationError,
  assertAuthorized,
  hasPermission,
  type Capability,
} from "./authorization";

describe("RBAC", () => {
  const staffCapabilities: Capability[] = [
    "dashboard:read",
    "applicants:read",
    "applicants:update",
    "applicants:delete",
    "applicants:change-status",
  ];

  it.each(staffCapabilities)("consente a STAFF %s", (capability) => {
    expect(hasPermission("STAFF", capability)).toBe(true);
  });

  it.each([
    "years:manage",
    "users:manage",
    "mailing:manage",
    "branches:manage",
    "statistics:read",
  ] satisfies Capability[])("nega a STAFF %s", (capability) => {
    expect(hasPermission("STAFF", capability)).toBe(false);
  });

  it("consente ad ADMIN tutte le capacità", () => {
    const capabilities: Capability[] = [
      ...staffCapabilities,
      "years:manage",
      "users:manage",
      "mailing:manage",
      "branches:manage",
      "statistics:read",
    ];

    expect(capabilities.every((capability) => hasPermission("ADMIN", capability))).toBe(true);
  });

  it("distingue sessione assente da permesso insufficiente", () => {
    expect(() => assertAuthorized(null, "applicants:read")).toThrowError(
      expect.objectContaining<Partial<AuthorizationError>>({ code: "UNAUTHENTICATED" }),
    );
    expect(() => assertAuthorized({ id: "staff-1", role: "STAFF" }, "users:manage")).toThrowError(
      expect.objectContaining<Partial<AuthorizationError>>({ code: "FORBIDDEN" }),
    );
  });
});
