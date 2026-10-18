import { z } from "zod";

import { isEligibleAge } from "@/modules/applicants/domain/age";
import { isValidFiscalCode, normalizeFiscalCode } from "@/modules/applicants/domain/fiscal-code";

const requiredText = z.string().trim().min(1, "Campo obbligatorio.").max(120);
const optionalText = (max = 120) => z.string().trim().max(max).transform((value) => value || null);
const optionalProvince = z.string().trim().toUpperCase()
  .refine((value) => !value || /^[A-Z]{2}$/.test(value), "Inserisci una sigla di due lettere.")
  .transform((value) => value || null);
const optionalFiscalCode = z.string().transform(normalizeFiscalCode)
  .refine((value) => !value || isValidFiscalCode(value), "Inserisci un Codice Fiscale valido.")
  .transform((value) => value || null);
const validDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}, "Inserisci una data valida.");
const optionalDate = z.string().refine((value) => !value || validDate.safeParse(value).success,
  "Inserisci una data valida.").transform((value) => value || null);

const guardianSchema = z.object({
  type: z.enum(["A", "B"]),
  firstName: optionalText(),
  lastName: optionalText(),
  birthDate: optionalDate,
  birthPlace: optionalText(),
  birthProvince: optionalProvince,
  fiscalCode: optionalFiscalCode,
  address: optionalText(180),
  city: optionalText(),
  province: optionalProvince,
  postalCode: optionalText(12),
  email: z.string().trim().refine((value) => !value || z.email().safeParse(value).success,
    "Inserisci un indirizzo email valido.").transform((value) => value ? value.toLowerCase() : null),
  phone: z.string().trim().refine((value) => !value ||
    (value.length >= 6 && value.length <= 30 && /^[+\d][\d\s()./-]+$/.test(value)),
  "Inserisci un numero di telefono valido.").transform((value) => value || null),
});

export function createBackofficeApplicantDataSchema(clock: () => Date = () => new Date(), enforceAge = false) {
  return z.object({
    minor: z.object({
      firstName: requiredText,
      lastName: requiredText,
      gender: z.enum(["M", "F"]),
      birthDate: validDate,
      birthPlace: optionalText(),
      birthProvince: optionalProvince,
      fiscalCode: optionalFiscalCode,
      residenceAddress: optionalText(180),
      residenceCity: optionalText(),
      residenceProvince: optionalProvince,
      residencePostalCode: optionalText(12),
      notes: z.string().trim().max(2_000),
    }),
    guardians: z.array(guardianSchema).max(2),
  }).superRefine((value, context) => {
    if (enforceAge && !isEligibleAge(new Date(`${value.minor.birthDate}T00:00:00.000Z`), clock())) {
      context.addIssue({ code: "custom", path: ["minor", "birthDate"],
        message: "L'iscrizione è consentita solo a chi è già nato e non ha più di 21 anni." });
    }
    if (new Set(value.guardians.map((guardian) => guardian.type)).size !== value.guardians.length) {
      context.addIssue({ code: "custom", path: ["guardians"], message: "Genitori duplicati." });
    }
    value.guardians.forEach((guardian, index) => {
      if (guardian.birthDate && new Date(`${guardian.birthDate}T00:00:00.000Z`) > clock()) {
        context.addIssue({ code: "custom", path: ["guardians", index, "birthDate"],
          message: "La data di nascita non può essere futura." });
      }
    });
  }).transform((value) => ({
    ...value,
    guardians: value.guardians.filter((guardian) =>
      Object.entries(guardian).some(([key, field]) => key !== "type" && field !== null)),
  }));
}

export type BackofficeApplicantDataInput = z.input<ReturnType<typeof createBackofficeApplicantDataSchema>>;
export type ValidatedBackofficeApplicantData = z.output<ReturnType<typeof createBackofficeApplicantDataSchema>>;
