-- Historical waiting-list records can predate collection of the complete
-- applicant, guardian, and privacy-consent data required by the public form.
ALTER TABLE "WaitingListEntry"
  ALTER COLUMN "birthPlace" DROP NOT NULL,
  ALTER COLUMN "birthProvince" DROP NOT NULL,
  ALTER COLUMN "fiscalCode" DROP NOT NULL,
  ALTER COLUMN "residenceAddress" DROP NOT NULL,
  ALTER COLUMN "residenceCity" DROP NOT NULL,
  ALTER COLUMN "residenceProvince" DROP NOT NULL,
  ALTER COLUMN "residencePostalCode" DROP NOT NULL,
  ALTER COLUMN "privacyAcceptedAt" DROP NOT NULL,
  ALTER COLUMN "privacyPolicyVersion" DROP NOT NULL;

ALTER TABLE "Guardian"
  ALTER COLUMN "firstName" DROP NOT NULL,
  ALTER COLUMN "lastName" DROP NOT NULL,
  ALTER COLUMN "birthDate" DROP NOT NULL,
  ALTER COLUMN "birthPlace" DROP NOT NULL,
  ALTER COLUMN "birthProvince" DROP NOT NULL,
  ALTER COLUMN "fiscalCode" DROP NOT NULL,
  ALTER COLUMN "address" DROP NOT NULL,
  ALTER COLUMN "city" DROP NOT NULL,
  ALTER COLUMN "province" DROP NOT NULL,
  ALTER COLUMN "postalCode" DROP NOT NULL,
  ALTER COLUMN "email" DROP NOT NULL,
  ALTER COLUMN "phone" DROP NOT NULL;
