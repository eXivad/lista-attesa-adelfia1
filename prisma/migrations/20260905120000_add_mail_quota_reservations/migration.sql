CREATE TABLE "MailQuotaReservation" (
    "id" VARCHAR(26) NOT NULL,
    "senderKey" CHAR(64) NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailQuotaReservation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MailQuotaReservation_recipientCount_check" CHECK ("recipientCount" > 0)
);

CREATE INDEX "MailQuotaReservation_senderKey_createdAt_idx"
ON "MailQuotaReservation"("senderKey", "createdAt");
