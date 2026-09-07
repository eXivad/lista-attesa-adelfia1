import { describe, expect, it, vi } from "vitest";

import {
  PrismaPrivacyRepository,
  PrivacyPolicyVersionConflictError,
} from "./privacy.repository";

function setup(existing: {
  version: string;
  fileUrl: string;
  publishedAt: Date;
  isActive: boolean;
} | null = null) {
  const transaction = {
    privacyPolicyVersion: {
      findUnique: vi.fn(async () => existing),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async () => existing ? { ...existing, isActive: true } : null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => data),
    },
  };
  const client = {
    privacyPolicyVersion: {
      findFirst: vi.fn(async () => null),
      findMany: vi.fn(async () => []),
    },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
  return { client, transaction };
}

describe("PrismaPrivacyRepository", () => {
  it("pubblica una nuova versione e disattiva quella precedente nella stessa transazione", async () => {
    const { client, transaction } = setup();
    const publishedAt = new Date("2026-09-06T12:00:00Z");
    const repository = new PrismaPrivacyRepository(client as never, { createId: () => "privacy-new" });

    await repository.publish({
      version: "2026.2",
      fileUrl: "https://documenti.example.org/privacy.pdf",
    }, publishedAt);

    expect(transaction.privacyPolicyVersion.updateMany).toHaveBeenCalledWith({
      where: { isActive: true, version: { not: "2026.2" } },
      data: { isActive: false },
    });
    expect(transaction.privacyPolicyVersion.create).toHaveBeenCalledWith({
      data: {
        id: "privacy-new",
        version: "2026.2",
        fileUrl: "https://documenti.example.org/privacy.pdf",
        publishedAt,
        isActive: true,
      },
      select: expect.any(Object),
    });
  });

  it("riattiva una versione esistente soltanto se il link è invariato", async () => {
    const existing = {
      version: "2026.1",
      fileUrl: "https://documenti.example.org/privacy.pdf",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      isActive: false,
    };
    const { client, transaction } = setup(existing);

    await new PrismaPrivacyRepository(client as never).publish({
      version: "2026.1",
      fileUrl: "https://documenti.example.org/privacy.pdf",
    });

    expect(transaction.privacyPolicyVersion.update).toHaveBeenCalledWith({
      where: { version: "2026.1" },
      data: { isActive: true },
      select: expect.any(Object),
    });
    expect(transaction.privacyPolicyVersion.create).not.toHaveBeenCalled();
  });

  it("protegge lo storico impedendo di sostituire il link di una versione esistente", async () => {
    const { client, transaction } = setup({
      version: "2026.1",
      fileUrl: "https://documenti.example.org/privacy-originale.pdf",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      isActive: true,
    });

    await expect(new PrismaPrivacyRepository(client as never).publish({
      version: "2026.1",
      fileUrl: "https://documenti.example.org/privacy-corretta.pdf",
    })).rejects.toBeInstanceOf(PrivacyPolicyVersionConflictError);

    expect(transaction.privacyPolicyVersion.updateMany).not.toHaveBeenCalled();
    expect(transaction.privacyPolicyVersion.update).not.toHaveBeenCalled();
    expect(transaction.privacyPolicyVersion.create).not.toHaveBeenCalled();
  });
});
