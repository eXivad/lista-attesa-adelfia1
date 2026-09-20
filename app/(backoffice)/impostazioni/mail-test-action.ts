"use server";

import { getMailProvider } from "@/lib/server/mail";
import { requireCapability } from "@/lib/server/session";
import { AdminMailTestError, sendAdminDiagnosticMail } from "@/modules/mail/admin-mail-test";
import { MailDailyQuotaExceededError } from "@/modules/mail/mail-quota";
import { MailProviderNotConfiguredError } from "@/providers/mail/gmail-smtp-mail-provider";

export type MailTestActionState =
  | { status: "idle"; message?: undefined }
  | { status: "success" | "error"; message: string };

export async function sendMailTestAction(
  _state: MailTestActionState,
  formData: FormData,
): Promise<MailTestActionState> {
  void _state;
  await requireCapability("users:manage");

  try {
    await sendAdminDiagnosticMail({
      recipientInput: formData.get("recipient"),
      mailProviderFactory: getMailProvider,
    });
  } catch (error) {
    if (error instanceof AdminMailTestError) {
      return { status: "error", message: "Inserisci un solo indirizzo email valido." };
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
