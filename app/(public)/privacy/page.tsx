import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PrivacyDocumentViewer } from "@/components/privacy/privacy-document-viewer";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getActivePrivacyPolicySafely } from "@/lib/server/privacy-policy";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const policy = await getActivePrivacyPolicySafely();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link className="mb-5 inline-flex min-h-11 items-center gap-2 font-bold text-violet-800" href="/iscrizione">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Torna all’iscrizione
        </Link>
        <Card>
          <CardHeader>
            <h1 className="font-slab text-3xl font-bold text-violet-950">Informativa privacy</h1>
            {policy && <p className="text-stone-600">Versione {policy.version}</p>}
          </CardHeader>
          <CardContent>
            {policy ? (
              <PrivacyDocumentViewer fileUrl={policy.fileUrl} version={policy.version} />
            ) : (
              <p className="text-stone-700">Il documento ufficiale non è ancora configurato. Non inviare dati personali finché non sarà disponibile.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
