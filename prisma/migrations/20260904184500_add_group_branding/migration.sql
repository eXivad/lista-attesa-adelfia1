CREATE TABLE "GroupLogoAsset" (
    "id" VARCHAR(26) NOT NULL,
    "mimeType" VARCHAR(32) NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupLogoAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroupSettings" (
    "id" VARCHAR(26) NOT NULL,
    "groupName" VARCHAR(120) NOT NULL,
    "logoAssetId" VARCHAR(26),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "GroupSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupSettings_logoAssetId_key" ON "GroupSettings"("logoAssetId");

ALTER TABLE "GroupSettings" ADD CONSTRAINT "GroupSettings_logoAssetId_fkey"
FOREIGN KEY ("logoAssetId") REFERENCES "GroupLogoAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "GroupSettings" ("id", "groupName", "updatedAt")
VALUES ('GROUP_SETTINGS', 'Gruppo Scout', CURRENT_TIMESTAMP);
