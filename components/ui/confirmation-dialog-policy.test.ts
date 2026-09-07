import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const confirmationFlows = [
  "components/applicants/confirmed-action-form.tsx",
  "components/applicants/applicant-edit-form.tsx",
  "components/settings/settings-forms.tsx",
  "components/years/year-management-forms.tsx",
];

describe("confirmation dialog policy", () => {
  it.each(confirmationFlows)("non usa dialog nativi in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");

    expect(source).not.toMatch(/window\.(confirm|alert)\s*\(/);
  });
});
