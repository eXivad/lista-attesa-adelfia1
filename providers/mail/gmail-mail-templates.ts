import type {
  PasswordResetMailInput,
  RegistrationMailInput,
  StaffInvitationMailInput,
  StatusMailInput,
} from "@/modules/mail/mail-provider";

const GROUP_CONTACT_URL = "https://gruppi.agesci.it/adelfia1/contatti/";

export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

export interface TemplateOptions {
  organizationName: string;
  logoCid?: string;
}

type MailFragment =
  | string
  | {
      text: string;
      strong?: boolean;
      href?: string;
    };

type MailParagraph = MailFragment[];

export function registrationConfirmationMail(
  input: RegistrationMailInput,
  options: TemplateOptions,
): MailContent {
  return transactionalMail({
    subject: `Conferma iscrizione lista d'attesa - ${input.registrationNumber}`,
    heading: "Richiesta ricevuta",
    paragraphs: [
      ["Gentile famiglia,"],
      [
        "vi confermiamo di aver ricevuto correttamente la richiesta di inserimento nella lista d’attesa del Gruppo ",
        strong(options.organizationName),
        " relativa a:",
      ],
      [
        strong(input.applicantName),
        ", nato/a il ",
        strong(formatDate(input.applicantBirthDate)),
      ],
      [
        "La richiesta sarà presa in carico dalla Comunità Capi e dalle singole Staff e sarà valutata in base all’anno di nascita del minore, all’ordine cronologico di ricezione e alla disponibilità di posti nella branca di riferimento.",
      ],
      [
        strong("Vi ricordiamo che la compilazione del modulo non comporta l’iscrizione automatica ad AGESCI e non garantisce la disponibilità di un posto."),
      ],
      [
        "In caso di disponibilità, sarete ricontattati ai recapiti indicati nel modulo per verificare il vostro interesse e, se necessario, procedere con l’eventuale iter di iscrizione associativa ufficiale.",
      ],
      [
        "Per eventuali richieste di aggiornamento o cancellazione dei dati, potete contattare i Capi Gruppo ai riferimenti indicati nell’informativa privacy o nel sito web ",
        link(GROUP_CONTACT_URL),
        ".",
      ],
      ["Grazie per l’interesse dimostrato verso il nostro Gruppo Scout."],
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
      ["Gentile famiglia,"],
      ["a seguito del colloquio telefonico, vi confermiamo di aver registrato la vostra ", strong("accettazione del posto proposto "), "per ", strong(input.applicantName), " presso il Gruppo Scout AGESCI Adelfia 1"],
      ["Sarete ricontattati per ricevere le informazioni necessarie e procedere con i successivi passaggi dell’iscrizione."],
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
    heading: "Aggiornamento sull’iscrizione",
    paragraphs: [
      ["Gentile famiglia,"],
      [
        "con la presente confermiamo che, in seguito al contatto con i Capi del Gruppo, avete comunicato la vostra volontà di non accettare il posto disponibile per ",
        strong(input.applicantName),
        ".",
      ],
      [
        "La relativa iscrizione alla lista d’attesa verrà quindi considerata conclusa secondo le modalità previste dal Gruppo.",
      ],
      ["Per eventuali chiarimenti potete rispondere a questa email."],
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
      [
        "Ciao ",
        strong(input.staffName),
        ", hai ricevuto un invito per accedere alla gestione della lista d’attesa.",
      ],
      ["Il collegamento scade ", strong(formatDateTime(input.expiresAt)), "."],
      [
        "Se non riconosci questo invito, ignora il messaggio e segnalalo al Capo Gruppo.",
      ],
    ],
    action: { label: "Accetta l’invito", url: input.invitationUrl },
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
      [
        "Ciao ",
        strong(input.staffName),
        ", è stata richiesta la reimpostazione della password del tuo account.",
      ],
      ["Il collegamento scade ", strong(formatDateTime(input.expiresAt)), "."],
      [
        "Se non hai effettuato tu la richiesta, ignora il messaggio e informa il Capo Gruppo.",
      ],
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
      [
        "Questo messaggio di prova conferma che Gmail ha accettato l’invio SMTP dell’applicazione.",
      ],
      [
        "Controlla le intestazioni del messaggio per verificare SPF, DKIM e DMARC prima del go-live.",
      ],
    ],
    ...options,
  });
}

interface TransactionalMailInput extends TemplateOptions {
  subject: string;
  heading: string;
  paragraphs: MailParagraph[];
  action?: { label: string; url: string };
}

function transactionalMail(input: TransactionalMailInput): MailContent {
  if (input.action) assertSafeActionUrl(input.action.url);

  const textLines = [
    "Lista d’Attesa - AGESCI",
    input.organizationName,
    "",
    input.heading,
    "",
    ...input.paragraphs.flatMap((paragraph) => [renderPlainText(paragraph), ""]),
    ...(input.action ? [input.action.label, input.action.url, ""] : []),
    "Cordiali saluti,",
    input.organizationName,
    "",
    `Messaggio automatico inviato da ${input.organizationName}.`,
  ];
  const paragraphs = input.paragraphs
    .map(
      (paragraph) =>
        `<p class="email-copy" style="margin:0 0 16px;line-height:1.55;color:#292524">${renderHtml(paragraph)}</p>`,
    )
    .join("");
  const action = input.action
    ? `<p style="margin:24px 0"><a class="email-button" href="${escapeHtml(input.action.url)}" style="display:inline-block;background:#4c1d95;background-image:linear-gradient(#4c1d95,#4c1d95);color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">${protectGmailWhiteLabel(escapeHtml(input.action.label))}</a></p><p class="email-muted" style="margin:0 0 16px;font-size:13px;color:#57534e;line-height:1.5;word-break:break-all">Se il pulsante non funziona, copia questo indirizzo nel browser:<br>${escapeHtml(input.action.url)}</p>`
    : "";
  const logo = input.logoCid
  ? `
    <td width="92" valign="middle" style="padding-right:16px">
      <table
        role="presentation"
        cellspacing="0"
        cellpadding="0"
        border="0"
        style="border-collapse:separate"
      >
        <tr>
          <td class="email-logo"
            bgcolor="#fafaf9"
            style="
              background:#fafaf9;
              background-image:linear-gradient(#fafaf9,#fafaf9);
              padding:8px;
              border-radius:10px;
            "
          >
            <img
              src="cid:${escapeHtml(input.logoCid)}"
              width="60"
              alt="Logo ${escapeHtml(input.organizationName)}"
              style="
                display:block;
                width:60px;
                max-width:60px;
                height:auto;
                border:0;
              "
            >
          </td>
        </tr>
      </table>
    </td>
  `
  : "";
  const headerText = protectGmailWhiteText(
    `<div class="email-kicker" style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#ddd6fe">Lista d’Attesa - AGESCI</div><div class="email-group" style="margin-top:5px;font-size:19px;font-weight:700;line-height:1.3;color:#ffffff">${escapeHtml(input.organizationName)}</div>`,
  );
  const heading = `<h1 class="email-heading" style="margin:0 0 24px;color:#292524;font-size:24px;line-height:1.25">${escapeHtml(input.heading)}</h1>`;
  const signOff = `<p class="email-copy" style="margin:28px 0 0;line-height:1.55;color:#292524">Cordiali saluti,<br><strong>${escapeHtml(input.organizationName)}</strong></p>`;
  const footer = `<p class="email-muted" style="margin:24px 0 0;padding-top:20px;border-top:1px solid #e7e5e4;font-size:13px;line-height:1.5;color:#57534e">Messaggio automatico inviato da ${escapeHtml(input.organizationName)}.</p>`;

  return {
    subject: input.subject,
    text: textLines.join("\n").trim(),
    html: `<!DOCTYPE html><html lang="it" style="color-scheme:light dark;supported-color-schemes:light dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">${emailColorSchemeStyles()}</head><body class="email-body" bgcolor="#f5f5f4" style="margin:0;background:#f5f5f4;color:#292524;font-family:Arial,sans-serif"><table class="email-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5f5f4" style="width:100%;background:#f5f5f4"><tr><td align="center" style="padding:24px 12px"><table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#fafaf9" style="width:100%;max-width:600px;background:#fafaf9;border-radius:12px;overflow:hidden"><tr><td class="email-header" bgcolor="#4c1d95" style="padding:24px 32px;background:#4c1d95;background-image:linear-gradient(#4c1d95,#4c1d95);color:#ffffff"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${logo}<td valign="middle">${headerText}</td></tr></table></td></tr><tr><td class="email-content" bgcolor="#fafaf9" style="padding:32px;background:#fafaf9;color:#292524">${heading}${paragraphs}${action}${signOff}${footer}</td></tr></table></td></tr></table></body></html>`,
  };
}

function emailColorSchemeStyles(): string {
  return [
    "<style>",
    ":root{color-scheme:light dark;supported-color-schemes:light dark}",
    "u + .email-body .gmail-blend-screen{background:#000000;mix-blend-mode:screen}",
    "u + .email-body .gmail-blend-difference{background:#000000;mix-blend-mode:difference}",
    "@media (prefers-color-scheme: dark){.email-body,.email-page{background:#111827!important}.email-card{background:#1c1917!important}.email-header{background:#4c1d95!important;background-image:linear-gradient(#4c1d95,#4c1d95)!important;color:#ffffff!important}.email-content{background:#1c1917!important;color:#f5f5f4!important}.email-heading,.email-copy{color:#f5f5f4!important}.email-link{color:#c4b5fd!important}.email-kicker{color:#ddd6fe!important}.email-muted{color:#d6d3d1!important;border-top-color:#57534e!important}.email-group{color:#ffffff!important}.email-button{background:#4c1d95!important;background-image:linear-gradient(#4c1d95,#4c1d95)!important;color:#ffffff!important}.email-logo{background:#fafaf9!important}}",
    "[data-ogsc] .email-body,[data-ogsc] .email-page{background:#111827!important}[data-ogsc] .email-card,[data-ogsc] .email-content{background:#1c1917!important}[data-ogsc] .email-header{background:#4c1d95!important;color:#ffffff!important}[data-ogsc] .email-content,[data-ogsc] .email-heading,[data-ogsc] .email-copy{color:#f5f5f4!important}[data-ogsc] .email-link{color:#c4b5fd!important}[data-ogsc] .email-kicker{color:#ddd6fe!important}[data-ogsc] .email-muted{color:#d6d3d1!important;border-top-color:#57534e!important}[data-ogsc] .email-group{color:#ffffff!important}[data-ogsc] .email-button{background:#4c1d95!important;color:#ffffff!important}[data-ogsc] .email-logo{background:#fafaf9!important}",
    "</style>",
  ].join("");
}

function protectGmailWhiteText(content: string): string {
  return `<div class="gmail-blend-screen"><div class="gmail-blend-difference">${content}</div></div>`;
}

function protectGmailWhiteLabel(content: string): string {
  return `<span class="gmail-blend-screen" style="display:block"><span class="gmail-blend-difference" style="display:block">${content}</span></span>`;
}

function strong(text: string): MailFragment {
  return { text, strong: true };
}

function link(url: string): MailFragment {
  return { text: url, href: url };
}

function renderPlainText(paragraph: MailParagraph): string {
  return paragraph.map((fragment) => (typeof fragment === "string" ? fragment : fragment.text)).join("");
}

function renderHtml(paragraph: MailParagraph): string {
  return paragraph
    .map((fragment) => {
      if (typeof fragment === "string") return escapeHtml(fragment);
      const escapedText = escapeHtml(fragment.text);
      const content = fragment.strong ? `<strong>${escapedText}</strong>` : escapedText;
      return fragment.href
        ? `<a class="email-link" href="${escapeHtml(fragment.href)}" style="color:#292524;text-decoration:underline">${content}</a>`
        : content;
    })
    .join("");
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "long",
    timeZone: "Europe/Rome",
  }).format(value);
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
