import { monotonicFactory } from "ulid";

import type { PrismaClient } from "@/generated/prisma/client";
import { DEFAULT_GROUP_NAME, type GroupLogoMimeType } from "@/modules/branding/group-branding";

export const GROUP_SETTINGS_ID = "GROUP_SETTINGS";

interface RepositoryOptions {
  createId?: (timestamp?: number) => string;
}

export class PrismaGroupBrandingRepository {
  private readonly createId: (timestamp?: number) => string;

  constructor(private readonly client: PrismaClient, options: RepositoryOptions = {}) {
    this.createId = options.createId ?? monotonicFactory();
  }

  async getSettings() {
    const settings = await this.client.groupSettings.findUnique({
      where: { id: GROUP_SETTINGS_ID },
      select: {
        groupName: true,
        logoAsset: { select: { id: true, createdAt: true } },
      },
    });
    return {
      groupName: settings?.groupName ?? DEFAULT_GROUP_NAME,
      logoVersion: settings?.logoAsset
        ? `${settings.logoAsset.id}-${settings.logoAsset.createdAt.getTime()}`
        : null,
    };
  }

  async updateGroupName(groupName: string) {
    await this.client.groupSettings.upsert({
      where: { id: GROUP_SETTINGS_ID },
      create: { id: GROUP_SETTINGS_ID, groupName },
      update: { groupName },
    });
  }

  async replaceLogo(input: { mimeType: GroupLogoMimeType; bytes: Uint8Array }) {
    const assetId = this.createId();
    const content = new Uint8Array(input.bytes.byteLength);
    content.set(input.bytes);
    await this.client.$transaction(async (transaction) => {
      const current = await transaction.groupSettings.findUnique({
        where: { id: GROUP_SETTINGS_ID },
        select: { logoAssetId: true },
      });
      await transaction.groupLogoAsset.create({
        data: { id: assetId, mimeType: input.mimeType, byteSize: content.byteLength, content },
      });
      await transaction.groupSettings.upsert({
        where: { id: GROUP_SETTINGS_ID },
        create: { id: GROUP_SETTINGS_ID, groupName: DEFAULT_GROUP_NAME, logoAssetId: assetId },
        update: { logoAssetId: assetId },
      });
      if (current?.logoAssetId && current.logoAssetId !== assetId) {
        await transaction.groupLogoAsset.deleteMany({ where: { id: current.logoAssetId } });
      }
    });
  }

  async removeLogo() {
    await this.client.$transaction(async (transaction) => {
      const current = await transaction.groupSettings.findUnique({
        where: { id: GROUP_SETTINGS_ID },
        select: { logoAssetId: true },
      });
      if (!current?.logoAssetId) return;
      await transaction.groupSettings.update({
        where: { id: GROUP_SETTINGS_ID },
        data: { logoAssetId: null },
      });
      await transaction.groupLogoAsset.deleteMany({ where: { id: current.logoAssetId } });
    });
  }

  async getCurrentLogo() {
    const settings = await this.client.groupSettings.findUnique({
      where: { id: GROUP_SETTINGS_ID },
      select: { logoAsset: { select: { content: true, mimeType: true, byteSize: true } } },
    });
    return settings?.logoAsset ?? null;
  }
}
