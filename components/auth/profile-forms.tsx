"use client";

import { useActionState, useState } from "react";
import type { ProfileActionState } from "@/app/(backoffice)/profilo/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type ProfileAction = (
  state: ProfileActionState,
  data: FormData,
) => Promise<ProfileActionState>;

export function ProfileForm({
  action,
  user,
}: {
  action: ProfileAction;
  user: { firstName: string; lastName: string; email: string };
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  });
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field name="firstName" label="Nome" defaultValue={user.firstName} />
      <Field name="lastName" label="Cognome" defaultValue={user.lastName} />
      <Field
        name="email"
        label="Email"
        type="email"
        defaultValue={user.email}
        className="sm:col-span-2"
      />
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {state.message}
        </p>
      )}
      <Button disabled={pending} className="sm:col-span-2">
        {pending ? "Salvataggio…" : "Salva profilo"}
      </Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [message, setMessage] = useState<{ error?: string; success?: string }>(
    {},
  );
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage({});
        const data = new FormData(event.currentTarget);
        const result = await authClient.changePassword({
          currentPassword: String(data.get("currentPassword")),
          newPassword: String(data.get("newPassword")),
          revokeOtherSessions: true,
        });
        if (result.error)
          setMessage({
            error: "Password attuale non corretta o nuova password non valida.",
          });
        else {
          setMessage({
            success:
              "Password aggiornata; le altre sessioni sono state revocate.",
          });
          event.currentTarget.reset();
        }
        setPending(false);
      }}
    >
      <Field
        name="currentPassword"
        label="Password attuale"
        type="password"
        autoComplete="current-password"
      />
      <Field
        name="newPassword"
        label="Nuova password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
      />
      {message.error && (
        <p role="alert" className="text-sm text-red-700">
          {message.error}
        </p>
      )}
      {message.success && (
        <p role="status" className="text-sm text-emerald-800">
          {message.success}
        </p>
      )}
      <Button disabled={pending} variant="outline">
        {pending ? "Aggiornamento…" : "Cambia password"}
      </Button>
    </form>
  );
}

function Field({
  label,
  className,
  ...props
}: { label: string; className?: string } & React.ComponentProps<typeof Input>) {
  return (
    <label className={`space-y-2 text-sm font-bold ${className ?? ""}`}>
      {label}
      <Input required {...props} />
    </label>
  );
}
