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
  it("calcola la branca dinamicamente rispetto alla data di riferimento", () => {
    const referenceDate = new Date("2026-09-03T12:00:00.000Z");

    expect(calculateBranch(new Date("2018-09-03"), referenceDate, configuration)).toBe("LC");
    expect(calculateBranch(new Date("2014-09-03"), referenceDate, configuration)).toBe("EG");
    expect(calculateBranch(new Date("2010-09-03"), referenceDate, configuration)).toBe("RS");
    expect(calculateBranch(new Date("2019-09-03"), referenceDate, configuration)).toBeNull();
  });

  it("calcola gli anni di ingresso usando soltanto startYear ed entryAge", () => {
    expect(getEntryBirthYears(2026, configuration)).toEqual({ LC: 2018, EG: 2014, RS: 2010 });
  });

  it("espone la palette AGESCI fissa incluse le Comunità Capi", () => {
    expect(BRANCH_COLORS).toEqual({ LC: "#FDC500", EG: "#21A067", RS: "#E74030", COCA: "#9B66A5" });
  });
});
