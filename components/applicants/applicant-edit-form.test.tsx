import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { validRegistrationInput } from "@/tests/fixtures/registration";
import { ApplicantEditForm } from "./applicant-edit-form";

it("espone la residenza completa del minore e il CAP di entrambi i genitori", () => {
  const html = renderToStaticMarkup(
    <ApplicantEditForm
      action={async () => ({ status: "idle" })}
      values={{
        minor: validRegistrationInput.minor,
        guardians: validRegistrationInput.guardians,
      }}
    />,
  );

  expect(html).toContain('name="minor.residenceAddress"');
  expect(html).toContain('name="minor.residenceCity"');
  expect(html).toContain('name="minor.residenceProvince"');
  expect(html).toContain('name="minor.residencePostalCode"');
  expect(html.match(/name="guardian\.[AB]\.postalCode"/g)).toHaveLength(2);
});
