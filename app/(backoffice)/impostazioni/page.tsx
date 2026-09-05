import Image from "next/image";
import { UsersRound } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GroupLogoForm, GroupNameForm, MailingRecipientForm, SettingsDangerForm, StaffEditForm, StaffInvitationForm } from "@/components/settings/settings-forms";
import { formatDateTime } from "@/lib/date-time";
import { getGroupBrandingRepository } from "@/lib/server/group-branding";
import { getPrismaClient } from "@/lib/server/prisma";
import { requireCapability } from "@/lib/server/session";
import { addMailingRecipientAction, deleteStaffAction, inviteStaffAction, removeGroupLogoAction, removeMailingRecipientAction, resendInvitationAction, sendStaffPasswordResetAction, updateGroupNameAction, updateStaffAction, uploadGroupLogoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCapability("users:manage");
  const [users, invitations, recipients, branding, messages] = await Promise.all([
    getPrismaClient().user.findMany({ orderBy: [{ role: "asc" }, { lastName: "asc" }], select: { id: true, firstName: true, lastName: true, email: true, memberCode: true, role: true } }),
    getPrismaClient().staffInvitation.findMany({ where: { acceptedAt: null }, orderBy: { createdAt: "desc" } }),
    getPrismaClient().mailingRecipient.findMany({ orderBy: { email: "asc" } }),
    getGroupBrandingRepository().getSettings(),
    searchParams,
  ]);
  const notice = messages.invited === "1" ? "Invito creato. Controlla lo stato di consegna email."
    : messages.resent === "1" ? "Invito rigenerato e reinviato."
      : messages.staffDeleted === "1" ? "Account Capo eliminato e sessioni revocate."
        : messages.staffUpdated === "1" ? "Account aggiornato."
          : messages.resetSent === "1" ? "Email di reset password inviata."
        : messages.mailingUpdated === "1" ? "Mailing list aggiornata."
          : messages.brandingUpdated === "1" ? "Nome e logo del gruppo aggiornati." : null;
  return <div className="space-y-6">
    <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Solo Capo Gruppo</p><h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">Impostazioni</h1></div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900">{notice}</p>}
    <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Identità del gruppo</h2><p className="text-sm text-stone-600">Nome e logo vengono applicati alla navigazione del backoffice senza richiedere un nuovo deploy.</p></CardHeader><CardContent className="space-y-6">
      <div className="flex items-center gap-4 rounded-2xl bg-stone-50 p-4">
        <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-100 text-violet-800">
          {branding.logoVersion ? <Image src={`/api/branding/logo?v=${encodeURIComponent(branding.logoVersion)}`} alt={`Logo ${branding.groupName}`} width={96} height={96} unoptimized className="size-24 object-contain" /> : <UsersRound className="size-10" aria-hidden="true" />}
        </span>
        <div><p className="font-slab text-xl font-bold text-violet-950">{branding.groupName}</p><p className="text-sm text-stone-600">{branding.logoVersion ? "Logo personalizzato attivo" : "Nessun logo personalizzato"}</p></div>
      </div>
      <GroupNameForm action={updateGroupNameAction} groupName={branding.groupName} />
      <GroupLogoForm action={uploadGroupLogoAction} />
      {branding.logoVersion && <SettingsDangerForm action={removeGroupLogoAction} label="Rimuovi logo" variant="destructive" confirmation="Rimuovere il logo personalizzato? Verrà mostrato il simbolo neutro del gruppo." />}
    </CardContent></Card>
    <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Invita un Capo</h2><p className="text-sm text-stone-600">Il link monouso scade dopo 24 ore; l’account nasce quando viene impostata la password.</p></CardHeader><CardContent><StaffInvitationForm action={inviteStaffAction} /></CardContent></Card>
    <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Utenti attivi</h2></CardHeader><CardContent><ul className="space-y-4">{users.map((user) => <li key={user.id} className="rounded-2xl border border-stone-200 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{user.firstName} {user.lastName}</p><p className="text-sm text-stone-600">{user.email} · {user.memberCode} · {user.role === "ADMIN" ? "Capo Gruppo" : "Capo"}</p></div><div className="flex flex-wrap gap-2"><SettingsDangerForm action={sendStaffPasswordResetAction.bind(null, user.id)} label="Invia reset password" confirmation={`Inviare a ${user.email} un link di reset valido un'ora?`} />{user.role === "STAFF" && <SettingsDangerForm action={deleteStaffAction.bind(null, user.id)} label="Elimina" variant="destructive" confirmation={`Confermi l'eliminazione completa di ${user.firstName} ${user.lastName}? L'accesso cesserà subito.`} />}</div></div><details><summary className="mt-3 cursor-pointer text-sm font-bold text-violet-800">Modifica dati</summary><StaffEditForm action={updateStaffAction.bind(null, user.id)} user={user} /></details></li>)}</ul></CardContent></Card>
    <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Inviti in attesa</h2></CardHeader><CardContent>{invitations.length === 0 ? <p className="text-stone-600">Nessun invito in attesa.</p> : <ul className="space-y-3">{invitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-4"><div><p className="font-bold">{invitation.firstName} {invitation.lastName}</p><p className="text-sm text-stone-600">{invitation.email} · scade {formatDateTime(invitation.expiresAt)}</p></div><SettingsDangerForm action={resendInvitationAction.bind(null, invitation.id)} label="Reinvia" confirmation="Il vecchio link verrà invalidato. Vuoi generare e inviare un nuovo invito?" /></li>)}</ul>}</CardContent></Card>
    <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Mailing list interna</h2><p className="text-sm text-stone-600">Questi destinatari ricevono iscrizioni, accettazioni e rifiuti.</p></CardHeader><CardContent className="space-y-5"><MailingRecipientForm action={addMailingRecipientAction} /><ul className="space-y-2">{recipients.map((recipient) => <li className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 p-3" key={recipient.id}><div><p className="font-bold">{recipient.label}</p><p className="text-sm text-stone-600">{recipient.email}</p></div><SettingsDangerForm action={removeMailingRecipientAction.bind(null, recipient.id)} label="Rimuovi" confirmation={`Rimuovere ${recipient.email} dalla mailing list?`} /></li>)}</ul></CardContent></Card>
  </div>;
}
