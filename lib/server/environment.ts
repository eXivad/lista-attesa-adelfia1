import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "DATABASE_URL deve essere una connessione PostgreSQL.",
  }),
  DATABASE_CA_CERT: z.string().trim().default(""),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(20).default(10),
});

const optionalEmail = z.union([z.literal(""), z.email()]).transform((value) => value.toLowerCase());

const mailEnvironmentSchema = z.object({
  GMAIL_USER: optionalEmail.default(""),
  GMAIL_OAUTH_CLIENT_ID: z.string().trim().default(""),
  GMAIL_OAUTH_CLIENT_SECRET: z.string().trim().default(""),
  GMAIL_OAUTH_REFRESH_TOKEN: z.string().trim().default(""),
  GMAIL_DAILY_RECIPIENT_LIMIT: z.coerce.number().int().min(1).max(2_000).default(450),
  GMAIL_MAX_RECIPIENTS_PER_MESSAGE: z.coerce.number().int().min(1).max(100).default(20),
  MAIL_FROM_NAME: z.string().trim().min(1).max(120).default("AGESCI Adelfia 1"),
  MAIL_REPLY_TO: optionalEmail.default(""),
});

const registrationEnvironmentSchema = databaseEnvironmentSchema.merge(mailEnvironmentSchema).extend({
  IDENTIFIER_HMAC_KEY: z.string().min(32),
  RATE_LIMIT_HMAC_KEY: z.string().min(32),
});

const authEnvironmentSchema = registrationEnvironmentSchema.extend({
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
});

export function getDatabaseEnvironment() {
  return databaseEnvironmentSchema.parse(process.env);
}

export function getMailEnvironment() {
  return mailEnvironmentSchema.parse(process.env);
}

export function getRegistrationEnvironment() {
  return registrationEnvironmentSchema.parse(process.env);
}

export function getAuthEnvironment() {
  return authEnvironmentSchema.parse(process.env);
}
