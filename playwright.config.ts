import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:3000";
const healthCheckURL = new URL("/api/health", baseURL).toString();
const disabledMailEnvironment = {
  GMAIL_USER: "e2e-disabled@example.org",
  GMAIL_OAUTH_CLIENT_ID: " ",
  GMAIL_OAUTH_CLIENT_SECRET: " ",
  GMAIL_OAUTH_REFRESH_TOKEN: " ",
  MAIL_REPLY_TO: "e2e-disabled@example.org",
} as const;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "node node_modules/next/dist/bin/next start",
    url: healthCheckURL,
    // Keep E2E runs isolated from any real Gmail credentials loaded from a local .env.
    // Whitespace values remain present in the child environment, then trim to an
    // intentionally unconfigured OAuth client in the server-side environment schema.
    env: disabledMailEnvironment,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
