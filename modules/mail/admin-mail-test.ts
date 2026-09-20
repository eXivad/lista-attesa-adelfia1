import { createHmac } from "node:crypto";
import { z } from "zod";

import type { RateLimitRepository } from "@/lib/security/rate-limiter";

const recipientSchema = z.string().trim().toLowerCase().max(320).pipe(z.email());
const TEST_LIMIT = 3;
const TEST_WINDOW_MS = 60 * 60 * 1_000;

type AdminMailTestErrorCode = "INVALID_RECIPIENT" | "RATE_LIMITED" | "RATE_LIMIT_UNAVAILABLE";

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
  actorId: string;
  recipientInput: unknown;
  rateLimitSecret: string;
  rateLimitRepository: RateLimitRepository;
  mailProviderFactory: () => DiagnosticMailProvider;
  clock?: () => Date;
}

export async function sendAdminDiagnosticMail(options: AdminMailTestOptions): Promise<void> {
  const recipient = recipientSchema.safeParse(options.recipientInput);
  if (!recipient.success) throw new AdminMailTestError("INVALID_RECIPIENT");

  const keyHash = createHmac("sha256", options.rateLimitSecret)
    .update(`admin-mail-test:${options.actorId}`)
    .digest("hex");
  let allowed: boolean;
  try {
    allowed = await options.rateLimitRepository.consume({
      keyHash,
      now: options.clock?.() ?? new Date(),
      limit: TEST_LIMIT,
      windowMs: TEST_WINDOW_MS,
    });
  } catch {
    // Non inviare se non è possibile verificare il limite persistente.
    throw new AdminMailTestError("RATE_LIMIT_UNAVAILABLE");
  }
  if (!allowed) throw new AdminMailTestError("RATE_LIMITED");

  await options.mailProviderFactory().sendDiagnosticMessage(recipient.data);
}
