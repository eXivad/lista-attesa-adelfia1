import { describe, expect, it } from "vitest";

import { branchConfigurationsSchema } from "./branch-configuration";

const valid = [
  { branch: "LC", minAge: 8, maxAge: 11, entryAge: 8 },
  { branch: "EG", minAge: 12, maxAge: 15, entryAge: 12 },
  { branch: "RS", minAge: 16, maxAge: 21, entryAge: 16 },
];

describe("configurazione branche", () => {
  it("accetta le tre branche complete e ordinate", () => {
    expect(branchConfigurationsSchema.parse(valid)).toEqual(valid);
  });

  it("nega branche mancanti, età d'ingresso fuori intervallo o fasce sovrapposte", () => {
    expect(branchConfigurationsSchema.safeParse(valid.slice(0, 2)).success).toBe(false);
    expect(branchConfigurationsSchema.safeParse(valid.map((row, index) => index === 0 ? { ...row, entryAge: 20 } : row)).success).toBe(false);
    expect(branchConfigurationsSchema.safeParse(valid.map((row, index) => index === 1 ? { ...row, minAge: 10 } : row)).success).toBe(false);
  });

  it("non accetta il colore come configurazione mutabile", () => {
    const parsed = branchConfigurationsSchema.parse(valid.map((row) => ({ ...row, colorHex: "#000000" })));
    expect(parsed.every((row) => !("colorHex" in row))).toBe(true);
  });
});
