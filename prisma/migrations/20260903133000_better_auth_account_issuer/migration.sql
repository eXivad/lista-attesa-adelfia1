-- Better Auth 1.7 scopes account identities by issuer.
ALTER TABLE "Account" ADD COLUMN "issuer" TEXT;

-- V1 enables credential accounts only. The fallback keeps any pre-existing
-- OAuth-shaped rows distinguishable if a local database already contains them.
UPDATE "Account"
SET "issuer" = CASE
  WHEN "providerId" = 'credential' THEN 'local:credential'
  ELSE 'local:oauth:' || "providerId"
END;

ALTER TABLE "Account" ALTER COLUMN "issuer" SET NOT NULL;

DROP INDEX "Account_providerId_accountId_key";
CREATE UNIQUE INDEX "Account_issuer_accountId_key" ON "Account"("issuer", "accountId");
