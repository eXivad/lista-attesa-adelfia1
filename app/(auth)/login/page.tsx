import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <Link href="/" className="mx-auto flex w-fit min-h-11 items-center gap-3" aria-label="Torna alla home">
          <span className="flex size-11 items-center justify-center rounded-xl bg-violet-800 font-slab font-bold text-white">A1</span>
          <strong className="font-slab text-lg text-violet-950">AGESCI Adelfia 1</strong>
        </Link>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
