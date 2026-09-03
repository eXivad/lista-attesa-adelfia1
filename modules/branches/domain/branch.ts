import { calculateAge } from "@/modules/applicants/domain/age";

export const BRANCHES = ["LC", "EG", "RS"] as const;
export type Branch = (typeof BRANCHES)[number];

export interface BranchConfiguration {
  branch: Branch;
  minAge: number;
  maxAge: number;
  entryAge: number;
  colorHex: string;
}

export function calculateBranch(
  birthDate: Date,
  referenceDate: Date,
  configuration: BranchConfiguration[],
): Branch | null {
  const age = calculateAge(birthDate, referenceDate);
  return configuration.find(({ minAge, maxAge }) => age >= minAge && age <= maxAge)?.branch ?? null;
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
