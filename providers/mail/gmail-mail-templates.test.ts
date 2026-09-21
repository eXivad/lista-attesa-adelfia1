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

describe("template email Gmail", () => {
  it("riproduce il testo completo della conferma di inserimento in lista", () => {
    const message = registrationConfirmationMail(registration, options);

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

  it("mostra logo incorporato, intestazione e dati dinamici in grassetto senza consentire HTML", () => {
    const message = registrationConfirmationMail(registration, options);

    expect(message.html).toContain('src="cid:logo-lista-attesa@agesci"');
    expect(message.html).toContain('alt="Logo AGESCI Adelfia 1"');
    expect(message.html).toContain("Lista d’Attesa - AGESCI");
    expect(message.html).toContain("<strong>AGESCI Adelfia 1</strong>");
    expect(message.html).toContain(
      "<strong>Mario &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; Rossi</strong>",
    );
    expect(message.html).toContain("<strong>12 maggio 2018</strong>");
    expect(message.html).not.toContain("<script>");
  });

  it("evidenzia i dati principali e firma tutti i flussi con il nome del Gruppo", () => {
    const expiresAt = new Date("2026-09-05T18:00:00Z");
    const messages = [
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
    ];

    for (const message of messages) {
      expect(message.text).toContain("Cordiali saluti,\nAGESCI Adelfia 1");
      expect(message.html).toContain("Cordiali saluti,<br><strong>AGESCI Adelfia 1</strong>");
    }
    expect(messages[1].html).toContain(
      "<strong>accettazione del posto proposto </strong>",
    );
    expect(messages[1].html).toContain(
      "<strong>Mario &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; Rossi</strong>",
    );
    expect(messages[3].html).toContain("<strong>Capo Uno</strong>");
    expect(messages[3].html).toContain("<strong>5 settembre 2026 alle ore 20:00</strong>");
    expect(messages[3].text).toContain("https://app.example.it/invito/token");
    expect(messages[4].html).toContain("https://app.example.it/reset/token");
  });

  it("usa il nome dinamico del Gruppo anche nel testo dell'accettazione", () => {
    const message = acceptanceConfirmationMail(registration, {
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

  it("consente HTTP soltanto per lo sviluppo locale e rifiuta URL con credenziali", () => {
    expect(() => staffInvitationMail({
      recipient: "capo@example.it",
      staffName: "Capo Uno",
      invitationUrl: "http://localhost:3000/invito/token",
      expiresAt: new Date(),
    }, options)).not.toThrow();

    expect(() => staffInvitationMail({
      recipient: "capo@example.it",
      staffName: "Capo Uno",
      invitationUrl: "http://example.it/invito/token",
      expiresAt: new Date(),
    }, options)).toThrow("HTTPS");

    expect(() => staffInvitationMail({
      recipient: "capo@example.it",
      staffName: "Capo Uno",
      invitationUrl: "https://user:password@example.it/invito/token",
      expiresAt: new Date(),
    }, options)).toThrow("credenziali");
  });

  it("genera il messaggio diagnostico senza immagine se non è stato configurato un logo", () => {
    const message = diagnosticMail({ organizationName: options.organizationName });
    expect(message.subject).toContain("Test configurazione email");
    expect(message.text).toContain("SPF, DKIM e DMARC");
    expect(message.html).not.toContain("<img");
  });

  it("dichiara e applica una palette scura controllata senza invertire i colori del logo", () => {
    const message = registrationConfirmationMail(registration, options);

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

  it("protegge soltanto intestazione e pulsanti dalla full inversion di Gmail iOS", () => {
    const message = diagnosticMail(options);

    expect(message.html).toContain("<!DOCTYPE html>");
    expect(message.html).toContain('<body class="email-body"');
    expect(message.html).toContain(
      "u + .email-body .gmail-blend-screen{background:#000000;mix-blend-mode:screen}",
    );
    expect(message.html).toContain(
      "u + .email-body .gmail-blend-difference{background:#000000;mix-blend-mode:difference}",
    );
    expect(message.html).toContain('class="email-header" bgcolor="#4c1d95"');
    expect(message.html).toContain(
      "background-image:linear-gradient(#4c1d95,#4c1d95)",
    );
    expect(message.html.match(/class="gmail-blend-screen"/g)).toHaveLength(1);
    expect(message.html.match(/class="gmail-blend-difference"/g)).toHaveLength(1);
    expect(message.html).toContain('class="email-content" bgcolor="#fafaf9"');
    expect(message.html).toContain(
      'class="email-heading" style="margin:0 0 24px;color:#292524',
    );
    expect(message.html).toContain(
      "background-image:linear-gradient(#fafaf9,#fafaf9)",
    );
    expect(message.html).not.toContain("@media only screen and (max-width:");
  });

  it("protegge il testo bianco del pulsante senza bloccare il resto del contenuto", () => {
    const message = staffInvitationMail({
      recipient: "capo@example.it",
      staffName: "Capo Uno",
      invitationUrl: "https://app.example.it/invito/token",
      expiresAt: new Date("2026-09-05T18:00:00Z"),
    }, options);

    expect(message.html.match(/class="gmail-blend-screen"/g)).toHaveLength(2);
    expect(message.html.match(/class="gmail-blend-difference"/g)).toHaveLength(2);
    expect(message.html).toContain(
      '<td class="email-button-cell" bgcolor="#4c1d95"',
    );
    expect(message.html).toContain(
      "background-color:#4c1d95;background-image:linear-gradient(#4c1d95,#4c1d95);border-radius:8px",
    );
    expect(message.html).toContain(
      '<a class="email-button" href="https://app.example.it/invito/token" style="display:block;color:#ffffff',
    );
    expect(message.html).toContain(
      '<a class="email-link" href="https://app.example.it/invito/token" style="color:#4c1d95',
    );
  });
});
