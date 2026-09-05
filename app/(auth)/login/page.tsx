import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { GroupBrand } from "@/components/branding/group-brand";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupBrandingRepository } from "@/lib/server/group-branding";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [user, branding] = await Promise.all([getCurrentUser(), getGroupBrandingRepository().getSettings()]);
  if (user) {
    redirect("/dashboard");
  }
  const logoUrl = branding.logoVersion ? `/api/branding/logo?v=${encodeURIComponent(branding.logoVersion)}` : null;

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <Link href="/" className="mx-auto flex w-fit min-h-11 items-center gap-3" aria-label="Torna alla home">
          <GroupBrand groupName={branding.groupName} logoUrl={logoUrl} />
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
