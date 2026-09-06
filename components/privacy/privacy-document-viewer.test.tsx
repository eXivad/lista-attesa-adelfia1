import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PrivacyDocumentViewer } from "./privacy-document-viewer";

describe("PrivacyDocumentViewer", () => {
  it("incorpora il PDF e mantiene un collegamento alternativo", () => {
    const html = renderToStaticMarkup(
      <PrivacyDocumentViewer
        fileUrl="https://documenti.example.org/privacy.pdf"
        version="2026.2"
      />,
    );

    expect(html).toContain('<iframe');
    expect(html).toContain('src="https://documenti.example.org/privacy.pdf"');
    expect(html).toContain('title="Informativa privacy versione 2026.2"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain("Apri a schermo intero");
  });
});
