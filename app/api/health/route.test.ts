import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/lib/server/prisma", () => ({
  getPrismaClient: () => ({ $queryRaw: queryRaw }),
}));

import { GET } from "./route";

describe("GET /api/health", () => {
  beforeEach(() => {
    queryRaw.mockReset();
  });

  it("risponde ok quando PostgreSQL è raggiungibile", async () => {
    queryRaw.mockResolvedValue([{ result: 1 }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("non espone dettagli tecnici quando PostgreSQL non è raggiungibile", async () => {
    queryRaw.mockRejectedValue(new Error("postgresql://user:secret@example.test/db"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "unavailable" });
    expect(consoleError).toHaveBeenCalledWith("Health check database non riuscito", {
      errorName: "Error",
    });
    consoleError.mockRestore();
  });
});
