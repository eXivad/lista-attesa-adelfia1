"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LoaderCircle, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);

    const result = await authClient.signIn.email({
      email: String(formData.get("email") ?? "").trim().toLowerCase(),
      password: String(formData.get("password") ?? ""),
      rememberMe: true,
    });

    if (result.error) {
      setError("Email o password non corretti.");
      setPending(false);
      return;
    }

    const requestedPath = searchParams.get("next");
    const destination = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/dashboard";
    router.replace(destination);
    router.refresh();
  }

  return (
    <form className="space-y-5" method="post" onSubmit={handleSubmit} noValidate>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Area riservata</p>
        <h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">Accedi all’area Capi</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Usa le credenziali ricevute dal Capo Gruppo.</p>
      </div>
      {(searchParams.get("invitationAccepted") === "1" || searchParams.get("passwordReset") === "1") && (
        <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
          {searchParams.get("invitationAccepted") === "1" ? "Account attivato. Ora puoi accedere." : "Password aggiornata. Ora puoi accedere."}
        </p>
      )}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-stone-800" htmlFor="email">Email</label>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label className="block text-sm font-bold text-stone-800" htmlFor="password">Password</label>
          <Link className="text-sm font-bold text-violet-800 underline underline-offset-4" href="/reset-password">
            Password dimenticata?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" minLength={12} required />
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-900">{error}</p>}
      <Button className="w-full" size="lg" type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <LogIn className="size-5" aria-hidden="true" />}
        {pending ? "Accesso in corso…" : "Accedi"}
      </Button>
    </form>
  );
}
