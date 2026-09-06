import type { UseFormRegisterReturn } from "react-hook-form";

import { PrivacyDocumentViewer } from "@/components/privacy/privacy-document-viewer";

interface PrivacyConsentStepProps {
  policy: { version: string; fileUrl: string };
  error?: string;
  registration: UseFormRegisterReturn<"privacyAccepted">;
}

export function PrivacyConsentStep({ policy, error, registration }: PrivacyConsentStepProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-violet-50 p-5 text-sm leading-6 text-violet-950">
        Leggi l’informativa direttamente qui sotto. Dopo il documento potrai confermare di averla
        letta e proseguire con l’iscrizione.
      </div>
      <PrivacyDocumentViewer fileUrl={policy.fileUrl} version={policy.version} />
      <div>
        <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border border-stone-300 p-4">
          <input
            type="checkbox"
            className="mt-1 size-5 accent-violet-800"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "privacyAccepted-error" : undefined}
            {...registration}
          />
          <span className="text-sm leading-6 text-stone-800">
            Ho letto e accetto l’informativa privacy versione {policy.version}.
          </span>
        </label>
        {error && (
          <p id="privacyAccepted-error" role="alert" className="mt-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
