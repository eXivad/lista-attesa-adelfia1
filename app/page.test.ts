import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ getCurrentUser: vi.fn() }));

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/session";
import RootPage from "./page";

describe("route radice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("porta un visitatore anonimo al modulo di iscrizione", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);

    await RootPage();

    expect(redirect).toHaveBeenCalledWith("/iscrizione");
  });

  it("porta un utente autenticato alla dashboard", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user-1",
      name: "Mario Rossi",
      email: "mario@example.it",
      role: "ADMIN",
    });

    await RootPage();

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
