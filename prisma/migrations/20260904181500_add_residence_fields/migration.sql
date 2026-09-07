-- Campi obbligatori per le nuove registrazioni. Il valore vuoto preserva i
-- record esistenti senza inventare dati e viene rimosso come default subito dopo.
ALTER TABLE "WaitingListEntry"
  ADD COLUMN "residenceAddress" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "residenceCity" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "residenceProvince" CHAR(2) NOT NULL DEFAULT '',
  ADD COLUMN "residencePostalCode" VARCHAR(12) NOT NULL DEFAULT '';

ALTER TABLE "Guardian"
  ADD COLUMN "postalCode" VARCHAR(12) NOT NULL DEFAULT '';

ALTER TABLE "WaitingListEntry"
  ALTER COLUMN "residenceAddress" DROP DEFAULT,
  ALTER COLUMN "residenceCity" DROP DEFAULT,
  ALTER COLUMN "residenceProvince" DROP DEFAULT,
  ALTER COLUMN "residencePostalCode" DROP DEFAULT;

ALTER TABLE "Guardian"
  ALTER COLUMN "postalCode" DROP DEFAULT;
