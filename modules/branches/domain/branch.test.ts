import { describe, expect, it } from "vitest";

import {
  BRANCH_COLORS,
  calculateBranch,
  getEntryBirthYears,
  type BranchConfiguration,
} from "./branch";

const configuration: BranchConfiguration[] = [
  { branch: "LC", minAge: 8, maxAge: 11, entryAge: 8 },
  { branch: "EG", minAge: 12, maxAge: 15, entryAge: 12 },
  { branch: "RS", minAge: 16, maxAge: 21, entryAge: 16 },
];

describe("branche", () => {
  it("calcola la branca dall'età associativa ignorando giorno e mese di nascita", () => {
    expect(calculateBranch(2018, 2026, configuration)).toBe("LC");
    expect(calculateBranch(2015, 2026, configuration)).toBe("LC");
    expect(calculateBranch(2014, 2026, configuration)).toBe("EG");
    expect(calculateBranch(2011, 2026, configuration)).toBe("EG");
    expect(calculateBranch(2010, 2026, configuration)).toBe("RS");
    expect(calculateBranch(2005, 2026, configuration)).toBe("RS");
    expect(calculateBranch(2019, 2026, configuration)).toBeNull();
    expect(calculateBranch(2004, 2026, configuration)).toBeNull();
  });

  it("non assegna una branca senza un anno associativo corrente", () => {
    expect(calculateBranch(2018, null, configuration)).toBeNull();
  });

  it("calcola gli anni di ingresso usando soltanto startYear ed entryAge", () => {
    expect(getEntryBirthYears(2026, configuration)).toEqual({ LC: 2018, EG: 2014, RS: 2010 });
  });

  it("espone la palette AGESCI fissa incluse le Comunità Capi", () => {
    expect(BRANCH_COLORS).toEqual({ LC: "#FDC500", EG: "#21A067", RS: "#E74030", COCA: "#9B66A5" });
  });
});
