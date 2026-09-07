import { describe, expect, it, vi } from "vitest";

import { logoutAndRedirect } from "./logout";

describe("logoutAndRedirect", () => {
  it("porta al login soltanto dopo una disconnessione riuscita", async () => {
    const redirectTo = vi.fn();

    await expect(logoutAndRedirect(
      vi.fn(async () => ({ error: null })),
      redirectTo,
    )).resolves.toBe(true);
    expect(redirectTo).toHaveBeenCalledWith("/login");
  });

  it("non cambia pagina se Better Auth restituisce un errore", async () => {
    const redirectTo = vi.fn();

    await expect(logoutAndRedirect(
      vi.fn(async () => ({ error: new Error("sign-out failed") })),
      redirectTo,
    )).resolves.toBe(false);
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
