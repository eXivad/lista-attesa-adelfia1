import { createApplicantDataSchema } from "@/modules/applicants/schemas/applicant-data";

export interface PreparedImportRow {
  sourceRow: number;
  createdAt: Date;
  privacyAcceptedAt: Date;
  privacyPolicyVersion: string;
  status: "IN_ATTESA";
  minor: {
    firstName: string; lastName: string; gender: "M" | "F"; birthDate: Date; birthYear: number;
    birthPlace: string; birthProvince: string; fiscalCode: string; residenceAddress: string;
    residenceCity: string; residenceProvince: string; residencePostalCode: string; notes: string;
  };
  guardians: Array<{
    type: "A" | "B"; firstName: string; lastName: string; birthDate: Date; birthPlace: string;
    birthProvince: string; fiscalCode: string; address: string; city: string; province: string; postalCode: string; email: string; phone: string;
  }>;
}

export interface ImportPreparationError {
  row: number;
  code: "INVALID_ROW" | "DUPLICATE_IN_FILE";
  message: string;
}

export function prepareImportRows(rows: Array<Record<string, unknown>>, privacyPolicyVersion: string, now = new Date()) {
  const valid: PreparedImportRow[] = [];
  const errors: ImportPreparationError[] = [];
  const fiscalCodes = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const sourceRow = index + 2;
    const data = {
      minor: {
        firstName: value(row.firstName), lastName: value(row.lastName), gender: value(row.gender),
        birthDate: dateOnly(row.birthDate), birthPlace: value(row.birthPlace), birthProvince: value(row.birthProvince),
        fiscalCode: value(row.fiscalCode), residenceAddress: value(row.residenceAddress),
        residenceCity: value(row.residenceCity), residenceProvince: value(row.residenceProvince),
        residencePostalCode: value(row.residencePostalCode), notes: value(row.notes),
      },
      guardians: (["A", "B"] as const).map((type) => ({
        type,
        firstName: value(row[`guardian${type}FirstName`]), lastName: value(row[`guardian${type}LastName`]),
        birthDate: dateOnly(row[`guardian${type}BirthDate`]), birthPlace: value(row[`guardian${type}BirthPlace`]),
        birthProvince: value(row[`guardian${type}BirthProvince`]), fiscalCode: value(row[`guardian${type}FiscalCode`]),
        address: value(row[`guardian${type}Address`]), city: value(row[`guardian${type}City`]),
        province: value(row[`guardian${type}Province`]), postalCode: value(row[`guardian${type}PostalCode`]),
        email: value(row[`guardian${type}Email`]), phone: value(row[`guardian${type}Phone`]),
      })),
    };
    const parsed = createApplicantDataSchema(() => now).safeParse(data);
    const createdAt = timestamp(row.createdAt);
    const privacyAcceptedAt = timestamp(row.privacyAcceptedAt);
    if (!parsed.success || !createdAt || !privacyAcceptedAt || !privacyPolicyVersion.trim()) {
      errors.push({ row: sourceRow, code: "INVALID_ROW", message: parsed.error?.issues[0]?.message ?? "Timestamp o versione privacy non validi." });
      continue;
    }
    if (fiscalCodes.has(parsed.data.minor.fiscalCode)) {
      errors.push({ row: sourceRow, code: "DUPLICATE_IN_FILE", message: "Codice Fiscale duplicato nel file." });
      continue;
    }
    fiscalCodes.add(parsed.data.minor.fiscalCode);
    valid.push({
      sourceRow, createdAt, privacyAcceptedAt, privacyPolicyVersion: privacyPolicyVersion.trim(), status: "IN_ATTESA",
      minor: { ...parsed.data.minor, birthDate: new Date(`${parsed.data.minor.birthDate}T00:00:00Z`), birthYear: Number(parsed.data.minor.birthDate.slice(0, 4)) },
      guardians: parsed.data.guardians.map((guardian) => ({ ...guardian, birthDate: new Date(`${guardian.birthDate}T00:00:00Z`) })),
    });
  }
  valid.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.sourceRow - b.sourceRow);
  return { valid, errors };
}

function value(input: unknown): string {
  return typeof input === "string" || typeof input === "number" ? String(input) : "";
}

function dateOnly(input: unknown): string {
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input.toISOString().slice(0, 10);
  return value(input).trim();
}

function timestamp(input: unknown): Date | null {
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  const text = value(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(text)) return null;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
