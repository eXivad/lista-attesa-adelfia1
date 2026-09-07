import { describe, expect, it } from "vitest";

import { buildPrismaPgPoolConfig } from "./prisma-pg-adapter";

describe("buildPrismaPgPoolConfig", () => {
  it("preserva la URL quando non è configurata una CA esplicita", () => {
    const connectionString = "postgresql://user:password@localhost:5432/database?schema=public";

    expect(buildPrismaPgPoolConfig({ connectionString, max: 3 })).toEqual({
      connectionString,
      max: 3,
    });
  });

  it("usa la CA esplicita e rimuove i parametri SSL che la sovrascriverebbero", () => {
    const config = buildPrismaPgPoolConfig({
      connectionString:
        "postgresql://user:password@example.com:6543/database?schema=public&sslmode=require&uselibpqcompat=true",
      max: 1,
      caCertificate: "  -----BEGIN CERTIFICATE-----\\ncertificate\\n-----END CERTIFICATE-----  ",
    });

    const applicationUrl = new URL(config.connectionString ?? "");
    expect(applicationUrl.searchParams.get("schema")).toBe("public");
    expect(applicationUrl.searchParams.has("sslmode")).toBe(false);
    expect(applicationUrl.searchParams.has("uselibpqcompat")).toBe(false);
    expect(config.max).toBe(1);
    expect(config.ssl).toEqual({
      ca: "-----BEGIN CERTIFICATE-----\ncertificate\n-----END CERTIFICATE-----",
      rejectUnauthorized: true,
    });
  });
});
