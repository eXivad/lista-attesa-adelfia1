import { describe, expect, it } from "vitest";

import {
  acceptanceConfirmationMail,
  diagnosticMail,
  passwordResetMail,
  registrationConfirmationMail,
  rejectionConfirmationMail,
  staffInvitationMail,
} from "./gmail-mail-templates";

const options = { organizationName: "AGESCI Adelfia 1" };
const registration = {
  applicantName: "Mario <script>alert('x')</script> Rossi",
  registrationNumber: "LA-2026-000123",
  recipients: ["famiglia@example.it"],
};

describe("template email Gmail", () => {
  it("genera conferma, accettazione e rifiuto in testo semplice e HTML sicuro", () => {
    const messages = [
      registrationConfirmationMail(registration, options),
      acceptanceConfirmationMail(registration, options),
      rejectionConfirmationMail(registration, options),
    ];

    for (const message of messages) {
      expect(message.subject).toContain("LA-2026-000123");
      expect(message.text).toContain("Mario <script>alert('x')</script> Rossi");
      expect(message.html).toContain("Mario &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; Rossi");
      expect(message.html).not.toContain("<script>");
      expect(message.html).not.toContain("<img");
    }
  });

  it("genera invito e reset con link HTTPS visibili e scadenza", () => {
    const expiresAt = new Date("2026-09-05T18:00:00Z");
    const invitation = staffInvitationMail({
      recipient: "capo@example.it",
      staffName: "Capo Uno",
      invitationUrl: "https://app.example.it/invito/token",
      expiresAt,
    }, options);
    const reset = passwordResetMail({
      recipient: "capo@example.it",
      staffName: "Capo Uno",
      resetUrl: "https://app.example.it/reset/token",
      expiresAt,
    }, options);

    expect(invitation.text).toContain("https://app.example.it/invito/token");
    expect(invitation.html).toContain("https://app.example.it/invito/token");
    expect(reset.text).toContain("https://app.example.it/reset/token");
    expect(reset.html).toContain("Reimposta la password");
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

  it("genera un messaggio diagnostico privo di tracking remoto", () => {
    const message = diagnosticMail(options);
    expect(message.subject).toContain("Test configurazione email");
    expect(message.text).toContain("SPF, DKIM e DMARC");
    expect(message.html).not.toContain("<img");
  });
});
