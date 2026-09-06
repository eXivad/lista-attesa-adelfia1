import { describe, expect, it, vi } from "vitest";

import { DEFAULT_GROUP_NAME } from "@/modules/branding/group-branding";
import { PrismaGroupBrandingRepository } from "./group-branding.repository";

describe("PrismaGroupBrandingRepository", () => {
  it("restituisce un branding neutro se il singleton non è ancora presente", async () => {
    const client = { groupSettings: { findUnique: vi.fn(async () => null) } };
    await expect(new PrismaGroupBrandingRepository(client as never).getSettings()).resolves.toEqual({
      groupName: DEFAULT_GROUP_NAME,
      logoVersion: null,
    });
  });

  it("sostituisce l'asset in transazione e rimuove quello precedente", async () => {
    const transaction = {
      groupSettings: {
        findUnique: vi.fn(async () => ({ logoAssetId: "old-logo" })),
        upsert: vi.fn(async () => undefined),
      },
      groupLogoAsset: {
        create: vi.fn(async () => undefined),
        deleteMany: vi.fn(async () => ({ count: 1 })),
      },
    };
    const client = { $transaction: vi.fn(async (callback: (tx: typeof transaction) => unknown) => callback(transaction)) };
    const repository = new PrismaGroupBrandingRepository(client as never, { createId: () => "new-logo" });

    await repository.replaceLogo({ mimeType: "image/png", bytes: new Uint8Array([1, 2, 3]) });

    expect(transaction.groupLogoAsset.create).toHaveBeenCalledWith({ data: expect.objectContaining({ id: "new-logo", mimeType: "image/png", byteSize: 3 }) });
    expect(transaction.groupSettings.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { logoAssetId: "new-logo" } }));
    expect(transaction.groupLogoAsset.deleteMany).toHaveBeenCalledWith({ where: { id: "old-logo" } });
  });

  it("fornisce nome e logo binario per le email", async () => {
    const content = new Uint8Array([1, 2, 3]);
    const client = {
      groupSettings: {
        findUnique: vi.fn(async () => ({
          groupName: "AGESCI Adelfia 1",
          logoAsset: { content, mimeType: "image/png" },
        })),
      },
    };

    await expect(new PrismaGroupBrandingRepository(client as never).getMailBranding())
      .resolves.toEqual({
        organizationName: "AGESCI Adelfia 1",
        logo: { content, mimeType: "image/png" },
      });
  });

  it("restituisce il logo con una versione stabile per la cache HTTP", async () => {
    const createdAt = new Date("2026-09-05T10:00:00.000Z");
    const content = new Uint8Array([1, 2, 3]);
    const client = {
      groupSettings: {
        findUnique: vi.fn(async () => ({
          logoAsset: { id: "logo-id", createdAt, content, mimeType: "image/png", byteSize: 3 },
        })),
      },
    };

    await expect(new PrismaGroupBrandingRepository(client as never).getCurrentLogo()).resolves.toEqual({
      content,
      mimeType: "image/png",
      byteSize: 3,
      version: `logo-id-${createdAt.getTime()}`,
    });
  });
});
