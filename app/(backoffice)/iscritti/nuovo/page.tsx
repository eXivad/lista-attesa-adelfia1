import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { Button } from "@/components/ui/button";
import { requireCapability } from "@/lib/server/session";
import { getActivePrivacyPolicySafely } from "@/lib/server/privacy-policy";
import { registerBackofficeApplicantAction } from "./actions";

export default async function NewApplicantPage() {
  await requireCapability("applicants:create");
  const privacyPolicy = await getActivePrivacyPolicySafely();
  return <div className="mx-auto max-w-3xl space-y-5">
    <Button asChild variant="ghost" className="-ml-3"><Link href="/lista-attesa">
      <ArrowLeft className="size-4" aria-hidden="true" />Lista d’attesa
    </Link></Button>
    <RegistrationWizard mode="backoffice" privacyPolicy={privacyPolicy ?? undefined} submitAction={registerBackofficeApplicantAction} />
  </div>;
}
