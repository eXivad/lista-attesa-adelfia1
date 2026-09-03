import { describe, expect, it } from "vitest";

import { applicantListQuerySchema } from "./list-query";

describe("filtri lista d'attesa", () => {
  it("normalizza filtri e pagina entro limiti sicuri", () => {
    expect(
      applicantListQuerySchema.parse({
        gender: "F",
        birthYear: "2018",
        status: "IN_ATTESA",
        query: "  Rossi  ",
        page: "2",
      }),
    ).toEqual({ gender: "F", birthYear: 2018, status: "IN_ATTESA", query: "Rossi", page: 2, pageSize: 20 });
  });

  it("ignora ordinamenti arbitrari e corregge valori fuori intervallo", () => {
    expect(applicantListQuerySchema.parse({ sort: "lastName", page: "-2", birthYear: "abc" })).toEqual({
      page: 1,
      pageSize: 20,
    });
  });
});
