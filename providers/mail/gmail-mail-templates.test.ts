import { describe, expect, it } from "vitest";

import {
  acceptanceConfirmationMail,
  diagnosticMail,
  passwordResetMail,
  registrationConfirmationMail,
  rejectionConfirmationMail,
  staffInvitationMail,
} from "./gmail-mail-templates";

const options = {
  organizationName: "AGESCI Adelfia 1",
  logoCid: "logo-lista-attesa@agesci",
};
const registration = {
  applicantName: "Mario <script>alert('x')</script> Rossi",
  applicantBirthDate: new Date("2018-05-12T00:00:00.000Z"),
  registrationNumber: "LA-2026-000123",
  recipients: ["famiglia@example.it"],
  bccRecipients: [],
};

describe("template email React Email", () => {
  it("riproduce il testo completo della conferma di inserimento in lista", async () => {
    const message = await registrationConfirmationMail(registration, options);

    expect(message.text).toContain("Lista d’Attesa - AGESCI\nAGESCI Adelfia 1");
    expect(message.text).toContain(
      "vi confermiamo di aver ricevuto correttamente la richiesta di inserimento nella lista d’attesa del Gruppo AGESCI Adelfia 1 relativa a:",
    );
    expect(message.text).toContain(
      "Mario <script>alert('x')</script> Rossi, nato/a il 12 maggio 2018",
    );
    expect(message.text).toContain(
      "La richiesta sarà presa in carico dalla Comunità Capi e dalle singole Staff e sarà valutata in base all’anno di nascita del minore, all’ordine cronologico di ricezione e alla disponibilità di posti nella branca di riferimento.",
    );
    expect(message.text).toContain(
      "Vi ricordiamo che la compilazione del modulo non comporta l’iscrizione automatica ad AGESCI e non garantisce la disponibilità di un posto.",
    );
    expect(message.text).toContain("https://gruppi.agesci.it/adelfia1/contatti/");
    expect(message.text).toContain("Cordiali saluti,\nAGESCI Adelfia 1");
  });

  it("mostra logo incorporato, intestazione e dati dinamici in grassetto senza consentire HTML", async () => {
    const message = await registrationConfirmationMail(registration, options);

    expect(message.html).toContain('src="cid:logo-lista-attesa@agesci"');
    expect(message.html).toContain('alt="Logo AGESCI Adelfia 1"');
    expect(message.html).toContain("Lista d’Attesa - AGESCI");
    expect(message.html).toContain("<strong>AGESCI Adelfia 1</strong>");
    expect(message.html).toContain(
      "<strong>Mario &lt;script&gt;alert(",
    );
    expect(message.html).toContain("&lt;/script&gt; Rossi</strong>");
    expect(message.html).toContain("<strong>12 maggio 2018</strong>");
    expect(message.html).not.toContain("<script>");
  });

  it("evidenzia i dati principali e firma tutti i flussi con il nome del Gruppo", async () => {
    const expiresAt = new Date("2026-09-05T18:00:00Z");
    const messages = await Promise.all([
      registrationConfirmationMail(registration, options),
      acceptanceConfirmationMail(registration, options),
      rejectionConfirmationMail(registration, options),
      staffInvitationMail({
        recipient: "capo@example.it",
        staffName: "Capo Uno",
        invitationUrl: "https://app.example.it/invito/token",
        expiresAt,
      }, options),
      passwordResetMail({
        recipient: "capo@example.it",
        staffName: "Capo Uno",
        resetUrl: "https://app.example.it/reset/token",
        expiresAt,
      }, options),
      diagnosticMail(options),
    ]);

    for (const message of messages) {
      expect(message.text).toContain("Cordiali saluti,\nAGESCI Adelfia 1");
      expect(message.html).toMatch(/Cordiali saluti,<br\/?><strong>AGESCI Adelfia 1<\/strong>/);
    }
    expect(messages[1].html).toContain(
      "<strong>accettazione del posto proposto </strong>",
    );
    expect(messages[1].html).toContain(
      "<strong>Mario &lt;script&gt;alert(",
    );
    expect(messages[3].html).toContain("<strong>Capo Uno</strong>");
    expect(messages[3].html).toContain("<strong>5 settembre 2026 alle ore 20:00</strong>");
    expect(messages[3].text).toContain("https://app.example.it/invito/token");
    expect(messages[4].html).toContain("https://app.example.it/reset/token");
  });

  it("usa il nome dinamico del Gruppo anche nel testo dell'accettazione", async () => {
    const message = await acceptanceConfirmationMail(registration, {
      ...options,
      organizationName: "AGESCI Bari 42",
    });

    expect(message.text).toContain(
      "presso il Gruppo Scout AGESCI Bari 42.",
    );
    expect(message.html).toContain(
      "presso il Gruppo Scout <strong>AGESCI Bari 42</strong>.",
    );
    expect(message.text).not.toContain("Gruppo Scout AGESCI Adelfia 1");
  });

  it("consente HTTP soltanto per lo sviluppo locale e rifiuta URL con credenziali", async () => {
    const renderInvitation = (invitationUrl: string) => Promise.resolve().then(() =>
      staffInvitationMail({
        recipient: "capo@example.it",
        staffName: "Capo Uno",
        invitationUrl,
        expiresAt: new Date(),
      }, options));

    await expect(renderInvitation("http://localhost:3000/invito/token"))
      .resolves.toEqual(expect.objectContaining({ subject: expect.any(String) }));
    await expect(renderInvitation("http://example.it/invito/token"))
      .rejects.toThrow("HTTPS");
    await expect(renderInvitation("https://user:password@example.it/invito/token"))
      .rejects.toThrow("credenziali");
  });

  it("genera il messaggio diagnostico senza immagine se non è stato configurato un logo", async () => {
    const message = await diagnosticMail({ organizationName: options.organizationName });
    expect(message.subject).toContain("Test configurazione email");
    expect(message.text).toContain("SPF, DKIM e DMARC");
    expect(message.html).not.toContain("<img");
  });

  it("renderizza un documento completo con preheader e primitive compatibili React Email", async () => {
    const message = await registrationConfirmationMail(registration, options);

    expect(message.html).toContain(
      '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"',
    );
    expect(message.html).toContain('data-skip-in-text="true"');
    expect(message.html).toContain('role="presentation"');
    expect(message.text).not.toContain("Richiesta ricevuta — AGESCI Adelfia 1");
  });

  it("dichiara e applica una palette scura controllata senza invertire i colori del logo", async () => {
    const message = await registrationConfirmationMail(registration, options);

    expect(message.html).toContain(
      '<meta name="color-scheme" content="light dark">',
    );
    expect(message.html).toContain(
      '<meta name="supported-color-schemes" content="light dark">',
    );
    expect(message.html).toContain("@media (prefers-color-scheme:dark)");
    expect(message.html).toContain(
      ".email-body,.email-page{background-color:#111827!important}",
    );
    expect(message.html).toContain(
      ".email-card,.email-content{background-color:#1c1917!important}",
    );
    expect(message.html).toContain(
      ".email-content,.email-heading,.email-copy{color:#f5f5f4!important}",
    );
    expect(message.html).toContain(
      ".email-logo{background-color:#fafaf9!important;background-image:linear-gradient(#fafaf9,#fafaf9)!important}",
    );
    expect(message.html).toContain(
      "[data-ogsc] .email-card,[data-ogsc] .email-content{background-color:#1c1917!important}",
    );
  });

  it("protegge soltanto intestazione e pulsanti dalla full inversion di Gmail iOS", async () => {
    const message = await diagnosticMail(options);

    expect(message.html).toContain("<!DOCTYPE html>");
    expect(message.html).toContain('<body class="email-body"');
    expect(message.html).toContain(
      "u + .email-body .gmail-blend-screen{background:#000000;mix-blend-mode:screen}",
    );
    expect(message.html).toContain(
      "u + .email-body .gmail-blend-difference{background:#000000;mix-blend-mode:difference}",
    );
    expect(message.html).toContain('class="email-header"');
    expect(message.html).toContain(
      "background-image:linear-gradient(#4c1d95,#4c1d95)",
    );
    expect(message.html.match(/class="gmail-blend-screen"/g)).toHaveLength(1);
    expect(message.html.match(/class="gmail-blend-difference"/g)).toHaveLength(1);
    expect(message.html).toContain('class="email-content"');
    expect(message.html).toContain(
      'class="email-heading" style="margin:0 0 24px;color:#292524',
    );
    expect(message.html).toContain(
      "background-image:linear-gradient(#fafaf9,#fafaf9)",
    );
    expect(message.html).not.toContain("@media only screen and (max-width:");
  });

  it("protegge il testo bianco del pulsante senza bloccare il resto del contenuto", async () => {
    const message = await staffInvitationMail({
      recipient: "capo@example.it",
      staffName: "Capo Uno",
      invitationUrl: "https://app.example.it/invito/token",
      expiresAt: new Date("2026-09-05T18:00:00Z"),
    }, options);

    expect(message.html.match(/class="gmail-blend-screen"/g)).toHaveLength(2);
    expect(message.html.match(/class="gmail-blend-difference"/g)).toHaveLength(2);
    expect(message.html).toContain('class="email-button"');
    expect(message.html).toContain('href="https://app.example.it/invito/token"');
    expect(message.html).toContain(
      "background-image:linear-gradient(#4c1d95,#4c1d95)",
    );
    expect(message.html).toContain('class="email-link"');
    expect(message.html).toContain("mso-text-raise:");
  });
});
