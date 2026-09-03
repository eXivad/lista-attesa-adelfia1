import Link from "next/link";
import { ArrowLeft, FileWarning } from "lucide-react";

import { RegistrationWizard } from "@/components/registration/registration-wizard";
import { Card, CardContent } from "@/components/ui/card";
import { getPrismaClient } from "@/lib/server/prisma";
import { PrismaPrivacyRepository } from "@/repositories/prisma/privacy.repository";
import { registerApplicantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RegistrationPage() {
  const privacyPolicy = await getPrivacyPolicySafely();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <Link className="mb-5 inline-flex min-h-11 items-center gap-2 font-bold text-violet-800" href="/">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Torna alla home
        </Link>
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

async function getPrivacyPolicySafely() {
  try {
    return await new PrismaPrivacyRepository(getPrismaClient()).getActive();
  } catch (error) {
    console.error("Privacy policy non disponibile", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}
