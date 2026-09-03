"use client";

import { useActionState } from "react";

import type { SettingsActionState } from "@/app/(backoffice)/impostazioni/actions";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = (state: SettingsActionState, data: FormData) => Promise<SettingsActionState>;

export function StaffInvitationForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} className="grid gap-4 sm:grid-cols-2">
    <Field name="firstName" label="Nome" /><Field name="lastName" label="Cognome" />
    <Field name="email" label="Email" type="email" /><Field name="memberCode" label="Codice Socio" />
    <label className="space-y-2 text-sm font-bold">Ruolo<select className="form-control" name="role"><option value="STAFF">Capo</option><option value="ADMIN">Capo Gruppo</option></select></label>
    <div className="flex items-end"><Button className="w-full" disabled={pending}>{pending ? "Invio…" : "Invita Capo"}</Button></div>
    {state.status === "error" && <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">{state.message}</p>}
  </form>;
}

export function MailingRecipientForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]"><Field name="label" label="Etichetta" /><Field name="email" label="Email" type="email" /><div className="flex items-end"><Button disabled={pending}>Aggiungi</Button></div>{state.status === "error" && <p role="alert" className="text-sm text-red-700 sm:col-span-3">{state.message}</p>}</form>;
}

export function SettingsDangerForm({ action, label, confirmation, variant = "outline" }: { action: Action; label: string; confirmation: string; variant?: ButtonProps["variant"] }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} onSubmit={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}><Button size="sm" variant={variant} disabled={pending}>{pending ? "Operazione…" : label}</Button>{state.status === "error" && <p role="alert" className="mt-1 text-xs text-red-700">{state.message}</p>}</form>;
}

export function StaffEditForm({ action, user }: { action: Action; user: { firstName: string; lastName: string; email: string; memberCode: string; role: "ADMIN" | "STAFF" } }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} className="mt-3 grid gap-3 rounded-xl bg-stone-50 p-3 sm:grid-cols-2">
    <Field name="firstName" label="Nome" defaultValue={user.firstName} /><Field name="lastName" label="Cognome" defaultValue={user.lastName} />
    <Field name="email" label="Email" type="email" defaultValue={user.email} /><Field name="memberCode" label="Codice Socio" defaultValue={user.memberCode} />
    <label className="space-y-2 text-sm font-bold">Ruolo<select name="role" className="form-control" defaultValue={user.role}><option value="STAFF">Capo</option><option value="ADMIN">Capo Gruppo</option></select></label>
    <div className="flex items-end"><Button disabled={pending} variant="outline" className="w-full">{pending ? "Salvataggio…" : "Salva utente"}</Button></div>
    {state.status === "error" && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.message}</p>}
  </form>;
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return <label className="space-y-2 text-sm font-bold">{label}<Input required {...props} /></label>;
}
