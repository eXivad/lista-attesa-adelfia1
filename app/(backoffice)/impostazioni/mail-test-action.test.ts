import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  sendAdminDiagnosticMail: vi.fn(),
  getRegistrationEnvironment: vi.fn(),
  getPrismaClient: vi.fn(),
  getMailProvider: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({ requireCapability: mocks.requireCapability }));
vi.mock("@/modules/mail/admin-mail-test", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/mail/admin-mail-test")>();
  return { ...actual, sendAdminDiagnosticMail: mocks.sendAdminDiagnosticMail };
});
vi.mock("@/lib/server/environment", () => ({
  getRegistrationEnvironment: mocks.getRegistrationEnvironment,
}));
vi.mock("@/lib/server/prisma", () => ({ getPrismaClient: mocks.getPrismaClient }));
vi.mock("@/lib/server/mail", () => ({ getMailProvider: mocks.getMailProvider }));
vi.mock("@/repositories/prisma/rate-limit.repository", () => ({
  PrismaRateLimitRepository: class {
    constructor() { /* repository mocked at the action boundary */ }
  },
}));

import { MailDailyQuotaExceededError } from "@/modules/mail/mail-quota";
import { AdminMailTestError } from "@/modules/mail/admin-mail-test";
import { sendMailTestAction } from "./mail-test-action";

function form(recipient: string): FormData {
  const data = new FormData();
  data.set("recipient", recipient);
  return data;
}

describe("sendMailTestAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ id: "admin-123", role: "ADMIN" });
    mocks.getRegistrationEnvironment.mockReturnValue({ RATE_LIMIT_HMAC_KEY: "test-secret" });
    mocks.getPrismaClient.mockReturnValue({});
    mocks.getMailProvider.mockReturnValue({ sendDiagnosticMessage: vi.fn() });
    mocks.sendAdminDiagnosticMail.mockResolvedValue(undefined);
  });

  it("verifica i permessi nell'action prima di inviare", async () => {
    mocks.requireCapability.mockRejectedValue(new Error("FORBIDDEN"));

    await expect(sendMailTestAction({ status: "idle" }, form("test@outlook.it")))
      .rejects.toThrow("FORBIDDEN");
    expect(mocks.sendAdminDiagnosticMail).not.toHaveBeenCalled();
  });

  it("mostra l'accettazione SMTP senza promettere il recapito nella posta in arrivo", async () => {
    const result = await sendMailTestAction({ status: "idle" }, form("test@outlook.it"));

    expect(mocks.requireCapability).toHaveBeenCalledWith("users:manage");
    expect(mocks.sendAdminDiagnosticMail).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "admin-123",
      recipientInput: "test@outlook.it",
    }));
    expect(result).toEqual({
      status: "success",
      message: expect.stringContaining("accettato"),
    });
    expect(result.message).not.toContain("consegnato");
  });

  it("restituisce errori comprensibili per email invalida, limite e quota Gmail", async () => {
    mocks.sendAdminDiagnosticMail.mockRejectedValueOnce(new AdminMailTestError("INVALID_RECIPIENT"));
    expect(await sendMailTestAction({ status: "idle" }, form("non-valida")))
      .toMatchObject({ status: "error", message: expect.stringContaining("indirizzo") });

    mocks.sendAdminDiagnosticMail.mockRejectedValueOnce(new AdminMailTestError("RATE_LIMITED"));
    expect(await sendMailTestAction({ status: "idle" }, form("test@outlook.it")))
      .toMatchObject({ status: "error", message: expect.stringContaining("tentativi") });

    mocks.sendAdminDiagnosticMail.mockRejectedValueOnce(
      new MailDailyQuotaExceededError(new Date("2026-09-21T12:00:00.000Z")),
    );
    expect(await sendMailTestAction({ status: "idle" }, form("test@outlook.it")))
      .toMatchObject({ status: "error", message: expect.stringContaining("quota") });
  });

  it("non rivela errori SMTP o segreti grezzi al browser", async () => {
    mocks.sendAdminDiagnosticMail.mockRejectedValue(new Error("invalid_grant token-segreto"));

    const result = await sendMailTestAction({ status: "idle" }, form("test@outlook.it"));

    expect(result.status).toBe("error");
    expect(result.message).not.toContain("token-segreto");
    expect(result.message).toContain("log");
  });
});
