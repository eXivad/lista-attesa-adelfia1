import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { BackofficeShell } from "./backoffice-shell";

describe("BackofficeShell", () => {
  it("offre navigazione con icone e controlli desktop/mobile accessibili", () => {
    const html = renderToStaticMarkup(
      <BackofficeShell
        user={{ name: "Mario Rossi", role: "ADMIN" }}
        groupName="AGESCI Adelfia 1"
        logoUrl={null}
      >
        <p>Contenuto</p>
      </BackofficeShell>,
    );

    expect(html).toContain('aria-label="Apri navigazione"');
    expect(html).toContain('aria-label="Comprimi navigazione"');
    expect(html).toContain("Dashboard");
    expect(html).toContain("Lista d’attesa");
    expect(html).toContain("Impostazioni");
    expect(html).toContain("Gruppo AGESCI Adelfia 1");
    expect(html).not.toContain("Gruppo AGESCI AGESCI Adelfia 1");
    expect(html).not.toContain(">A1<");
  });

  it("non propone Impostazioni a un Capo STAFF", () => {
    const html = renderToStaticMarkup(
      <BackofficeShell
        user={{ name: "Anna Verdi", role: "STAFF" }}
        groupName="AGESCI Adelfia 1"
        logoUrl={null}
      >
        <p>Contenuto</p>
      </BackofficeShell>,
    );

    expect(html).not.toContain("Impostazioni");
    expect(html).not.toContain("Anno associativo");
    expect(html).not.toContain("Statistiche");
  });
});
