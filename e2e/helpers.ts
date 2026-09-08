import { expect, type APIRequestContext, type Page } from "@playwright/test";

export interface ResetResult {
  scenario: "list" | "calls";
  startYear: number;
  applicants: Record<string, string>;
}

export async function resetFixtures(request: APIRequestContext, scenario: ResetResult["scenario"]) {
  const response = await request.post("/api/e2e/reset", {
    data: { scenario },
    headers: { "x-e2e-reset-secret": process.env.E2E_RESET_SECRET ?? "" },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json() as Promise<ResetResult>;
}

export async function login(page: Page, role: "ADMIN" | "STAFF") {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env[`E2E_${role}_PASSWORD`];
  if (!email || !password) throw new Error(`Credenziali E2E ${role} non configurate.`);
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const submit = page.getByRole("button", { name: "Accedi" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const responsePromise = page.waitForResponse((response) => response.url().includes("/api/auth/sign-in/email"));
    await submit.click();
    const response = await responsePromise;
    if (response.status() !== 429) break;

    const retryAfter = Number(response.headers()["x-retry-after"] ?? "10");
    await page.waitForTimeout((Math.max(1, retryAfter) + 1) * 1_000);
  }
  await expect(page).toHaveURL(/\/dashboard/);
}

export async function completePublicRegistration(page: Page, input: { birthYear: number; fiscalCode: string; firstName?: string; lastName?: string }) {
  await page.goto("/iscrizione");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Nome", { exact: true }).fill(input.firstName ?? "Nuova");
  await page.getByLabel("Cognome", { exact: true }).fill(input.lastName ?? "Iscrizione");
  await page.getByLabel("Data di nascita", { exact: true }).fill(`${input.birthYear}-05-12`);
  await page.getByLabel("Luogo di nascita", { exact: true }).fill("Bari");
  await page.getByLabel("Provincia di nascita", { exact: true }).fill("BA");
  await page.getByLabel("Codice Fiscale", { exact: true }).fill(input.fiscalCode);
  await page.getByLabel("Indirizzo di residenza").fill("Via Nuova 10");
  await page.getByLabel("Comune di residenza").fill("Adelfia");
  await page.getByLabel("Provincia di residenza").fill("BA");
  await page.getByLabel("CAP", { exact: true }).fill("70010");
  await page.getByRole("button", { name: "Continua" }).click();

  await fillGuardian(page, "Anna", "Verdi", "VRDNNA85C41A662Z", "anna.e2e@example.test");
  await page.getByRole("button", { name: "Continua" }).click();
  await fillGuardian(page, "Luigi", "Rossi", "RSSLGU83M22A662Y", "luigi.e2e@example.test");
  await page.getByRole("button", { name: "Continua" }).click();

  await page.getByRole("checkbox", { name: /informativa privacy/i }).check();
  await page.getByRole("button", { name: "Continua" }).click();
  await page.getByRole("button", { name: "Conferma iscrizione" }).click();
  await expect(page.getByText("Iscrizione completata")).toBeVisible();
}

async function fillGuardian(page: Page, firstName: string, lastName: string, fiscalCode: string, email: string) {
  await page.getByLabel("Nome", { exact: true }).fill(firstName);
  await page.getByLabel("Cognome", { exact: true }).fill(lastName);
  await page.getByLabel("Data di nascita", { exact: true }).fill("1985-03-01");
  await page.getByLabel("Luogo di nascita", { exact: true }).fill("Bari");
  await page.getByLabel("Provincia di nascita", { exact: true }).fill("BA");
  await page.getByLabel("Codice Fiscale", { exact: true }).fill(fiscalCode);
  await page.getByLabel("Indirizzo di residenza").fill("Via Roma 1");
  await page.getByLabel("Comune di residenza").fill("Adelfia");
  await page.getByLabel("Provincia di residenza").fill("BA");
  await page.getByLabel("CAP", { exact: true }).fill("70010");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Cellulare").fill("+39 333 1234567");
}
