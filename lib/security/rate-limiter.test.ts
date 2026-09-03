import { describe, expect, it, vi } from "vitest";

import { getClientSource, HmacRateLimiter, RateLimitExceededError, type RateLimitRepository } from "./rate-limiter";

describe("HmacRateLimiter", () => {
  it("non persiste l'indirizzo sorgente in chiaro", async () => {
    const repository: RateLimitRepository = { consume: vi.fn(async () => true) };
    const limiter = new HmacRateLimiter({
      repository,
      secret: "test-secret-with-at-least-32-characters",
      limit: 5,
      windowMs: 15 * 60_000,
      clock: () => new Date("2026-09-03T12:00:00Z"),
    });

    await limiter.assertAllowed("203.0.113.42");

    expect(repository.consume).toHaveBeenCalledWith(expect.objectContaining({
      keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      limit: 5,
    }));
    expect(JSON.stringify(vi.mocked(repository.consume).mock.calls)).not.toContain("203.0.113.42");
  });

  it("estrae in ordine gli header proxy e aggiunge un user-agent limitato", () => {
    expect(getClientSource(new Headers({ "cf-connecting-ip": "203.0.113.1", "x-forwarded-for": "198.51.100.2", "user-agent": "browser" }))).toBe("203.0.113.1|browser");
    expect(getClientSource(new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2|unknown-agent");
    expect(getClientSource(new Headers())).toBe("unavailable|unknown-agent");
  });

  it("espone un errore utente quando il limite è superato", async () => {
    const repository: RateLimitRepository = { consume: vi.fn(async () => false) };
    const limiter = new HmacRateLimiter({
      repository,
      secret: "test-secret-with-at-least-32-characters",
      limit: 5,
      windowMs: 60_000,
    });

    await expect(limiter.assertAllowed("source")).rejects.toBeInstanceOf(RateLimitExceededError);
  });
});
