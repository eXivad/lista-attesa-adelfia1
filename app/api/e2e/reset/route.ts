import { randomUUID, timingSafeEqual } from "node:crypto";

import { hashPassword } from "better-auth/crypto";
import { revalidateTag } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { PRIVACY_POLICY_CACHE_TAG } from "@/lib/server/privacy-policy";
import { getPrismaClient } from "@/lib/server/prisma";
import { canResetE2EData } from "@/modules/e2e/reset-guard";

const requestSchema = z.object({ scenario: z.enum(["list", "calls"]) });

export async function POST(request: Request) {
  const resetEnvironment = {
    E2E_ALLOW_RESET: process.env.E2E_ALLOW_RESET,
    DATABASE_URL: process.env.DATABASE_URL,
  };
  if (!canResetE2EData(resetEnvironment) || !isAuthorized(request.headers.get("x-e2e-reset-secret"))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid scenario" }, { status: 400 });

  const result = await resetFixtures(parsed.data.scenario);
  revalidateTag(PRIVACY_POLICY_CACHE_TAG, { expire: 0 });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

function isAuthorized(candidate: string | null) {
  const secret = process.env.E2E_RESET_SECRET;
  if (!secret || secret.length < 16 || !candidate) return false;
  const expectedBuffer = Buffer.from(secret);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

async function resetFixtures(scenario: "list" | "calls") {
  const client = getPrismaClient();
  const privacy = await client.privacyPolicyVersion.findFirst({
    where: { isActive: true },
    select: { version: true },
  }) ?? await client.privacyPolicyVersion.upsert({
    where: { version: "e2e-1" },
    create: {
      id: e2eId(900),
      version: "e2e-1",
      fileUrl: "https://example.test/privacy-e2e.pdf",
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      isActive: true,
    },
    update: { isActive: true },
    select: { version: true },
  });

  const staff = readStaffFixture();
  const staffPasswordHash = staff ? await hashPassword(staff.password) : null;
  const startYear = new Date().getFullYear();
  const fixtures = scenario === "list" ? listFixtures() : callsFixtures(startYear);

  await client.$transaction(async (transaction) => {
    await transaction.annualStatistics.deleteMany();
    await transaction.callParticipation.deleteMany();
    await transaction.associativeYear.deleteMany();
    await transaction.waitingListEntry.deleteMany();
    await transaction.blockedIdentifier.deleteMany();
    await transaction.registrationCounter.deleteMany();
    await transaction.rateLimitBucket.deleteMany();
    await transaction.mailQuotaReservation.deleteMany();

    if (staff && staffPasswordHash) {
      await transaction.user.deleteMany({
        where: { role: "STAFF", email: staff.email },
      });
      const userId = randomUUID();
      await transaction.user.create({ data: {
        id: userId,
        name: `${staff.firstName} ${staff.lastName}`,
        firstName: staff.firstName,
        lastName: staff.lastName,
        email: staff.email,
        emailVerified: true,
        role: "STAFF",
      } });
      await transaction.account.create({ data: {
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        issuer: "local:credential",
        userId,
        password: staffPasswordHash,
      } });
    }

    for (const fixture of fixtures) {
      await createApplicant(transaction, fixture, privacy.version);
    }
  });

  return {
    scenario,
    startYear,
    applicants: Object.fromEntries(fixtures.map((fixture) => [fixture.key, fixture.id])),
  };
}

interface ApplicantFixture {
  key: string;
  id: string;
  firstName: string;
  lastName: string;
  gender: "M" | "F";
  birthYear: number;
  status: "IN_ATTESA" | "DA_CHIAMARE" | "ACCETTATO" | "RIFIUTATO";
  createdAt: Date;
}

function listFixtures(): ApplicantFixture[] {
  const primary = [
    fixture(1, "alice", "Alice", "Alpha", "F", 2018, "IN_ATTESA", "2026-01-01T09:00:00Z"),
    fixture(2, "bruno", "Bruno", "Beta", "M", 2014, "IN_ATTESA", "2026-01-01T09:00:00Z"),
    fixture(3, "carla", "Carla", "Gamma", "M", 2018, "DA_CHIAMARE", "2026-01-02T10:30:00Z"),
    fixture(4, "diana", "Diana", "Delta", "F", 2010, "ACCETTATO", "2026-01-03T11:45:00Z"),
    fixture(5, "enzo", "Enzo", "Epsilon", "M", 2017, "RIFIUTATO", "2026-01-04T12:15:00Z"),
  ];
  const pagination = Array.from({ length: 17 }, (_, offset) => {
    const number = offset + 1;
    return fixture(20 + number, `filler${String(number).padStart(2, "0")}`, `Fixture ${String(number).padStart(2, "0")}`, "Pagination", "M", 2000, "RIFIUTATO", `2026-01-${String(number + 4).padStart(2, "0")}T13:00:00Z`);
  });
  return [...primary, ...pagination];
}

function callsFixtures(startYear: number): ApplicantFixture[] {
  return [
    fixture(11, "eligibleLc", "Lia", "Lupetti", "F", startYear - 8, "IN_ATTESA", "2026-02-01T09:00:00Z"),
    fixture(12, "eligibleEg", "Edo", "Esploratori", "M", startYear - 12, "IN_ATTESA", "2026-02-02T09:00:00Z"),
    fixture(13, "eligibleRs", "Rita", "Rover", "F", startYear - 16, "IN_ATTESA", "2026-02-03T09:00:00Z"),
    fixture(14, "ineligible", "Nino", "NonEleggibile", "M", startYear - 9, "IN_ATTESA", "2026-02-04T09:00:00Z"),
  ];
}

function fixture(index: number, key: string, firstName: string, lastName: string, gender: "M" | "F", birthYear: number, status: ApplicantFixture["status"], createdAt: string): ApplicantFixture {
  return { key, id: e2eId(index), firstName, lastName, gender, birthYear, status, createdAt: new Date(createdAt) };
}

async function createApplicant(transaction: Prisma.TransactionClient, fixture: ApplicantFixture, privacyPolicyVersion: string) {
  const index = Number(fixture.id.slice(-4));
  await transaction.waitingListEntry.create({ data: {
    id: fixture.id,
    registrationNumber: `E2E-${String(index).padStart(6, "0")}`,
    firstName: fixture.firstName,
    lastName: fixture.lastName,
    gender: fixture.gender,
    birthDate: new Date(`${fixture.birthYear}-01-15T00:00:00Z`),
    birthYear: fixture.birthYear,
    birthPlace: "Bari",
    birthProvince: "BA",
    fiscalCode: `E2EFIX${String(index).padStart(10, "0")}`,
    residenceAddress: `Via Test ${index}`,
    residenceCity: "Adelfia",
    residenceProvince: "BA",
    residencePostalCode: "70010",
    notes: `Fixture E2E ${fixture.key}`,
    status: fixture.status,
    terminalStatusAt: fixture.status === "ACCETTATO" || fixture.status === "RIFIUTATO" ? fixture.createdAt : null,
    privacyAccepted: true,
    privacyAcceptedAt: fixture.createdAt,
    privacyPolicyVersion,
    createdAt: fixture.createdAt,
    guardians: { create: (["A", "B"] as const).map((type, guardianIndex) => ({
      id: e2eId(100 + index * 2 + guardianIndex),
      type,
      firstName: type === "A" ? "Ada" : "Bruno",
      lastName: fixture.lastName,
      birthDate: new Date("1985-03-01T00:00:00Z"),
      birthPlace: "Bari",
      birthProvince: "BA",
      fiscalCode: `E2EGUA${String(index * 2 + guardianIndex).padStart(10, "0")}`,
      address: `Via Genitori ${index}`,
      city: "Adelfia",
      province: "BA",
      postalCode: "70010",
      email: `${fixture.key}.${type.toLowerCase()}@example.test`,
      phone: `333${String(index).padStart(7, "0")}`,
      createdAt: fixture.createdAt,
    })) },
  } });
}

function e2eId(value: number) {
  return `01J6E2E${String(value).padStart(19, "0")}`;
}

function readStaffFixture() {
  const email = process.env.E2E_STAFF_EMAIL?.trim().toLowerCase();
  const password = process.env.E2E_STAFF_PASSWORD;
  if (!email || !password) return null;
  return {
    firstName: "E2E",
    lastName: "Staff",
    email,
    password,
  };
}
