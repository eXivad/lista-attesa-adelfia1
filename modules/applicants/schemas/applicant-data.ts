import { z } from "zod";

import { isEligibleAge } from "@/modules/applicants/domain/age";
import { isValidFiscalCode, normalizeFiscalCode } from "@/modules/applicants/domain/fiscal-code";

const requiredText = (label: string, max = 120) =>
  z
    .string({ error: `${label} è obbligatorio.` })
    .trim()
    .min(1, `${label} è obbligatorio.`)
    .max(max, `${label} è troppo lungo.`);

const province = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}$/, "Inserisci la sigla di provincia di due lettere."));

const fiscalCode = z
  .string()
  .transform(normalizeFiscalCode)
  .refine(isValidFiscalCode, "Il Codice Fiscale deve contenere 16 caratteri alfanumerici.");

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Inserisci una data valida.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Inserisci una data valida.");

const minorSchema = z.object({
  firstName: requiredText("Il nome"),
  lastName: requiredText("Il cognome"),
  gender: z.enum(["M", "F"]),
  birthDate: isoDate,
  birthPlace: requiredText("Il luogo di nascita"),
  birthProvince: province,
  fiscalCode,
  notes: z.string().trim().max(2_000, "Le note non possono superare 2000 caratteri.").optional().default(""),
});

const guardianSchema = z.object({
  type: z.enum(["A", "B"]),
  firstName: requiredText("Il nome"),
  lastName: requiredText("Il cognome"),
  birthDate: isoDate,
  birthPlace: requiredText("Il luogo di nascita"),
  birthProvince: province,
  fiscalCode,
  address: requiredText("L'indirizzo", 180),
  city: requiredText("Il comune"),
  province,
  email: z.email("Inserisci un indirizzo email valido.").transform((value) => value.trim().toLowerCase()),
  phone: z
    .string()
    .trim()
    .min(6, "Inserisci un numero di telefono valido.")
    .max(30, "Inserisci un numero di telefono valido.")
    .regex(/^[+\d][\d\s()./-]+$/, "Inserisci un numero di telefono valido."),
});

export function createApplicantDataSchema(clock: () => Date = () => new Date()) {
  return z
    .object({
      minor: minorSchema,
      guardians: z
        .array(guardianSchema)
        .length(2, "Nella V1 sono richiesti esattamente due genitori o tutori."),
    })
    .superRefine((value, context) => {
      const guardianTypes = new Set(value.guardians.map((guardian) => guardian.type));
      if (!guardianTypes.has("A") || !guardianTypes.has("B")) {
        context.addIssue({
          code: "custom",
          path: ["guardians"],
          message: "Devono essere presenti un tutore A e un tutore B.",
        });
      }

      const birthDate = new Date(`${value.minor.birthDate}T00:00:00.000Z`);
      if (!isEligibleAge(birthDate, clock())) {
        context.addIssue({
          code: "custom",
          path: ["minor", "birthDate"],
          message: "L'iscrizione è consentita solo a chi è già nato e non ha più di 21 anni.",
        });
      }

      for (const [index, guardian] of value.guardians.entries()) {
        if (new Date(`${guardian.birthDate}T00:00:00.000Z`) > clock()) {
          context.addIssue({
            code: "custom",
            path: ["guardians", index, "birthDate"],
            message: "La data di nascita non può essere futura.",
          });
        }
      }
    });
}

export type ApplicantDataInput = z.input<ReturnType<typeof createApplicantDataSchema>>;
export type ValidatedApplicantData = z.output<ReturnType<typeof createApplicantDataSchema>>;
