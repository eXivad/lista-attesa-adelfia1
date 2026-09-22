export const BRANCHES = ["LC", "EG", "RS"] as const;
export type Branch = (typeof BRANCHES)[number];

export const BRANCH_COLORS = {
  LC: "#FDC500",
  EG: "#21A067",
  RS: "#E74030",
  COCA: "#9B66A5",
} as const;

export interface BranchConfiguration {
  branch: Branch;
  minAge: number;
  maxAge: number;
  entryAge: number;
}

export function calculateBranch(
  birthYear: number,
  associativeYearStart: number | null,
  configuration: BranchConfiguration[],
): Branch | null {
  if (
    associativeYearStart === null ||
    !Number.isInteger(birthYear) ||
    !Number.isInteger(associativeYearStart)
  ) {
    return null;
  }

  const associativeAge = associativeYearStart - birthYear;
  return configuration.find(
    ({ minAge, maxAge }) => associativeAge >= minAge && associativeAge <= maxAge,
  )?.branch ?? null;
}

export function getEntryBirthYears(
  associativeYearStart: number,
  configuration: BranchConfiguration[],
): Record<Branch, number> {
  const years = {} as Record<Branch, number>;

  for (const item of configuration) {
    years[item.branch] = associativeYearStart - item.entryAge;
  }

  return years;
}
