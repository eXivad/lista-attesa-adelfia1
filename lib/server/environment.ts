import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "DATABASE_URL deve essere una connessione PostgreSQL.",
  }),
});

const registrationEnvironmentSchema = databaseEnvironmentSchema.extend({
  IDENTIFIER_HMAC_KEY: z.string().min(32),
  RATE_LIMIT_HMAC_KEY: z.string().min(32),
  POWER_AUTOMATE_WEBHOOK_URL: z.union([z.literal(""), z.url()]).default(""),
  POWER_AUTOMATE_BEARER_TOKEN: z.string().optional().default(""),
  MAIL_FROM: z.email(),
});

const authEnvironmentSchema = registrationEnvironmentSchema.extend({
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
});

export function getDatabaseEnvironment() {
  return databaseEnvironmentSchema.parse(process.env);
}

export function getRegistrationEnvironment() {
  return registrationEnvironmentSchema.parse(process.env);
}

export function getAuthEnvironment() {
  return authEnvironmentSchema.parse(process.env);
}
