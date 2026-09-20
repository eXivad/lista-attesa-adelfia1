import { z } from "zod";

const recipientSchema = z.string().trim().toLowerCase().max(320).pipe(z.email());

type AdminMailTestErrorCode = "INVALID_RECIPIENT";

export class AdminMailTestError extends Error {
  constructor(public readonly code: AdminMailTestErrorCode) {
    super(code);
    this.name = "AdminMailTestError";
  }
}

interface DiagnosticMailProvider {
  sendDiagnosticMessage(recipient: string): Promise<void>;
}

interface AdminMailTestOptions {
  recipientInput: unknown;
  mailProviderFactory: () => DiagnosticMailProvider;
}

export async function sendAdminDiagnosticMail(options: AdminMailTestOptions): Promise<void> {
  const recipient = recipientSchema.safeParse(options.recipientInput);
  if (!recipient.success) throw new AdminMailTestError("INVALID_RECIPIENT");

  await options.mailProviderFactory().sendDiagnosticMessage(recipient.data);
}
