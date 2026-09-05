import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RegistrationWizard } from "./registration-wizard";

describe("RegistrationWizard", () => {
  it("presenta il percorso completo e il primo step in modo accessibile", () => {
    const html = renderToStaticMarkup(
      <RegistrationWizard
        privacyPolicy={{ version: "2026.1", fileUrl: "/privacy" }}
        groupName="Gruppo Scout"
        submitAction={async () => ({ status: "idle" })}
      />,
    );

    expect(html).toContain("Iscrizione alla lista d’attesa");
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
    expect(html).toContain("Informativa privacy versione 2026.1");
  });
});
