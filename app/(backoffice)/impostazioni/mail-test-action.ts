"use server";

import { getRegistrationEnvironment } from "@/lib/server/environment";
import { getMailProvider } from "@/lib/server/mail";
import { getPrismaClient } from "@/lib/server/prisma";
import { requireCapability } from "@/lib/server/session";
import { AdminMailTestError, sendAdminDiagnosticMail } from "@/modules/mail/admin-mail-test";
import { MailDailyQuotaExceededError } from "@/modules/mail/mail-quota";
import { MailProviderNotConfiguredError } from "@/providers/mail/gmail-smtp-mail-provider";
import { PrismaRateLimitRepository } from "@/repositories/prisma/rate-limit.repository";

export type MailTestActionState =
  | { status: "idle"; message?: undefined }
  | { status: "success" | "error"; message: string };

export async function sendMailTestAction(
  _state: MailTestActionState,
  formData: FormData,
): Promise<MailTestActionState> {
  void _state;
  const actor = await requireCapability("users:manage");

  try {
    await sendAdminDiagnosticMail({
      actorId: actor.id,
      recipientInput: formData.get("recipient"),
      rateLimitSecret: getRegistrationEnvironment().RATE_LIMIT_HMAC_KEY,
      rateLimitRepository: new PrismaRateLimitRepository(getPrismaClient()),
      mailProviderFactory: getMailProvider,
    });
  } catch (error) {
    if (error instanceof AdminMailTestError) {
      const messages = {
        INVALID_RECIPIENT: "Inserisci un solo indirizzo email valido.",
        RATE_LIMITED: "Troppi tentativi di test: puoi inviare al massimo 3 email ogni ora. Riprova più tardi.",
        RATE_LIMIT_UNAVAILABLE: "Impossibile verificare i tentativi di test. Riprova più tardi.",
      };
      return { status: "error", message: messages[error.code] };
    }
    if (error instanceof MailDailyQuotaExceededError) {
      return { status: "error", message: "La quota prudenziale Gmail è stata raggiunta: riprova più tardi." };
    }
    if (error instanceof MailProviderNotConfiguredError) {
      return { status: "error", message: "Provider Gmail non configurato. Controlla le variabili email in produzione." };
    }
    return {
      status: "error",
      message: "Test non riuscito. Controlla i log di produzione per la causa SMTP; nessun dettaglio sensibile è mostrato qui.",
    };
  }

  return {
    status: "success",
    message: "Gmail SMTP ha accettato il messaggio di prova. Verifica posta in arrivo, spam e intestazioni nella casella destinataria: questo non conferma la consegna finale.",
  };
}
