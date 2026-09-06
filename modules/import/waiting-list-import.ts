import { z } from "zod";

import { isValidFiscalCode, normalizeFiscalCode } from "@/modules/applicants/domain/fiscal-code";
import { getRegistrationYear } from "@/modules/applicants/domain/registration-number";
import { createApplicantDataSchema } from "@/modules/applicants/schemas/applicant-data";

export type WaitingListImportOptions =
  | { mode: "complete"; privacyPolicyVersion: string; timeZone?: string }
  | { mode: "legacy"; timeZone?: string };

export interface PreparedImportRow {
  sourceRow: number;
  createdAt: Date;
  privacyAccepted: boolean;
  privacyAcceptedAt: Date | null;
  privacyPolicyVersion: string | null;
  status: "IN_ATTESA";
  duplicateKeys: string[];
  minor: {
    firstName: string;
    lastName: string;
    gender: "M" | "F";
    birthDate: Date;
    birthYear: number;
    birthPlace: string | null;
    birthProvince: string | null;
    fiscalCode: string | null;
    residenceAddress: string | null;
    residenceCity: string | null;
    residenceProvince: string | null;
    residencePostalCode: string | null;
    notes: string;
  };
  guardians: Array<{
    type: "A" | "B";
    firstName: string | null;
    lastName: string | null;
    birthDate: Date | null;
    birthPlace: string | null;
    birthProvince: string | null;
    fiscalCode: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    postalCode: string | null;
    email: string | null;
    phone: string | null;
  }>;
}

export interface ImportPreparationError {
  row: number;
  code: "INVALID_ROW" | "DUPLICATE_IN_FILE";
  message: string;
}

const requiredText = (label: string, max = 120) => z
  .string()
  .trim()
  .min(1, `${label} è obbligatorio.`)
  .max(max, `${label} è troppo lungo.`);

const nullableText = (max = 120) => z
  .string()
  .trim()
  .max(max, "Il valore è troppo lungo.")
  .transform((input) => input || null);

const nullableProvince = z
  .string()
  .trim()
  .transform((input) => input.toUpperCase())
  .refine((input) => input === "" || /^[A-Z]{2}$/.test(input), "La provincia deve contenere due lettere.")
  .transform((input) => input || null);

const nullableFiscalCode = z
  .string()
  .transform(normalizeFiscalCode)
  .refine((input) => input === "" || isValidFiscalCode(input), "Il Codice Fiscale non è valido.")
  .transform((input) => input || null);

const nullableEmail = z
  .string()
  .trim()
  .refine((input) => input === "" || z.email().safeParse(input).success, "L'email non è valida.")
  .transform((input) => input.toLowerCase() || null);

const nullableIsoDate = z
  .string()
  .refine((input) => input === "" || isIsoDate(input), "La data non è valida.")
  .transform((input) => input || null);

const legacyMinorSchema = z.object({
  firstName: requiredText("Il nome"),
  lastName: requiredText("Il cognome"),
  gender: z.enum(["M", "F"]),
  birthDate: z.string().refine(isIsoDate, "La data di nascita non è valida."),
  birthPlace: nullableText(),
  birthProvince: nullableProvince,
  fiscalCode: nullableFiscalCode,
  residenceAddress: nullableText(180),
  residenceCity: nullableText(),
  residenceProvince: nullableProvince,
  residencePostalCode: nullableText(12),
  notes: z.string().trim().max(2_000).default(""),
});

const legacyGuardianSchema = z.object({
  type: z.enum(["A", "B"]),
  firstName: nullableText(),
  lastName: nullableText(),
  birthDate: nullableIsoDate,
  birthPlace: nullableText(),
  birthProvince: nullableProvince,
  fiscalCode: nullableFiscalCode,
  address: nullableText(180),
  city: nullableText(),
  province: nullableProvince,
  postalCode: nullableText(12),
  email: nullableEmail,
  phone: nullableText(120),
});

export function prepareImportRows(
  rows: Array<Record<string, unknown>>,
  options: WaitingListImportOptions,
  now = new Date(),
) {
  const valid: PreparedImportRow[] = [];
  const errors: ImportPreparationError[] = [];
  const seenKeys = new Set<string>();
  const timeZone = options.timeZone ?? "Europe/Rome";

  for (const [index, row] of rows.entries()) {
    const sourceRow = index + 2;
    const prepared = options.mode === "legacy"
      ? prepareLegacyRow(row, sourceRow, timeZone, now)
      : prepareCompleteRow(row, sourceRow, options.privacyPolicyVersion, timeZone, now);

    if (!prepared.ok) {
      errors.push({ row: sourceRow, code: "INVALID_ROW", message: prepared.message });
      continue;
    }
    if (prepared.row.duplicateKeys.some((key) => seenKeys.has(key))) {
      errors.push({
        row: sourceRow,
        code: "DUPLICATE_IN_FILE",
        message: "Iscritto duplicato nel file.",
      });
      continue;
    }
    prepared.row.duplicateKeys.forEach((key) => seenKeys.add(key));
    valid.push(prepared.row);
  }

  valid.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.sourceRow - b.sourceRow);
  return { valid, errors };
}

function prepareCompleteRow(
  row: Record<string, unknown>,
  sourceRow: number,
  privacyPolicyVersion: string,
  timeZone: string,
  now: Date,
): { ok: true; row: PreparedImportRow } | { ok: false; message: string } {
  const data = applicantData(row);
  const parsed = createApplicantDataSchema(() => now).safeParse(data);
  const createdAt = timestamp(row.createdAt, timeZone);
  const privacyAcceptedAt = timestamp(row.privacyAcceptedAt, timeZone);
  if (!parsed.success || !createdAt || !privacyAcceptedAt || !privacyPolicyVersion.trim()) {
    return {
      ok: false,
      message: parsed.error?.issues[0]?.message ?? "Timestamp o versione privacy non validi.",
    };
  }
  if (!isSupportedCreationTime(createdAt, now)) {
    return { ok: false, message: "La data di iscrizione deve essere compresa tra il 2000 e oggi." };
  }

  const minor = {
    ...parsed.data.minor,
    birthDate: toUtcDate(parsed.data.minor.birthDate),
    birthYear: Number(parsed.data.minor.birthDate.slice(0, 4)),
  };
  const guardians = parsed.data.guardians.map((guardian) => ({
    ...guardian,
    birthDate: toUtcDate(guardian.birthDate),
  }));
  const duplicateKeys = importIdentityKeys(minor);
  return {
    ok: true,
    row: {
      sourceRow,
      createdAt,
      privacyAccepted: true,
      privacyAcceptedAt,
      privacyPolicyVersion: privacyPolicyVersion.trim(),
      status: "IN_ATTESA",
      duplicateKeys,
      minor,
      guardians,
    },
  };
}

function prepareLegacyRow(
  row: Record<string, unknown>,
  sourceRow: number,
  timeZone: string,
  now: Date,
): { ok: true; row: PreparedImportRow } | { ok: false; message: string } {
  const birthDate = dateOnly(row.birthDate);
  const parsedMinor = legacyMinorSchema.safeParse({
    firstName: value(row.firstName),
    lastName: value(row.lastName),
    gender: value(row.gender).toUpperCase(),
    birthDate,
    birthPlace: value(row.birthPlace),
    birthProvince: value(row.birthProvince),
    fiscalCode: value(row.fiscalCode),
    residenceAddress: value(row.residenceAddress),
    residenceCity: value(row.residenceCity),
    residenceProvince: value(row.residenceProvince),
    residencePostalCode: value(row.residencePostalCode),
    notes: value(row.notes),
  });
  const createdAt = timestamp(row.createdAt, timeZone);
  if (!parsedMinor.success || !createdAt) {
    return {
      ok: false,
      message: parsedMinor.error?.issues[0]?.message ?? "La data storica di iscrizione non è valida.",
    };
  }
  if (!isSupportedCreationTime(createdAt, now)) {
    return { ok: false, message: "La data storica di iscrizione deve essere compresa tra il 2000 e oggi." };
  }

  const parsedBirthDate = toUtcDate(parsedMinor.data.birthDate);
  if (parsedBirthDate > now) {
    return { ok: false, message: "La data di nascita non può essere futura." };
  }

  const guardians: PreparedImportRow["guardians"] = [];
  for (const type of ["A", "B"] as const) {
    if (!hasGuardianData(row, type)) continue;
    const guardian = legacyGuardianSchema.safeParse({
      type,
      firstName: value(row[`guardian${type}FirstName`]),
      lastName: value(row[`guardian${type}LastName`]),
      birthDate: dateOnly(row[`guardian${type}BirthDate`]),
      birthPlace: value(row[`guardian${type}BirthPlace`]),
      birthProvince: value(row[`guardian${type}BirthProvince`]),
      fiscalCode: value(row[`guardian${type}FiscalCode`]),
      address: value(row[`guardian${type}Address`]),
      city: value(row[`guardian${type}City`]),
      province: value(row[`guardian${type}Province`]),
      postalCode: value(row[`guardian${type}PostalCode`]),
      email: value(row[`guardian${type}Email`]),
      phone: value(row[`guardian${type}Phone`]),
    });
    if (!guardian.success) {
      return {
        ok: false,
        message: `Dati del Genitore ${type} non validi: ${guardian.error.issues[0]?.message ?? "controlla i valori."}`,
      };
    }
    guardians.push({
      ...guardian.data,
      birthDate: guardian.data.birthDate ? toUtcDate(guardian.data.birthDate) : null,
    });
  }

  const minor = {
    ...parsedMinor.data,
    birthDate: parsedBirthDate,
    birthYear: Number(parsedMinor.data.birthDate.slice(0, 4)),
  };
  return {
    ok: true,
    row: {
      sourceRow,
      createdAt,
      privacyAccepted: false,
      privacyAcceptedAt: null,
      privacyPolicyVersion: null,
      status: "IN_ATTESA",
      duplicateKeys: importIdentityKeys(minor),
      minor,
      guardians,
    },
  };
}

function applicantData(row: Record<string, unknown>) {
  return {
    minor: {
      firstName: value(row.firstName),
      lastName: value(row.lastName),
      gender: value(row.gender),
      birthDate: dateOnly(row.birthDate),
      birthPlace: value(row.birthPlace),
      birthProvince: value(row.birthProvince),
      fiscalCode: value(row.fiscalCode),
      residenceAddress: value(row.residenceAddress),
      residenceCity: value(row.residenceCity),
      residenceProvince: value(row.residenceProvince),
      residencePostalCode: value(row.residencePostalCode),
      notes: value(row.notes),
    },
    guardians: (["A", "B"] as const).map((type) => ({
      type,
      firstName: value(row[`guardian${type}FirstName`]),
      lastName: value(row[`guardian${type}LastName`]),
      birthDate: dateOnly(row[`guardian${type}BirthDate`]),
      birthPlace: value(row[`guardian${type}BirthPlace`]),
      birthProvince: value(row[`guardian${type}BirthProvince`]),
      fiscalCode: value(row[`guardian${type}FiscalCode`]),
      address: value(row[`guardian${type}Address`]),
      city: value(row[`guardian${type}City`]),
      province: value(row[`guardian${type}Province`]),
      postalCode: value(row[`guardian${type}PostalCode`]),
      email: value(row[`guardian${type}Email`]),
      phone: value(row[`guardian${type}Phone`]),
    })),
  };
}

function hasGuardianData(row: Record<string, unknown>, type: "A" | "B") {
  return [
    "FirstName",
    "LastName",
    "BirthDate",
    "BirthPlace",
    "BirthProvince",
    "FiscalCode",
    "Address",
    "City",
    "Province",
    "PostalCode",
    "Email",
    "Phone",
  ].some((field) => value(row[`guardian${type}${field}`]).trim() !== "");
}

export function importIdentityKeys(minor: {
  firstName: string;
  lastName: string;
  birthDate: Date;
  fiscalCode: string | null;
}) {
  const identity = [minor.firstName, minor.lastName]
    .map((part) => part.trim().replace(/\s+/g, " ").normalize("NFKC").toUpperCase())
    .join("|");
  return [
    `identity:${identity}|${minor.birthDate.toISOString().slice(0, 10)}`,
    ...(minor.fiscalCode ? [`fiscal-code:${minor.fiscalCode}`] : []),
  ];
}

function value(input: unknown): string {
  return typeof input === "string" || typeof input === "number" ? String(input) : "";
}

function dateOnly(input: unknown): string {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input.toISOString().slice(0, 10);
  const text = value(input).trim();
  if (isIsoDate(text)) return text;
  const italian = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!italian) return text;
  const [, day, month, year] = italian;
  const iso = `${year}-${month}-${day}`;
  return isIsoDate(iso) ? iso : text;
}

function timestamp(input: unknown, timeZone: string): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const text = value(input).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) {
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const italian = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/.exec(text);
  if (!italian) return null;
  const [, day, month, year, hour, minute] = italian;
  return wallTimeToDate({
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
  }, timeZone);
}

function wallTimeToDate(
  desired: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string,
): Date | null {
  const desiredTime = Date.UTC(desired.year, desired.month - 1, desired.day, desired.hour, desired.minute);
  let candidate = desiredTime;
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const actual = Object.fromEntries(
        formatter.formatToParts(new Date(candidate))
          .filter((part) => part.type !== "literal")
          .map((part) => [part.type, Number(part.value)]),
      );
      const actualTime = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
      candidate += desiredTime - actualTime;
    }
    const result = new Date(candidate);
    const parts = Object.fromEntries(
      formatter.formatToParts(result)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    );
    return parts.year === desired.year
      && parts.month === desired.month
      && parts.day === desired.day
      && parts.hour === desired.hour
      && parts.minute === desired.minute
      ? result
      : null;
  } catch {
    return null;
  }
}

function isIsoDate(input: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return false;
  const date = toUtcDate(input);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(input);
}

function toUtcDate(input: string) {
  return new Date(`${input}T00:00:00.000Z`);
}

function isSupportedCreationTime(createdAt: Date, now: Date) {
  return getRegistrationYear(createdAt) >= 2_000 && createdAt <= now;
}
