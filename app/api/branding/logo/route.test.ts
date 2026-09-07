import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentLogo } = vi.hoisted(() => ({
  getCurrentLogo: vi.fn(),
}));

vi.mock("@/lib/server/group-branding", () => ({
  getGroupBrandingRepository: () => ({ getCurrentLogo }),
}));

import { GET } from "./route";

describe("GET /api/branding/logo", () => {
  beforeEach(() => {
    getCurrentLogo.mockReset();
  });

  it("rende immutabile il logo quando la versione dell'URL è corrente", async () => {
    getCurrentLogo.mockResolvedValue({
      content: new Uint8Array([1, 2, 3]),
      mimeType: "image/png",
      byteSize: 3,
      version: "logo-v1",
    });

    const response = await GET(new Request("https://example.test/api/branding/logo?v=logo-v1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=31536000, s-maxage=31536000, immutable");
    expect(response.headers.get("ETag")).toBe('"logo-v1"');
    await expect(response.arrayBuffer()).resolves.toEqual(Uint8Array.from([1, 2, 3]).buffer);
  });

  it("non rende immutabile un URL senza la versione corrente", async () => {
    getCurrentLogo.mockResolvedValue({
      content: new Uint8Array([1]),
      mimeType: "image/png",
      byteSize: 1,
      version: "logo-v1",
    });

    const response = await GET(new Request("https://example.test/api/branding/logo"));

    expect(response.headers.get("Cache-Control")).toBe("public, max-age=0, must-revalidate");
  });

  it("risponde 304 quando l'ETag coincide", async () => {
    getCurrentLogo.mockResolvedValue({
      content: new Uint8Array([1]),
      mimeType: "image/png",
      byteSize: 1,
      version: "logo-v1",
    });

    const response = await GET(new Request("https://example.test/api/branding/logo?v=logo-v1", {
      headers: { "If-None-Match": '"logo-v1"' },
    }));

    expect(response.status).toBe(304);
    expect(response.body).toBeNull();
  });

  it("non memorizza una risposta senza logo", async () => {
    getCurrentLogo.mockResolvedValue(null);

    const response = await GET(new Request("https://example.test/api/branding/logo?v=missing"));

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
