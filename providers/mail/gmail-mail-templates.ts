import { createElement } from "react";
import { render, toPlainText } from "react-email";

import WaitingListTransactionalEmail, {
  type EmailFragment,
  type EmailParagraph,
} from "@/emails/_components/waiting-list-transactional-email";
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

type MailFragment = string | EmailFragment;
type MailParagraph = MailFragment[];

export function registrationConfirmationMail(
  input: RegistrationMailInput,
  options: TemplateOptions,
): Promise<MailContent> {
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
): Promise<MailContent> {
  return transactionalMail({
    subject: `Esito iscrizione ${input.registrationNumber}: accettata`,
    heading: "Iscrizione accettata",
    paragraphs: [
      ["Gentile famiglia,"],
      [
        "a seguito del colloquio telefonico, vi confermiamo di aver registrato la vostra ",
        strong("accettazione del posto proposto "),
        "per ",
        strong(input.applicantName),
        " presso il Gruppo Scout ",
        strong(options.organizationName),
        ".",
      ],
      [
        "Sarete ricontattati per ricevere le informazioni necessarie e procedere con i successivi passaggi dell’iscrizione.",
      ],
    ],
    ...options,
  });
}

export function rejectionConfirmationMail(
  input: StatusMailInput,
  options: TemplateOptions,
): Promise<MailContent> {
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
): Promise<MailContent> {
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
): Promise<MailContent> {
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

export function diagnosticMail(options: TemplateOptions): Promise<MailContent> {
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

async function transactionalMail(input: TransactionalMailInput): Promise<MailContent> {
  validateLinks(input);

  const html = await render(createElement(WaitingListTransactionalEmail, {
    organizationName: input.organizationName,
    heading: input.heading,
    paragraphs: normalizeParagraphs(input.paragraphs),
    ...(input.logoCid ? { logoSrc: `cid:${input.logoCid}` } : {}),
    ...(input.action ? { action: input.action } : {}),
  }));

  return {
    subject: input.subject,
    html,
    text: toPlainText(html).trim(),
  };
}

function validateLinks(input: TransactionalMailInput): void {
  if (input.action) assertSafeActionUrl(input.action.url);
  for (const paragraph of input.paragraphs) {
    for (const fragment of paragraph) {
      if (typeof fragment !== "string" && fragment.href) {
        assertSafeActionUrl(fragment.href);
      }
    }
  }
}

function normalizeParagraphs(paragraphs: MailParagraph[]): EmailParagraph[] {
  return paragraphs.map((paragraph) => paragraph.map((fragment) =>
    typeof fragment === "string" ? { text: fragment } : fragment));
}

function strong(text: string): MailFragment {
  return { text, strong: true };
}

function link(url: string): MailFragment {
  return { text: url, href: url };
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
