import { describe, expect, it } from "vitest";

import { canResetE2EData } from "@/modules/e2e/reset-guard";

describe("canResetE2EData", () => {
  it("richiede l'abilitazione esplicita", () => {
    expect(canResetE2EData({
      E2E_ALLOW_RESET: "false",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/app_test?schema=public",
    })).toBe(false);
  });

  it.each(["app_test", "app_ci"])("accetta esclusivamente un database PostgreSQL isolato: %s", (database) => {
    expect(canResetE2EData({
      E2E_ALLOW_RESET: "true",
      DATABASE_URL: `postgresql://postgres:postgres@localhost:5432/${database}?schema=public`,
    })).toBe(true);
  });

  it.each([
    "postgresql://postgres:postgres@localhost:5432/app",
    "postgresql://postgres:postgres@localhost:5432/app_test_backup",
    "mysql://root:root@localhost:3306/app_test",
    "not-a-url",
  ])("rifiuta destinazioni non isolate o non PostgreSQL: %s", (databaseUrl) => {
    expect(canResetE2EData({ E2E_ALLOW_RESET: "true", DATABASE_URL: databaseUrl })).toBe(false);
  });
});
