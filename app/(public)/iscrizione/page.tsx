import { FileWarning } from "lucide-react";

import { GroupBrand } from "@/components/branding/group-brand";
import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { getGroupBrandingSettings } from "@/lib/server/group-branding";
import { getActivePrivacyPolicySafely } from "@/lib/server/privacy-policy";
import { registerApplicantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const [privacyPolicy, branding] = await Promise.all([getActivePrivacyPolicySafely(), getGroupBrandingSettings()]);
  const logoUrl = branding.logoVersion
    ? `/api/branding/logo?v=${encodeURIComponent(branding.logoVersion)}`
    : null;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm sm:p-5">
          <GroupBrand
            groupName={branding.groupName}
            logoUrl={logoUrl}
            subtitle="Istanza di Pre-Iscrizione al Gruppo"
          />
        </header>
        {privacyPolicy ? (
          <RegistrationWizard privacyPolicy={privacyPolicy} submitAction={registerApplicantAction} />
        ) : (
          <Card>
            <CardContent className="flex gap-4 p-7">
              <FileWarning className="mt-1 size-7 shrink-0 text-amber-700" aria-hidden="true" />
              <div>
                <h1 className="font-slab text-2xl font-bold text-violet-950">Iscrizioni temporaneamente non disponibili</h1>
                <p className="mt-2 text-stone-600">
                  L’informativa privacy non è ancora configurata. Contatta il Gruppo prima di inviare dati personali.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
