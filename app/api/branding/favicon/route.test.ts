import { beforeEach, describe, expect, it, vi } from "vitest";

const { getGroupBrandingSettings } = vi.hoisted(() => ({
  getGroupBrandingSettings: vi.fn(),
}));

vi.mock("@/lib/server/group-branding", () => ({ getGroupBrandingSettings }));

import { GET } from "./route";

describe("GET /api/branding/favicon", () => {
  beforeEach(() => {
    getGroupBrandingSettings.mockReset();
  });

  it("reindirizza al logo versionato del gruppo", async () => {
    getGroupBrandingSettings.mockResolvedValue({
      groupName: "AGESCI Adelfia 1",
      logoVersion: "logo/id 1",
    });

    const response = await GET(new Request("https://example.test/api/branding/favicon"));

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "https://example.test/api/branding/logo?v=logo%2Fid%201",
    );
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300, s-maxage=300");
  });

  it("reindirizza alla favicon predefinita in assenza del logo", async () => {
    getGroupBrandingSettings.mockResolvedValue({
      groupName: "AGESCI Adelfia 1",
      logoVersion: null,
    });

    const response = await GET(new Request("https://example.test/api/branding/favicon"));

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://example.test/favicon.ico");
  });

  it("mantiene il fallback se il branding non è disponibile", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getGroupBrandingSettings.mockRejectedValue(new Error("database unavailable"));

    const response = await GET(new Request("https://example.test/api/branding/favicon"));

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://example.test/favicon.ico");
    expect(consoleError).toHaveBeenCalledWith("Impossibile caricare il logo dinamico per la favicon.");
    consoleError.mockRestore();
  });
});
