import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PrivacyConsentStep } from "./privacy-consent-step";

describe("PrivacyConsentStep", () => {
  it("mostra il PDF prima del consenso nello stesso passaggio", () => {
    const html = renderToStaticMarkup(
      <PrivacyConsentStep
        policy={{ version: "2026.2", fileUrl: "https://documenti.example.org/privacy.pdf" }}
        registration={{ name: "privacyAccepted", onBlur: async () => undefined, onChange: async () => undefined, ref: () => undefined }}
      />,
    );

    const documentPosition = html.indexOf("<iframe");
    const consentPosition = html.indexOf('name="privacyAccepted"');
    expect(documentPosition).toBeGreaterThan(-1);
    expect(consentPosition).toBeGreaterThan(documentPosition);
    expect(html).toContain("Ho letto e accetto l’informativa privacy versione 2026.2");
  });
});
