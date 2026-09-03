export const APPLICANT_STATUSES = [
  "IN_ATTESA",
  "DA_CHIAMARE",
  "ACCETTATO",
  "RIFIUTATO",
] as const;

export type ApplicantStatus = (typeof APPLICANT_STATUSES)[number];

const ALLOWED_TRANSITIONS: Readonly<Record<ApplicantStatus, ReadonlySet<ApplicantStatus>>> = {
  IN_ATTESA: new Set(["DA_CHIAMARE"]),
  DA_CHIAMARE: new Set(["IN_ATTESA", "ACCETTATO", "RIFIUTATO"]),
  ACCETTATO: new Set(),
  RIFIUTATO: new Set(),
};

export function canTransition(from: ApplicantStatus, to: ApplicantStatus): boolean {
  return ALLOWED_TRANSITIONS[from].has(to);
}
