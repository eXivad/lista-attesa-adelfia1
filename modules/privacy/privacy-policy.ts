import { z } from "zod";

export const MAX_PRIVACY_POLICY_VERSION_LENGTH = 40;
export const MAX_PRIVACY_POLICY_URL_LENGTH = 2_048;

const privacyPolicyVersionSchema = z
  .string()
  .trim()
  .min(1, "Inserisci la versione dell'informativa.")
  .max(
    MAX_PRIVACY_POLICY_VERSION_LENGTH,
    `La versione non può superare ${MAX_PRIVACY_POLICY_VERSION_LENGTH} caratteri.`,
  )
  .refine((value) => !/[\u0000-\u001F\u007F]/u.test(value), {
    message: "La versione contiene caratteri non validi.",
  });

const privacyPolicyUrlSchema = z
  .string()
  .trim()
  .min(1, "Inserisci il link del PDF.")
  .max(
    MAX_PRIVACY_POLICY_URL_LENGTH,
    `Il link non può superare ${MAX_PRIVACY_POLICY_URL_LENGTH} caratteri.`,
  )
  .superRefine((value, context) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:") {
        context.addIssue({
          code: "custom",
          message: "Il link del PDF deve usare HTTPS.",
        });
      }
      if (url.username || url.password) {
        context.addIssue({
          code: "custom",
          message: "Il link del PDF non può contenere credenziali.",
        });
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "Inserisci un link HTTPS assoluto valido.",
      });
    }
  })
  .transform((value) => new URL(value).toString());

export const privacyPolicyInputSchema = z.object({
  version: privacyPolicyVersionSchema,
  fileUrl: privacyPolicyUrlSchema,
});

export type PrivacyPolicyInput = z.infer<typeof privacyPolicyInputSchema>;
