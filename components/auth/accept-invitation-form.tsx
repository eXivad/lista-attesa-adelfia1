"use client";

import { useActionState } from "react";
import type { AcceptInvitationState } from "@/app/(public)/invito/[token]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AcceptInvitationForm({ action }: { action: (state: AcceptInvitationState, data: FormData) => Promise<AcceptInvitationState> }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} className="space-y-5"><div><label htmlFor="password" className="text-sm font-bold">Password</label><Input id="password" name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></div><div><label htmlFor="passwordConfirmation" className="text-sm font-bold">Conferma password</label><Input id="passwordConfirmation" name="passwordConfirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></div>{state.status === "error" && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{state.message}</p>}<Button className="w-full" disabled={pending}>{pending ? "Attivazione…" : "Attiva account"}</Button></form>;
}
