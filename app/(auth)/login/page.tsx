import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { GroupBrand } from "@/components/branding/group-brand";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupBrandingSettings } from "@/lib/server/group-branding";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const [user, branding] = await Promise.all([getCurrentUser(), getGroupBrandingSettings()]);
  if (user) {
    redirect("/dashboard");
  }
  const logoUrl = branding.logoVersion ? `/api/branding/logo?v=${encodeURIComponent(branding.logoVersion)}` : null;

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-md space-y-5">
        <div className="mx-auto w-fit">
          <GroupBrand groupName={branding.groupName} logoUrl={logoUrl} />
        </div>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
