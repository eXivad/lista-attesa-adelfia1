import { describe, expect, it, vi } from "vitest";

import {
  StaffInvitationService,
  type StaffInvitationRepository,
} from "./staff-invitation.service";

const NOW = new Date("2026-09-03T12:00:00Z");

function setup() {
  const repository: StaffInvitationRepository = {
    create: vi.fn(async () => ({ invitationId: "invite-1", outboxId: "mail-1" })),
    findValidByTokenHash: vi.fn(async () => ({
      id: "invite-1", firstName: "Anna", lastName: "Verdi", email: "anna@example.it", memberCode: "123456", role: "STAFF" as const,
    })),
    markAccepted: vi.fn(async () => true),
    markMailDelivered: vi.fn(async () => undefined),
    markMailFailed: vi.fn(async () => undefined),
  };
  const mailProvider = { sendStaffInvitation: vi.fn(async () => undefined) };
  const accountProvisioner = { create: vi.fn(async () => ({ id: "user-1" })) };
  const service = new StaffInvitationService({
    repository, mailProvider, accountProvisioner,
    baseUrl: "https://lista.example.it",
    tokenFactory: () => "raw-secret-token",
    clock: () => NOW,
  });
  return { repository, mailProvider, accountProvisioner, service };
}

describe("StaffInvitationService", () => {
  it("salva solo l'hash, produce link da 24 ore e invia dopo la persistenza", async () => {
    const { repository, mailProvider, service } = setup();

    await service.invite({ firstName: "Anna", lastName: "Verdi", email: "ANNA@example.it", memberCode: "123456", role: "STAFF", createdById: "admin-1" });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      email: "anna@example.it",
      tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      expiresAt: new Date("2026-09-04T12:00:00Z"),
    }));
    expect(JSON.stringify(vi.mocked(repository.create).mock.calls)).not.toContain("raw-secret-token");
    expect(mailProvider.sendStaffInvitation).toHaveBeenCalledWith(expect.objectContaining({
      invitationUrl: "https://lista.example.it/invito/raw-secret-token",
    }));
  });

  it("crea l'account con password e consuma un invito valido", async () => {
    const { repository, accountProvisioner, service } = setup();

    await service.accept("raw-secret-token", "UnaPassword!2026");

    expect(accountProvisioner.create).toHaveBeenCalledWith(expect.objectContaining({ email: "anna@example.it", password: "UnaPassword!2026" }));
    expect(repository.markAccepted).toHaveBeenCalledWith("invite-1", NOW);
  });

  it("nega password deboli e token scaduti senza creare account", async () => {
    const weak = setup();
    await expect(weak.service.accept("raw-secret-token", "debole")).rejects.toMatchObject({ code: "INVALID_PASSWORD" });
    expect(weak.accountProvisioner.create).not.toHaveBeenCalled();

    const expired = setup();
    vi.mocked(expired.repository.findValidByTokenHash).mockResolvedValueOnce(null);
    await expect(expired.service.accept("expired", "UnaPassword!2026")).rejects.toMatchObject({ code: "INVITATION_EXPIRED" });
  });

  it("registra il fallimento email e rileva invito consumato in concorrenza", async () => {
    const failedMail = setup();
    failedMail.mailProvider.sendStaffInvitation.mockRejectedValueOnce(new Error("offline"));
    await failedMail.service.invite({ firstName: "Anna", lastName: "Verdi", email: "anna@example.it", memberCode: "123", role: "STAFF", createdById: "admin" });
    expect(failedMail.repository.markMailFailed).toHaveBeenCalledWith("mail-1", NOW, "offline");

    const stale = setup();
    vi.mocked(stale.repository.markAccepted).mockResolvedValueOnce(false);
    await expect(stale.service.accept("token", "UnaPassword!2026")).rejects.toMatchObject({ code: "CONCURRENT_CHANGE" });
  });

  it("nega dati invito invalidi prima del repository", async () => {
    const { repository, service } = setup();
    await expect(service.invite({ firstName: "", lastName: "Verdi", email: "errata", memberCode: "", role: "STAFF", createdById: "admin" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(repository.create).not.toHaveBeenCalled();
  });
});
