import { redirect } from "next/navigation";

import { BackofficeShell } from "@/components/layout/backoffice-shell";
import { getGroupBrandingRepository } from "@/lib/server/group-branding";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const [user, branding] = await Promise.all([
    getCurrentUser(),
    getGroupBrandingRepository().getSettings(),
  ]);
  if (!user) {
    redirect("/login");
  }

  const logoUrl = branding.logoVersion ? `/api/branding/logo?v=${encodeURIComponent(branding.logoVersion)}` : null;
  return <BackofficeShell user={{ name: user.name, role: user.role }} groupName={branding.groupName} logoUrl={logoUrl}>{children}</BackofficeShell>;
}
