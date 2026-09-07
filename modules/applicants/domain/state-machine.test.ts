import { describe, expect, it } from "vitest";

import { canTransition, type ApplicantStatus } from "./state-machine";

describe("state machine degli iscritti", () => {
  const allowed: Array<[ApplicantStatus, ApplicantStatus]> = [
    ["IN_ATTESA", "DA_CHIAMARE"],
    ["DA_CHIAMARE", "IN_ATTESA"],
    ["DA_CHIAMARE", "ACCETTATO"],
    ["DA_CHIAMARE", "RIFIUTATO"],
  ];

  it.each(allowed)("consente %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["IN_ATTESA", "ACCETTATO"],
    ["IN_ATTESA", "RIFIUTATO"],
    ["ACCETTATO", "RIFIUTATO"],
    ["RIFIUTATO", "IN_ATTESA"],
  ] satisfies Array<[ApplicantStatus, ApplicantStatus]>)("nega %s → %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});
