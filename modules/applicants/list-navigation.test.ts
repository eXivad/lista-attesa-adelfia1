import { expect, it } from "vitest";

import { detailHref, listHref, listQueryFromSearchParams } from "./list-navigation";

it("conserva filtri e pagina attraverso dettaglio e modifica", () => {
  const query = listQueryFromSearchParams({
    from: "query=Mario&gender=M&status=IN_ATTESA&page=3&updated=1&evil=ignored",
  });
  expect(listHref(query)).toBe("/lista-attesa?query=Mario&gender=M&status=IN_ATTESA&page=3");
  expect(detailHref("abc", query, "updated")).toBe(
    "/iscritti/abc?from=query%3DMario%26gender%3DM%26status%3DIN_ATTESA%26page%3D3&updated=1",
  );
});
