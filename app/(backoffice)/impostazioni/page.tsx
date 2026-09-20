import Image from "next/image";
import { ExternalLink, ShieldCheck, UsersRound } from "lucide-react";

import {
  GroupLogoForm,
  GroupNameForm,
  MailTestForm,
  MailingRecipientForm,
  PrivacyPolicyForm,
  SettingsDangerForm,
  StaffEditForm,
  StaffInvitationForm,
} from "@/components/settings/settings-forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date-time";
import { getGroupBrandingSettings } from "@/lib/server/group-branding";
import { getPrismaClient } from "@/lib/server/prisma";
import { requireCapability } from "@/lib/server/session";
import { PrismaPrivacyRepository } from "@/repositories/prisma/privacy.repository";
import {
  addMailingRecipientAction,
  deleteStaffAction,
  inviteStaffAction,
  publishPrivacyPolicyAction,
  removeGroupLogoAction,
  removeMailingRecipientAction,
  resendInvitationAction,
  sendStaffPasswordResetAction,
  updateGroupNameAction,
  updateStaffAction,
  uploadGroupLogoAction,
} from "./actions";
import { sendMailTestAction } from "./mail-test-action";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SettingsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const admin = await requireCapability("users:manage");
  const prisma = getPrismaClient();
  const privacyRepository = new PrismaPrivacyRepository(prisma);
  const [users, invitations, recipients, branding, privacyVersions, messages] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        memberCode: true,
        role: true,
      },
    }),
    prisma.staffInvitation.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.mailingRecipient.findMany({ orderBy: { email: "asc" } }),
    getGroupBrandingSettings(),
    privacyRepository.listVersions(),
    searchParams,
  ]);
  const activePrivacyPolicy = privacyVersions.find((policy) => policy.isActive) ?? null;
  const notice = messages.invited === "1"
    ? "Invito creato. Controlla lo stato di consegna email."
    : messages.resent === "1"
      ? "Invito rigenerato e reinviato."
      : messages.staffDeleted === "1"
        ? "Account Capo eliminato e sessioni revocate."
        : messages.staffUpdated === "1"
          ? "Account aggiornato."
          : messages.resetSent === "1"
            ? "Email di reset password inviata."
            : messages.mailingUpdated === "1"
              ? "Mailing list aggiornata."
              : messages.brandingUpdated === "1"
                ? "Nome e logo del gruppo aggiornati."
                : messages.privacyUpdated === "1"
                  ? "Nuova informativa privacy pubblicata e attivata."
                  : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Solo Capo Gruppo</p>
        <h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">Impostazioni</h1>
      </div>
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900">
          {notice}
        </p>
      )}

      <Card>
        <CardHeader>
          <h2 className="font-slab text-xl font-bold text-violet-950">Identità del gruppo</h2>
          <p className="text-sm text-stone-600">
            Assegna il Nome e il Logo del tuo gruppo per dare identità al sito.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 rounded-2xl bg-stone-50 p-4">
            <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-100 text-violet-800">
              {branding.logoVersion ? (
                <Image
                  src={`/api/branding/logo?v=${encodeURIComponent(branding.logoVersion)}`}
                  alt={`Logo ${branding.groupName}`}
                  width={96}
                  height={96}
                  unoptimized
                  className="size-24 object-contain"
                />
              ) : (
                <UsersRound className="size-10" aria-hidden="true" />
              )}
            </span>
            <div>
              <p className="font-slab text-xl font-bold text-violet-950">{branding.groupName}</p>
              <p className="text-sm text-stone-600">
                {branding.logoVersion ? "Logo personalizzato attivo" : "Nessun logo personalizzato"}
              </p>
            </div>
          </div>
          <GroupNameForm action={updateGroupNameAction} groupName={branding.groupName} />
          <GroupLogoForm action={uploadGroupLogoAction} />
          {branding.logoVersion && (
            <SettingsDangerForm
              action={removeGroupLogoAction}
              label="Rimuovi logo"
              variant="destructive"
              confirmation="Rimuovere il logo personalizzato? Verrà mostrato il simbolo neutro del gruppo."
            />
          )}
        </CardContent>
      </Card>

      <Card id="privacy">
        <CardHeader>
          <h2 className="font-slab text-xl font-bold text-violet-950">Informativa privacy</h2>
          <p className="text-sm text-stone-600">
            In questa sezione puoi gestire le informative sulla privacy utilizzate nel sito. È possibile aggiungere nuove versioni dell’informativa, modificarne i contenuti e scegliere quale versione rendere attiva per le nuove iscrizioni.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {activePrivacyPolicy ? (
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-emerald-50 p-4 text-emerald-950">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-bold">Versione attiva: {activePrivacyPolicy.version}</p>
                  <p className="mt-1 text-sm">
                    Pubblicata nell’app il {formatDateTime(activePrivacyPolicy.publishedAt)}.
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-4"
                href="/privacy"
                rel="noreferrer"
              >
                Apri l’anteprima
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="rounded-2xl bg-amber-50 p-4 text-sm font-medium text-amber-950">
              Nessuna informativa attiva: le nuove iscrizioni restano bloccate finché non ne pubblichi una.
            </p>
          )}
          <div>
            <h3 className="font-slab text-lg font-bold text-violet-950">Aggiungi Nuova Informativa Privacy</h3>
            <p className="mt-1 mb-4 text-sm text-stone-600">
              Aggiungi al sito una nuova Informativa alla Privacy aggiornata.
            </p>
            <PrivacyPolicyForm action={publishPrivacyPolicyAction} />
          </div>


          <div>
            <h3 className="font-slab text-lg font-bold text-violet-950">Storico versioni</h3>
            <p className="mt-1 text-sm text-stone-600">
              Versione e link sono conservati come coppia immutabile per non alterare i consensi già registrati.
            </p>
            {privacyVersions.length === 0 ? (
              <p className="mt-4 text-sm text-stone-600">Nessuna versione pubblicata.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {privacyVersions.map((policy) => (
                  <li key={policy.version} className="rounded-2xl border border-stone-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-stone-900">Versione {policy.version}</p>
                          {policy.isActive && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
                              Attiva
                            </span>
                          )}
                        </div>
                        <p className="mt-1 break-all text-sm text-stone-600">{policy.fileUrl}</p>
                        <p className="mt-1 text-xs text-stone-500">Pubblicata il {formatDateTime(policy.publishedAt)}</p>
                      </div>
                      <a
                        className="inline-flex min-h-11 items-center gap-2 font-bold text-violet-800 underline underline-offset-4"
                        href={policy.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-slab text-xl font-bold text-violet-950">Invita un Capo</h2>
          <p className="text-sm text-stone-600">
            Aggiungi un Capo per la gestione della lista d’attesa. Il link d’invito nella mail ha validità di 24h.
          </p>
        </CardHeader>
        <CardContent><StaffInvitationForm action={inviteStaffAction} /></CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Utenti attivi</h2></CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {users.map((user) => (
              <li key={user.id} className="rounded-2xl border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-stone-600">
                      {user.email} · {user.memberCode} · {user.role === "ADMIN" ? "Capo Gruppo" : "Capo"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SettingsDangerForm
                      action={sendStaffPasswordResetAction.bind(null, user.id)}
                      label="Invia reset password"
                      confirmation={`Inviare a ${user.email} un link di reset valido un'ora?`}
                    />
                    {user.role === "STAFF" && (
                      <SettingsDangerForm
                        action={deleteStaffAction.bind(null, user.id)}
                        label="Elimina"
                        variant="destructive"
                        confirmation={`Confermi l'eliminazione completa di ${user.firstName} ${user.lastName}? L'accesso cesserà subito.`}
                      />
                    )}
                  </div>
                </div>
                <details>
                  <summary className="mt-3 cursor-pointer text-sm font-bold text-violet-800">Modifica dati</summary>
                  <StaffEditForm action={updateStaffAction.bind(null, user.id)} user={user} />
                </details>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Inviti in attesa</h2></CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-stone-600">Nessun invito in attesa.</p>
          ) : (
            <ul className="space-y-3">
              {invitations.map((invitation) => (
                <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4">
                  <div>
                    <p className="font-bold">{invitation.firstName} {invitation.lastName}</p>
                    <p className="text-sm text-stone-600">
                      {invitation.email} · scade {formatDateTime(invitation.expiresAt)}
                    </p>
                  </div>
                  <SettingsDangerForm
                    action={resendInvitationAction.bind(null, invitation.id)}
                    label="Reinvia"
                    confirmation="Il vecchio link verrà invalidato. Vuoi generare e inviare un nuovo invito?"
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-slab text-xl font-bold text-violet-950">Mailing list interna</h2>
          <p className="text-sm text-stone-600">Questi destinatari ricevono iscrizioni, accettazioni e rifiuti.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <MailingRecipientForm action={addMailingRecipientAction} />
          <ul className="space-y-2">
            {recipients.map((recipient) => (
              <li className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3" key={recipient.id}>
                <div>
                  <p className="font-bold">{recipient.label}</p>
                  <p className="text-sm text-stone-600">{recipient.email}</p>
                </div>
                <SettingsDangerForm
                  action={removeMailingRecipientAction.bind(null, recipient.id)}
                  label="Rimuovi"
                  confirmation={`Rimuovere ${recipient.email} dalla mailing list?`}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-slab text-xl font-bold text-violet-950">Test invio email</h2>
          <p className="text-sm text-stone-600">
            Invia una sola email di prova a una casella che controlli, anche dall'app in produzione.
          </p>
        </CardHeader>
        <CardContent>
          <MailTestForm action={sendMailTestAction} defaultRecipient={admin.email} />
        </CardContent>
      </Card>
    </div>
  );
}
