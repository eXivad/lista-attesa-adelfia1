import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  it("espone soltanto accesso email/password e recupero credenziali", () => {
    const html = renderToStaticMarkup(<LoginForm />);

    expect(html).toContain("Accedi all’area Capi");
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Password dimenticata?");
    expect(html).not.toContain("Registrati");
  });
});
