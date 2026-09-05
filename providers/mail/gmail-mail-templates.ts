import type {
  PasswordResetMailInput,
  RegistrationMailInput,
  StaffInvitationMailInput,
  StatusMailInput,
} from "@/modules/mail/mail-provider";

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

interface TemplateOptions {
  organizationName: string;
}

export function registrationConfirmationMail(
  input: RegistrationMailInput,
  options: TemplateOptions,
): MailContent {
  return transactionalMail({
    subject: `Conferma iscrizione lista d'attesa - ${input.registrationNumber}`,
    heading: "Iscrizione registrata",
    paragraphs: [
      `Gentile famiglia, l'iscrizione di ${input.applicantName} alla lista d'attesa è stata registrata correttamente.`,
      `Numero di iscrizione: ${input.registrationNumber}`,
      "Conserva questo numero come riferimento per le comunicazioni con il Gruppo.",
    ],
    ...options,
  });
}

export function acceptanceConfirmationMail(
  input: StatusMailInput,
  options: TemplateOptions,
): MailContent {
  return transactionalMail({
    subject: `Esito iscrizione ${input.registrationNumber}: accettata`,
    heading: "Iscrizione accettata",
    paragraphs: [
      `Gentile famiglia, l'iscrizione di ${input.applicantName} è stata accettata.`,
      `Numero di iscrizione: ${input.registrationNumber}`,
      "Il Gruppo vi contatterà per i prossimi passi.",
    ],
    ...options,
  });
}

export function rejectionConfirmationMail(
  input: StatusMailInput,
  options: TemplateOptions,
): MailContent {
  return transactionalMail({
    subject: `Esito iscrizione ${input.registrationNumber}`,
    heading: "Aggiornamento sull'iscrizione",
    paragraphs: [
      `Gentile famiglia, al momento non è possibile accogliere l'iscrizione di ${input.applicantName}.`,
      `Numero di iscrizione: ${input.registrationNumber}`,
      "Per eventuali chiarimenti potete rispondere a questa email.",
    ],
    ...options,
  });
}

export function staffInvitationMail(
  input: StaffInvitationMailInput,
  options: TemplateOptions,
): MailContent {
  return transactionalMail({
    subject: `Invito alla gestione della lista d'attesa - ${options.organizationName}`,
    heading: "Invito riservato ai Capi",
    paragraphs: [
      `Ciao ${input.staffName}, hai ricevuto un invito per accedere alla gestione della lista d'attesa.`,
      `Il collegamento scade ${formatDateTime(input.expiresAt)}.`,
      "Se non riconosci questo invito, ignora il messaggio e segnalalo al Capo Gruppo.",
    ],
    action: { label: "Accetta l'invito", url: input.invitationUrl },
    ...options,
  });
}

export function passwordResetMail(
  input: PasswordResetMailInput,
  options: TemplateOptions,
): MailContent {
  return transactionalMail({
    subject: `Reimposta la password - ${options.organizationName}`,
    heading: "Reimpostazione della password",
    paragraphs: [
      `Ciao ${input.staffName}, è stata richiesta la reimpostazione della password del tuo account.`,
      `Il collegamento scade ${formatDateTime(input.expiresAt)}.`,
      "Se non hai effettuato tu la richiesta, ignora il messaggio e informa il Capo Gruppo.",
    ],
    action: { label: "Reimposta la password", url: input.resetUrl },
    ...options,
  });
}

export function diagnosticMail(options: TemplateOptions): MailContent {
  return transactionalMail({
    subject: `Test configurazione email - ${options.organizationName}`,
    heading: "Configurazione email verificata",
    paragraphs: [
      "Questo messaggio di prova conferma che Gmail ha accettato l'invio SMTP dell'applicazione.",
      "Controlla le intestazioni del messaggio per verificare SPF, DKIM e DMARC prima del go-live.",
    ],
    ...options,
  });
}

interface TransactionalMailInput extends TemplateOptions {
  subject: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
}

function transactionalMail(input: TransactionalMailInput): MailContent {
  if (input.action) assertSafeActionUrl(input.action.url);

  const textLines = [
    input.heading,
    "",
    ...input.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(input.action
      ? [input.action.label, input.action.url, ""]
      : []),
    `Messaggio automatico inviato da ${input.organizationName}.`,
  ];
  const paragraphs = input.paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px">${escapeHtml(paragraph)}</p>`)
    .join("");
  const action = input.action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(input.action.url)}" style="display:inline-block;background:#5b21b6;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${escapeHtml(input.action.label)}</a></p><p style="margin:0 0 16px;font-size:13px;color:#57534e;word-break:break-all">Se il pulsante non funziona, copia questo indirizzo nel browser:<br>${escapeHtml(input.action.url)}</p>`
    : "";

  return {
    subject: input.subject,
    text: textLines.join("\n").trim(),
    html: `<!doctype html><html lang="it"><head><meta charset="utf-8"></head><body style="margin:0;background:#f5f5f4;color:#292524;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f4;padding:24px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px"><tr><td style="padding:32px"><h1 style="margin:0 0 24px;color:#4c1d95;font-size:24px">${escapeHtml(input.heading)}</h1>${paragraphs}${action}<p style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e7e5e4;font-size:13px;color:#57534e">Messaggio automatico inviato da ${escapeHtml(input.organizationName)}.</p></td></tr></table></td></tr></table></body></html>`,
  };
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(value);
}

function assertSafeActionUrl(value: string): void {
  const url = new URL(value);
  const localDevelopment = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && localDevelopment)) {
    throw new Error("I collegamenti nelle email devono utilizzare HTTPS.");
  }
  if (url.username || url.password) {
    throw new Error("I collegamenti nelle email non possono contenere credenziali.");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}
