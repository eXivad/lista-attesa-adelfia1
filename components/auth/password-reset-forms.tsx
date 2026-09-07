"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function RequestPasswordResetForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setMessage(null);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim().toLowerCase();
    await authClient.requestPasswordReset({ email, redirectTo: "/reset-password/conferma" });
    setMessage("Se l'indirizzo è registrato, riceverai a breve il link per reimpostare la password.");
    setPending(false);
  }}><label className="block space-y-2 text-sm font-bold" htmlFor="email">Email<Input id="email" name="email" type="email" autoComplete="email" required /></label>{message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}<Button className="w-full" disabled={pending}>{pending ? "Invio…" : "Invia link di reset"}</Button></form>;
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault(); setPending(true); setError(null);
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password !== data.get("confirmation")) { setError("Le password non coincidono."); setPending(false); return; }
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) { setError("Il link non è valido o è scaduto."); setPending(false); return; }
    router.replace("/login?passwordReset=1");
  }}><label className="block space-y-2 text-sm font-bold">Nuova password<Input name="password" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label><label className="block space-y-2 text-sm font-bold">Conferma password<Input name="confirmation" type="password" minLength={12} maxLength={128} autoComplete="new-password" required /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}<Button className="w-full" disabled={pending}>{pending ? "Salvataggio…" : "Imposta nuova password"}</Button></form>;
}
