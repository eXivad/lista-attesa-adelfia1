import { expect, test } from "@playwright/test";

test.describe("backoffice configurato", () => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Credenziali E2E non configurate");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Accedi" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("admin accede a lista, anno associativo e impostazioni", async ({ page }) => {
    await page.goto("/lista-attesa?status=IN_ATTESA");
    await expect(page.getByRole("heading", { name: "Lista d’attesa" })).toBeVisible();
    await expect(page.getByText(/ordine cronologico/i)).toBeVisible();

    await page.goto("/anno-associativo");
    await expect(page.getByRole("heading", { name: "Anno associativo" })).toBeVisible();
    await page.goto("/impostazioni");
    await expect(page.getByRole("heading", { name: "Impostazioni" })).toBeVisible();
  });
});
