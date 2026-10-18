import { expect, test, type Page } from "@playwright/test";

import { completePublicRegistration, login, resetFixtures, type ResetResult } from "./helpers";

const adminConfigured = Boolean(process.env.E2E_RESET_SECRET && process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);
const staffConfigured = Boolean(adminConfigured && process.env.E2E_STAFF_EMAIL && process.env.E2E_STAFF_PASSWORD);

test.describe("lista d'attesa deterministica", () => {
  test.skip(!adminConfigured, "Ambiente E2E amministrativo non configurato");
  let fixtures: ResetResult;

  test.beforeEach(async ({ page, request }) => {
    fixtures = await resetFixtures(request, "list");
    await login(page, "ADMIN");
  });

  test("verifica presentazione, filtri, ordine, paginazione e accessi amministrativi", async ({ page }) => {
    await page.goto("/lista-attesa");
    const expectedFirstPage = ["alice", "bruno", "carla", "diana", "enzo", ...Array.from({ length: 15 }, (_, index) => `filler${String(index + 1).padStart(2, "0")}`)]
      .map((key) => `/iscritti/${fixtures.applicants[key]}`);

    expect(await visibleApplicantHrefs(page)).toEqual(expectedFirstPage);
    await expect(page.getByText("Anno di nascita", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Femmina", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/01\/01\/2026.*10:00/).filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText("Pagina 1 di 2", { exact: true })).toBeVisible();

    await expectApplicants(page, "/lista-attesa?gender=F", ["alice", "diana"], fixtures);
    await expectApplicants(page, "/lista-attesa?birthYear=2018", ["alice", "carla"], fixtures);
    await expectApplicants(page, "/lista-attesa?status=ACCETTATO", ["diana"], fixtures);
    await expectApplicants(page, "/lista-attesa?gender=M&birthYear=2018&status=DA_CHIAMARE", ["carla"], fixtures);
    await expectApplicants(page, "/lista-attesa?query=Alpha", ["alice"], fixtures);
    await expectApplicants(page, "/lista-attesa?gender=F&status=IN_ATTESA", ["alice"], fixtures);

    await page.goto("/lista-attesa?page=2");
    expect(await visibleApplicantHrefs(page)).toEqual([
      `/iscritti/${fixtures.applicants.filler16}`,
      `/iscritti/${fixtures.applicants.filler17}`,
    ]);
    await expect(page.getByText("Pagina 2 di 2", { exact: true })).toBeVisible();

    for (const [url, heading] of [["/anno-associativo", "Anno associativo"], ["/statistiche", "Statistiche annuali"], ["/impostazioni", "Impostazioni"]] as const) {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  test("apre la modifica di un iscritto dal dettaglio", async ({ page }) => {
    const applicantId = fixtures.applicants.alice;

    await page.goto(`/iscritti/${applicantId}`);
    await expect(page.getByRole("heading", { name: "Alice Alpha" })).toBeVisible();

    await page.getByRole("link", { name: "Modifica" }).click();

    await expect(page).toHaveURL(`/iscritti/${applicantId}/modifica`);
    await expect(page.getByRole("heading", { name: "Modifica Alice Alpha" })).toBeVisible();
    await expect(page.getByLabel("Nome", { exact: true }).first()).toHaveValue("Alice");
  });

  test("mantiene i filtri quando si torna dal dettaglio", async ({ page }) => {
    await page.goto("/lista-attesa?gender=F&status=IN_ATTESA&page=1");
    await page.getByRole("link", { name: "Dettaglio" }).first().click();
    await page.getByRole("link", { name: "Modifica" }).click();
    await expect(page.getByRole("heading", { name: /Modifica Alice Alpha/ })).toBeVisible();
    await page.getByRole("link", { name: "Annulla modifica" }).click();
    const backToList = page.getByRole("main").getByRole("link", { name: "Lista d’attesa" });
    await expect(backToList).toHaveAttribute("href", "/lista-attesa?gender=F&status=IN_ATTESA&page=1");
    await backToList.click();
    await expect(page).toHaveURL(/\/lista-attesa\?gender=F&status=IN_ATTESA&page=1$/);
  });

  test("iscrive dal back office senza genitori o consenso privacy", async ({ page }) => {
    await page.goto("/iscritti/nuovo");
    await page.getByLabel("Nome", { exact: true }).fill("Nuovo");
    await page.getByLabel("Cognome", { exact: true }).fill("Parziale");
    await page.getByLabel("Data di nascita", { exact: true }).fill("2018-05-12");
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await expect(page.getByText("Consenso privacy cartaceo non registrato.")).toBeVisible();
    await page.getByRole("button", { name: "Conferma iscrizione" }).click();
    await expect(page.getByText("Iscrizione completata")).toBeVisible();
    await page.getByRole("link", { name: "Apri dettaglio" }).click();
    await expect(page.getByRole("heading", { name: "Nuovo Parziale" })).toBeVisible();
    await page.getByRole("link", { name: "Modifica" }).click();
    await expect(page.getByRole("heading", { name: "Modifica Nuovo Parziale" })).toBeVisible();
    await page.getByLabel("Note").fill("Aggiornamento con dati ancora incompleti");
    await confirm(page, "Salva modifiche", "Salva modifiche");
    await expect(page.getByText("Dati aggiornati correttamente.")).toBeVisible();
    await expect(page.getByText("Aggiornamento con dati ancora incompleti")).toBeVisible();
  });

  test("registra la firma cartacea e tenta la conferma all'email indicata", async ({ page }) => {
    await page.goto("/iscritti/nuovo");
    await page.getByLabel("Nome", { exact: true }).fill("Conferma");
    await page.getByLabel("Cognome", { exact: true }).fill("Cartacea");
    await page.getByLabel("Data di nascita", { exact: true }).fill("2018-05-12");
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByLabel("Email").fill("genitore.e2e@example.test");
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("button", { name: "Continua" }).click();
    await page.getByRole("checkbox", { name: /modulo cartaceo firmato/i }).check();
    await page.getByRole("button", { name: "Continua" }).click();
    await expect(page.getByText(/Consenso raccolto tramite modulo cartaceo/)).toBeVisible();
    await page.getByRole("button", { name: "Conferma iscrizione" }).click();
    await expect(page.getByText("Iscrizione completata")).toBeVisible();
    await expect(page.getByText("Iscrizione salvata, ma la mail di conferma non è partita.")).toBeVisible();
    await page.getByRole("link", { name: "Apri dettaglio" }).click();
    await expect(page.getByText("Non registrato", { exact: true })).toHaveCount(0);
  });

  test("invita un Capo senza Codice Socio", async ({ page }) => {
    await page.goto("/impostazioni");
    const form = page.getByRole("button", { name: "Invita Capo" }).locator("xpath=ancestor::form");
    await expect(form.getByLabel("Codice Socio")).toHaveCount(0);
    await form.getByLabel("Nome", { exact: true }).fill("Capo");
    await form.getByLabel("Cognome", { exact: true }).fill("Prova");
    await form.getByLabel("Email").fill("capo.prova@example.test");
    await form.getByRole("button", { name: "Invita Capo" }).click();
    await expect(page.getByText("Invito creato. Controlla lo stato di consegna email.")).toBeVisible();
    await expect(page.getByText("capo.prova@example.test")).toBeVisible();
  });
});

test.describe("ciclo completo chiamate", () => {
  test.skip(!adminConfigured, "Ambiente E2E amministrativo non configurato");

  test("crea l'anno, apre e chiude le chiamate salvando esiti e residui", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Scenario mutante eseguito una volta su desktop");
    const fixtures = await resetFixtures(request, "calls");
    await login(page, "ADMIN");

    await page.goto("/anno-associativo");
    await page.getByLabel("Anno iniziale").fill(String(fixtures.startYear));
    await confirm(page, "Crea nuovo anno", "Crea anno");
    await expect(page.getByText("Nuovo anno associativo creato con chiamate chiuse.")).toBeVisible();
    await confirm(page, "Apri chiamate", "Apri chiamate");

    await expectApplicants(page, "/lista-attesa?status=DA_CHIAMARE", ["eligibleLc", "eligibleEg", "eligibleRs"], fixtures);
    await expectApplicants(page, "/lista-attesa?query=NonEleggibile", ["ineligible"], fixtures);

    await completePublicRegistration(page, {
      birthYear: fixtures.startYear - 8,
      fiscalCode: "E2ENEW0000000001",
      firstName: "Nuova",
      lastName: "Eleggibile",
    });
    await page.goto("/lista-attesa?query=Nuova");
    await expect(page.getByText("Da chiamare", { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await page.goto(`/iscritti/${fixtures.applicants.eligibleLc}`);
    await confirm(page, "Accetta", "Accetta");
    await page.goto(`/iscritti/${fixtures.applicants.eligibleEg}`);
    await confirm(page, "Rifiuta", "Rifiuta");

    await page.goto("/anno-associativo");
    await confirm(page, "Chiudi chiamate", "Chiudi chiamate");
    await expect(page.getByText("Chiamate chiuse, statistiche salvate e residui riportati in attesa.")).toBeVisible();

    await expectApplicants(page, "/lista-attesa?status=ACCETTATO", ["eligibleLc"], fixtures);
    await expectApplicants(page, "/lista-attesa?status=RIFIUTATO", ["eligibleEg"], fixtures);
    await expectApplicants(page, "/lista-attesa?query=Rita", ["eligibleRs"], fixtures);
    await page.goto("/lista-attesa?query=Nuova");
    await expect(page.getByText("In attesa", { exact: true }).filter({ visible: true }).first()).toBeVisible();

    await page.goto("/statistiche");
    await expect(page.getByText(`${fixtures.startYear}/${fixtures.startYear + 1}`, { exact: true })).toBeVisible();
    await expect(page.getByText("Coinvolti", { exact: true }).locator("..")).toContainText("4");
    await expect(page.getByText("Accettati", { exact: true }).first().locator("..")).toContainText("1");
    await expect(page.getByText("Rifiutati", { exact: true }).first().locator("..")).toContainText("1");
    await expect(page.getByText("Inevasi", { exact: true }).first().locator("..")).toContainText("2");
  });
});

test.describe("autorizzazioni STAFF", () => {
  test.skip(!staffConfigured, "Credenziali STAFF E2E non configurate");

  test("consente la gestione iscritti e blocca funzioni amministrative", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chrome", "Matrice ruoli eseguita una volta su desktop");
    const fixtures = await resetFixtures(request, "list");
    await login(page, "STAFF");

    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await page.goto(`/iscritti/${fixtures.applicants.alice}`);
    await expect(page.getByRole("heading", { name: "Alice Alpha" })).toBeVisible();

    await page.getByRole("link", { name: "Modifica" }).click();
    await page.getByLabel("Note").fill("Aggiornato da STAFF E2E");
    await confirm(page, "Salva modifiche", "Salva modifiche");
    await expect(page.getByText("Dati aggiornati correttamente.")).toBeVisible();
    await confirm(page, "Da chiamare", "Da chiamare");
    await expect(page.getByText("Stato aggiornato correttamente.")).toBeVisible();
    await confirm(page, "Cancella definitivamente", "Cancella definitivamente");
    await expect(page).toHaveURL(/\/lista-attesa\?deleted=1$/);
    await expect(page.locator(`a[href^="/iscritti/${fixtures.applicants.alice}?"]`)).toHaveCount(0);

    for (const url of ["/anno-associativo", "/statistiche", "/impostazioni"]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { name: "Operazione non disponibile" })).toBeVisible();
    }
  });
});

async function visibleApplicantHrefs(page: Page) {
  return page.locator('a[href^="/iscritti/"]:visible').evaluateAll((links) =>
    links.map((link) => new URL((link as HTMLAnchorElement).href).pathname));
}

async function expectApplicants(page: Page, url: string, keys: string[], fixtures: ResetResult) {
  await page.goto(url);
  expect(await visibleApplicantHrefs(page)).toEqual(keys.map((key) => `/iscritti/${fixtures.applicants[key]}`));
}

async function confirm(page: Page, triggerLabel: string, confirmLabel: string) {
  await page.getByRole("button", { name: triggerLabel, exact: true }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel, exact: true }).click();
  await expect(dialog).toBeHidden();
}
