import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

import { resetFixtures } from "./helpers";

test.beforeAll(async ({ request }) => {
  await resetFixtures(request, "list");
});

test("la radice porta il visitatore anonimo direttamente all'iscrizione", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/iscrizione$/);
  await expect(page.locator("header").getByText("Istanza di Pre-Iscrizione al Gruppo", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /torna alla home/i })).toHaveCount(0);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("pagina iscrizione espone il form con privacy configurata", async ({ page }) => {
  await page.goto("/iscrizione");
  await expect(page.getByRole("heading", { name: "Dati del minore" })).toBeVisible();
});

test("un visitatore anonimo non può accedere al backoffice", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  await expect(page.getByRole("heading", { name: /Accedi all.area Capi/ })).toBeVisible();
});

test("completa l'iscrizione pubblica in sei passi", async ({ page }) => {
  test.slow();
  const suffix = Date.now().toString(36).toUpperCase().padStart(13, "0").slice(-13);
  const minorFiscalCode = `E2E${suffix}`;

  await page.goto("/iscrizione");
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Nome", { exact: true }).fill("Mario");
  await page.getByLabel("Cognome", { exact: true }).fill("Rossi");
  await page.getByLabel("Data di nascita", { exact: true }).fill("2018-05-12");
  await page.getByLabel("Luogo di nascita", { exact: true }).fill("Bari");
  await page.getByLabel("Provincia di nascita", { exact: true }).fill("BA");
  await page.getByLabel("Codice Fiscale", { exact: true }).fill(minorFiscalCode);
  await page.getByLabel("Indirizzo di residenza").fill("Via Roma 1");
  await page.getByLabel("Comune di residenza").fill("Adelfia");
  await page.getByLabel("Provincia di residenza").fill("BA");
  await page.getByLabel("CAP", { exact: true }).fill("70010");
  await page.getByRole("button", { name: "Continua" }).click();

  await fillGuardian(page, {
    firstName: "Anna",
    lastName: "Verdi",
    fiscalCode: "VRDNNA85C41A662Z",
    email: `anna.${suffix.toLowerCase()}@example.it`,
  });
  await page.getByRole("button", { name: "Continua" }).click();

  await fillGuardian(page, {
    firstName: "Luigi",
    lastName: "Rossi",
    fiscalCode: "RSSLGU83M22A662Y",
    email: `luigi.${suffix.toLowerCase()}@example.it`,
  });
  await page.getByRole("button", { name: "Continua" }).click();

  await page.getByRole("checkbox", { name: /Dichiaro di aver letto e compreso/ }).check();
  await page.getByRole("button", { name: "Continua" }).click();
  await expect(page.getByRole("heading", { name: "Riepilogo" })).toBeVisible();
  const submitButton = page.getByRole("button", { name: "Conferma iscrizione" });
  await expect(submitButton).toBeVisible();
  await submitButton.click();

  await expect(page.getByText("Iscrizione completata")).toBeVisible();
  await expect(page.getByText(/^LA-\d{4}-\d{6}$/)).toBeVisible();
});

async function fillGuardian(
  page: Page,
  guardian: { firstName: string; lastName: string; fiscalCode: string; email: string },
) {
  await page.getByLabel("Nome", { exact: true }).fill(guardian.firstName);
  await page.getByLabel("Cognome", { exact: true }).fill(guardian.lastName);
  await page.getByLabel("Data di nascita", { exact: true }).fill("1985-03-01");
  await page.getByLabel("Luogo di nascita", { exact: true }).fill("Bari");
  await page.getByLabel("Provincia di nascita", { exact: true }).fill("BA");
  await page.getByLabel("Codice Fiscale", { exact: true }).fill(guardian.fiscalCode);
  await page.getByLabel("Indirizzo di residenza").fill("Via Roma 1");
  await page.getByLabel("Comune di residenza").fill("Adelfia");
  await page.getByLabel("Provincia di residenza").fill("BA");
  await page.getByLabel("CAP", { exact: true }).fill("70010");
  await page.getByLabel("Email").fill(guardian.email);
  await page.getByLabel("Cellulare").fill("+39 333 1234567");
}
