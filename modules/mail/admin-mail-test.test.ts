import { describe, expect, it, vi } from "vitest";

import { AdminMailTestError, sendAdminDiagnosticMail } from "./admin-mail-test";

function setup() {
  const provider = { sendDiagnosticMessage: vi.fn(async () => undefined) };
  const mailProviderFactory = vi.fn(() => provider);
  const options = {
    recipientInput: " Test@Outlook.it ",
    mailProviderFactory,
  };
  return { options, provider, mailProviderFactory };
}

describe("sendAdminDiagnosticMail", () => {
  it("invia il modello diagnostico a un solo indirizzo normalizzato", async () => {
    const { options, provider } = setup();

    await sendAdminDiagnosticMail(options);

    expect(provider.sendDiagnosticMessage).toHaveBeenCalledExactlyOnceWith("test@outlook.it");
  });

  it("rifiuta indirizzi non validi prima di toccare il provider", async () => {
    const { options, mailProviderFactory } = setup();

    await expect(sendAdminDiagnosticMail({ ...options, recipientInput: "a@example.it,b@example.it" }))
      .rejects.toMatchObject({ code: "INVALID_RECIPIENT" } satisfies Partial<AdminMailTestError>);
    expect(mailProviderFactory).not.toHaveBeenCalled();
  });

  it("consente invii diagnostici ripetuti senza limite orario applicativo", async () => {
    const { options, provider } = setup();

    for (let attempt = 0; attempt < 4; attempt++) {
      await sendAdminDiagnosticMail(options);
    }
    expect(provider.sendDiagnosticMessage).toHaveBeenCalledTimes(4);
  });
});
