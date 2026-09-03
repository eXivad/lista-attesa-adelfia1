import "server-only";

import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { PowerAutomateMailProvider } from "@/providers/mail/power-automate-mail-provider";
import { getAuthEnvironment } from "./environment";
import { getPrismaClient } from "./prisma";

function createAuth() {
  const environment = getAuthEnvironment();
  const mailProvider = new PowerAutomateMailProvider({
    webhookUrl: environment.POWER_AUTOMATE_WEBHOOK_URL,
    bearerToken: environment.POWER_AUTOMATE_BEARER_TOKEN,
    sender: environment.MAIL_FROM,
  });

  return betterAuth({
    appName: "AGESCI Adelfia 1",
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: [new URL(environment.BETTER_AUTH_URL).origin],
    database: prismaAdapter(getPrismaClient(), { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await mailProvider.sendPasswordReset({
          recipient: user.email,
          staffName: user.name,
          resetUrl: url,
          expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    user: {
      additionalFields: {
        firstName: { type: "string", required: true, input: false },
        lastName: { type: "string", required: true, input: false },
        memberCode: { type: "string", required: true, input: false },
      },
    },
    rateLimit: {
      enabled: true,
      storage: "memory",
      window: 60,
      max: 30,
    },
    advanced: {
      useSecureCookies: process.env.NODE_ENV === "production",
      database: { joins: true },
    },
    plugins: [
      admin({ defaultRole: "STAFF", adminRoles: ["ADMIN"] }),
      nextCookies(),
    ],
  });
}

export type AppAuth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as { appAuth?: AppAuth };

export function getAuth(): AppAuth {
  globalForAuth.appAuth ??= createAuth();
  return globalForAuth.appAuth;
}
