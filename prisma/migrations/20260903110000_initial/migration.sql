-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "ApplicantGender" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "GuardianType" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('IN_ATTESA', 'DA_CHIAMARE', 'ACCETTATO', 'RIFIUTATO');

-- CreateEnum
CREATE TYPE "Branch" AS ENUM ('LC', 'EG', 'RS');

-- CreateEnum
CREATE TYPE "AssociativeYearStatus" AS ENUM ('CREATED', 'ACTIVE_CALLS_CLOSED', 'CALLS_OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MailType" AS ENUM ('REGISTRATION_CONFIRMATION', 'ACCEPTANCE_CONFIRMATION', 'REJECTION_CONFIRMATION', 'STAFF_INVITATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "MailDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(36) NOT NULL,
    "name" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "memberCode" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" VARCHAR(36) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" VARCHAR(36) NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" VARCHAR(36) NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" VARCHAR(36) NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(3),
    "refreshTokenExpiresAt" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" VARCHAR(36) NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInvitation" (
    "id" VARCHAR(26) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "memberCode" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" VARCHAR(36),
    "pendingEmail" TEXT,
    "pendingMemberCode" TEXT,

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitingListEntry" (
    "id" VARCHAR(26) NOT NULL,
    "registrationNumber" VARCHAR(20) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" "ApplicantGender" NOT NULL,
    "birthDate" DATE NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "birthPlace" TEXT NOT NULL,
    "birthProvince" CHAR(2) NOT NULL,
    "fiscalCode" CHAR(16) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "status" "ApplicantStatus" NOT NULL DEFAULT 'IN_ATTESA',
    "terminalStatusAt" TIMESTAMPTZ(3),
    "privacyAccepted" BOOLEAN NOT NULL,
    "privacyAcceptedAt" TIMESTAMPTZ(3) NOT NULL,
    "privacyPolicyVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WaitingListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guardian" (
    "id" VARCHAR(26) NOT NULL,
    "applicantId" VARCHAR(26) NOT NULL,
    "type" "GuardianType" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "birthPlace" TEXT NOT NULL,
    "birthProvince" CHAR(2) NOT NULL,
    "fiscalCode" CHAR(16) NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "province" CHAR(2) NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssociativeYear" (
    "id" VARCHAR(26) NOT NULL,
    "label" VARCHAR(9) NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "status" "AssociativeYearStatus" NOT NULL DEFAULT 'CREATED',
    "currentKey" INTEGER,
    "callsOpenedAt" TIMESTAMPTZ(3),
    "callsClosedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AssociativeYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallParticipation" (
    "id" VARCHAR(26) NOT NULL,
    "associativeYearId" VARCHAR(26) NOT NULL,
    "applicantId" VARCHAR(26),
    "branch" "Branch" NOT NULL,
    "gender" "ApplicantGender" NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "outcome" "ApplicantStatus" NOT NULL DEFAULT 'DA_CHIAMARE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CallParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnnualStatistics" (
    "id" VARCHAR(26) NOT NULL,
    "associativeYearId" VARCHAR(26) NOT NULL,
    "branch" "Branch" NOT NULL,
    "gender" "ApplicantGender" NOT NULL,
    "birthYear" INTEGER NOT NULL,
    "totalCandidates" INTEGER NOT NULL,
    "accepted" INTEGER NOT NULL,
    "refused" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnualStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyPolicyVersion" (
    "id" VARCHAR(26) NOT NULL,
    "version" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PrivacyPolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedIdentifier" (
    "id" VARCHAR(26) NOT NULL,
    "identifierHash" CHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchConfiguration" (
    "branch" "Branch" NOT NULL,
    "minAge" INTEGER NOT NULL,
    "maxAge" INTEGER NOT NULL,
    "entryAge" INTEGER NOT NULL,
    "colorHex" CHAR(7) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BranchConfiguration_pkey" PRIMARY KEY ("branch")
);

-- CreateTable
CREATE TABLE "RegistrationCounter" (
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RegistrationCounter_pkey" PRIMARY KEY ("year")
);

-- CreateTable
CREATE TABLE "MailingRecipient" (
    "id" VARCHAR(26) NOT NULL,
    "email" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MailingRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailOutbox" (
    "id" VARCHAR(26) NOT NULL,
    "applicantId" VARCHAR(26),
    "type" "MailType" NOT NULL,
    "recipients" TEXT[],
    "payload" JSONB NOT NULL,
    "status" "MailDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "keyHash" CHAR(64) NOT NULL,
    "windowStart" TIMESTAMPTZ(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("keyHash")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_memberCode_key" ON "User"("memberCode");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_pendingEmail_key" ON "StaffInvitation"("pendingEmail");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_pendingMemberCode_key" ON "StaffInvitation"("pendingMemberCode");

-- CreateIndex
CREATE INDEX "StaffInvitation_email_idx" ON "StaffInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "WaitingListEntry_registrationNumber_key" ON "WaitingListEntry"("registrationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WaitingListEntry_fiscalCode_key" ON "WaitingListEntry"("fiscalCode");

-- CreateIndex
CREATE INDEX "WaitingListEntry_createdAt_id_idx" ON "WaitingListEntry"("createdAt", "id");

-- CreateIndex
CREATE INDEX "WaitingListEntry_status_createdAt_id_idx" ON "WaitingListEntry"("status", "createdAt", "id");

-- CreateIndex
CREATE INDEX "WaitingListEntry_birthYear_createdAt_id_idx" ON "WaitingListEntry"("birthYear", "createdAt", "id");

-- CreateIndex
CREATE INDEX "WaitingListEntry_gender_createdAt_id_idx" ON "WaitingListEntry"("gender", "createdAt", "id");

-- CreateIndex
CREATE INDEX "WaitingListEntry_firstName_lastName_idx" ON "WaitingListEntry"("firstName", "lastName");

-- CreateIndex
CREATE INDEX "Guardian_email_idx" ON "Guardian"("email");

-- CreateIndex
CREATE INDEX "Guardian_phone_idx" ON "Guardian"("phone");

-- CreateIndex
CREATE INDEX "Guardian_firstName_lastName_idx" ON "Guardian"("firstName", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "Guardian_applicantId_type_key" ON "Guardian"("applicantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "AssociativeYear_label_key" ON "AssociativeYear"("label");

-- CreateIndex
CREATE UNIQUE INDEX "AssociativeYear_startYear_key" ON "AssociativeYear"("startYear");

-- CreateIndex
CREATE UNIQUE INDEX "AssociativeYear_currentKey_key" ON "AssociativeYear"("currentKey");

-- CreateIndex
CREATE INDEX "CallParticipation_associativeYearId_outcome_idx" ON "CallParticipation"("associativeYearId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "CallParticipation_associativeYearId_applicantId_key" ON "CallParticipation"("associativeYearId", "applicantId");

-- CreateIndex
CREATE INDEX "AnnualStatistics_associativeYearId_idx" ON "AnnualStatistics"("associativeYearId");

-- CreateIndex
CREATE UNIQUE INDEX "AnnualStatistics_associativeYearId_branch_gender_birthYear_key" ON "AnnualStatistics"("associativeYearId", "branch", "gender", "birthYear");

-- CreateIndex
CREATE UNIQUE INDEX "PrivacyPolicyVersion_version_key" ON "PrivacyPolicyVersion"("version");

-- CreateIndex
CREATE INDEX "PrivacyPolicyVersion_isActive_idx" ON "PrivacyPolicyVersion"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedIdentifier_identifierHash_key" ON "BlockedIdentifier"("identifierHash");

-- CreateIndex
CREATE UNIQUE INDEX "MailingRecipient_email_key" ON "MailingRecipient"("email");

-- CreateIndex
CREATE INDEX "MailOutbox_status_createdAt_idx" ON "MailOutbox"("status", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_privacyPolicyVersion_fkey" FOREIGN KEY ("privacyPolicyVersion") REFERENCES "PrivacyPolicyVersion"("version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guardian" ADD CONSTRAINT "Guardian_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "WaitingListEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipation" ADD CONSTRAINT "CallParticipation_associativeYearId_fkey" FOREIGN KEY ("associativeYearId") REFERENCES "AssociativeYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipation" ADD CONSTRAINT "CallParticipation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "WaitingListEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnualStatistics" ADD CONSTRAINT "AnnualStatistics_associativeYearId_fkey" FOREIGN KEY ("associativeYearId") REFERENCES "AssociativeYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailOutbox" ADD CONSTRAINT "MailOutbox_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "WaitingListEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domain integrity checks not expressible in Prisma schema.
ALTER TABLE "AssociativeYear"
  ADD CONSTRAINT "AssociativeYear_years_check" CHECK ("endYear" = "startYear" + 1),
  ADD CONSTRAINT "AssociativeYear_currentKey_check" CHECK ("currentKey" IS NULL OR "currentKey" = 1);

ALTER TABLE "BranchConfiguration"
  ADD CONSTRAINT "BranchConfiguration_ages_check"
  CHECK ("minAge" >= 0 AND "maxAge" >= "minAge" AND "entryAge" BETWEEN "minAge" AND "maxAge");

ALTER TABLE "WaitingListEntry"
  ADD CONSTRAINT "WaitingListEntry_birthYear_check"
  CHECK ("birthYear" = EXTRACT(YEAR FROM "birthDate")),
  ADD CONSTRAINT "WaitingListEntry_privacy_check"
  CHECK ("privacyAccepted" = TRUE),
  ADD CONSTRAINT "WaitingListEntry_terminal_check"
  CHECK (
    ("status" IN ('ACCETTATO', 'RIFIUTATO') AND "terminalStatusAt" IS NOT NULL)
    OR
    ("status" IN ('IN_ATTESA', 'DA_CHIAMARE') AND "terminalStatusAt" IS NULL)
  );

ALTER TABLE "AnnualStatistics"
  ADD CONSTRAINT "AnnualStatistics_nonnegative_check"
  CHECK (
    "totalCandidates" >= 0 AND "accepted" >= 0 AND "refused" >= 0 AND "remaining" >= 0
    AND "totalCandidates" = "accepted" + "refused" + "remaining"
  );

ALTER TABLE "RegistrationCounter"
  ADD CONSTRAINT "RegistrationCounter_nonnegative_check" CHECK ("lastValue" >= 0);

ALTER TABLE "RateLimitBucket"
  ADD CONSTRAINT "RateLimitBucket_attempts_check" CHECK ("attempts" >= 0);
