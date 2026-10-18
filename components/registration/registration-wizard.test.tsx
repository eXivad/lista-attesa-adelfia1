import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RegistrationWizard } from "./registration-wizard";

describe("RegistrationWizard", () => {
  it("mostra il percorso interno con passaggio privacy cartacea", () => {
    const html = renderToStaticMarkup(
      <RegistrationWizard mode="backoffice" privacyPolicy={{ version: "2026.1", fileUrl: "/privacy" }} submitAction={async () => ({ status: "idle" })} />,
    );
    expect(html).toContain("Nuova iscrizione dalla segreteria");
    expect(html).toContain("i genitori sono facoltativi");
    expect(html).toContain("Privacy");
    expect(html).not.toContain("informativa privacy completa");
  });

  it("presenta il percorso completo e il primo step in modo accessibile", () => {
    const html = renderToStaticMarkup(
      <RegistrationWizard
        privacyPolicy={{ version: "2026.1", fileUrl: "/privacy" }}
        submitAction={async () => ({ status: "idle" })}
      />,
    );

    expect(html).toContain("Modulo di Pre-Iscrizione al Gruppo");
    expect(html).toContain("Dati del minore");
    expect(html).toContain("Genitore A");
    expect(html).toContain("Genitore B");
    expect(html).toContain("Privacy");
    expect(html).toContain("Riepilogo");
    expect(html).toContain("Conferma");
    expect(html).toContain('for="minor.firstName"');
    expect(html).toContain('for="minor.residenceAddress"');
    expect(html).toContain('for="minor.residenceCity"');
    expect(html).toContain('for="minor.residenceProvince"');
    expect(html).toContain('for="minor.residencePostalCode"');
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('aria-label="Avanzamento iscrizione"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("informativa privacy completa, versione 2026.1");
  });
});
