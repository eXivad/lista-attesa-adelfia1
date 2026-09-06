import "dotenv/config";

import { createScriptPrismaClient } from "./prisma-client";

async function main() {
  const expected = numericOption("--expected");
  const prisma = createScriptPrismaClient();

  try {
    const [entries, counters] = await Promise.all([
      prisma.waitingListEntry.findMany({
        select: {
          status: true,
          privacyAccepted: true,
          privacyAcceptedAt: true,
          privacyPolicyVersion: true,
          birthPlace: true,
          birthProvince: true,
          fiscalCode: true,
          residenceAddress: true,
          residenceCity: true,
          residenceProvince: true,
          residencePostalCode: true,
          createdAt: true,
          guardians: {
            select: {
              type: true,
              firstName: true,
              lastName: true,
              birthDate: true,
              birthPlace: true,
              birthProvince: true,
              fiscalCode: true,
              address: true,
              city: true,
              province: true,
              postalCode: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.registrationCounter.findMany({ orderBy: { year: "asc" } }),
    ]);
    const guardians = entries.flatMap((entry) => entry.guardians);
    const invalidPrivacyStates = entries.filter((entry) => !(
      (entry.privacyAccepted && entry.privacyAcceptedAt && entry.privacyPolicyVersion)
      || (!entry.privacyAccepted && !entry.privacyAcceptedAt && !entry.privacyPolicyVersion)
    )).length;
    const report = {
      waitingListEntries: entries.length,
      statuses: countBy(entries, (entry) => entry.status),
      registrationYears: countBy(entries, (entry) => String(yearInRome(entry.createdAt))),
      privacy: {
        accepted: entries.filter((entry) => entry.privacyAccepted).length,
        notRecorded: entries.filter((entry) => !entry.privacyAccepted).length,
        invalidStates: invalidPrivacyStates,
      },
      missingApplicantFields: {
        birthPlace: countMissing(entries, "birthPlace"),
        birthProvince: countMissing(entries, "birthProvince"),
        fiscalCode: countMissing(entries, "fiscalCode"),
        residenceAddress: countMissing(entries, "residenceAddress"),
        residenceCity: countMissing(entries, "residenceCity"),
        residenceProvince: countMissing(entries, "residenceProvince"),
        residencePostalCode: countMissing(entries, "residencePostalCode"),
      },
      guardians: {
        total: guardians.length,
        byType: countBy(guardians, (guardian) => guardian.type),
        missingFields: {
          firstName: countMissing(guardians, "firstName"),
          lastName: countMissing(guardians, "lastName"),
          birthDate: countMissing(guardians, "birthDate"),
          birthPlace: countMissing(guardians, "birthPlace"),
          birthProvince: countMissing(guardians, "birthProvince"),
          fiscalCode: countMissing(guardians, "fiscalCode"),
          address: countMissing(guardians, "address"),
          city: countMissing(guardians, "city"),
          province: countMissing(guardians, "province"),
          postalCode: countMissing(guardians, "postalCode"),
          email: countMissing(guardians, "email"),
          phone: countMissing(guardians, "phone"),
        },
      },
      registrationCounters: counters.map(({ year, lastValue }) => ({ year, lastValue })),
    };

    console.log(JSON.stringify(report, null, 2));
    if (invalidPrivacyStates > 0 || (expected !== null && entries.length !== expected)) {
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

function numericOption(name: string) {
  const value = process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
  if (value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} deve essere un intero non negativo.`);
  return parsed;
}

function countBy<T>(values: T[], key: (value: T) => string) {
  return Object.fromEntries(
    [...values.reduce((counts, value) => {
      const itemKey = key(value);
      counts.set(itemKey, (counts.get(itemKey) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function countMissing<T, K extends keyof T>(values: T[], key: K) {
  return values.filter((value) => value[key] === null || value[key] === "").length;
}

function yearInRome(date: Date) {
  return Number(new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Rome",
    year: "numeric",
  }).format(date));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? (error.stack ?? error.message) : "Errore di verifica non riconosciuto.");
  process.exitCode = 1;
});
