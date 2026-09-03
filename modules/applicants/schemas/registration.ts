import { z } from "zod";

import { createApplicantDataSchema } from "./applicant-data";

const requiredText = (label: string, max = 120) =>
  z
    .string({ error: `${label} è obbligatorio.` })
    .trim()
    .min(1, `${label} è obbligatorio.`)
    .max(max, `${label} è troppo lungo.`);

export function createApplicantRegistrationSchema(clock: () => Date = () => new Date()) {
  return createApplicantDataSchema(clock).safeExtend({
    privacyAccepted: z.boolean().refine(Boolean, "Devi accettare l'informativa privacy."),
    privacyPolicyVersion: requiredText("La versione dell'informativa", 40),
  });
}

export type ApplicantRegistrationInput = z.input<ReturnType<typeof createApplicantRegistrationSchema>>;
export type ValidatedApplicantRegistration = z.output<ReturnType<typeof createApplicantRegistrationSchema>>;
