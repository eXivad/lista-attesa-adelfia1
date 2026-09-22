import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";

import { MailTestForm } from "./settings-forms";

it("mantiene la diagnostica chiusa e non precompila il destinatario", () => {
  const html = renderToStaticMarkup(
    <MailTestForm action={async () => ({ status: "idle" })} />,
  );

  expect(html).toContain("<details");
  expect(html).not.toContain("<details open");
  expect(html).toContain("Diagnostica email");
  expect(html).toContain('name="recipient"');
  expect(html).toContain('type="email"');
  const recipientInput = html.match(/<input[^>]*name="recipient"[^>]*>/)?.[0];
  expect(recipientInput).toBeDefined();
  expect(recipientInput).not.toContain("value=");
  expect(recipientInput).toContain('autoComplete="off"');
  expect(html).toContain("Invia email di prova");
  expect(html).not.toContain("3 tentativi ogni ora");
});
