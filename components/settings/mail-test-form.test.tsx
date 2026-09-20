import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { MailTestForm } from "./settings-forms";

it("espone un invio diagnostico accessibile con destinatario modificabile", () => {
  const html = renderToStaticMarkup(
    <MailTestForm action={async () => ({ status: "idle" })} defaultRecipient="admin@example.it" />,
  );

  expect(html).toContain('name="recipient"');
  expect(html).toContain('type="email"');
  expect(html).toContain('value="admin@example.it"');
  expect(html).toContain("Invia email di prova");
  expect(html).toContain("3 tentativi ogni ora");
});
