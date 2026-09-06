import { ExternalLink, FileText } from "lucide-react";

interface PrivacyDocumentViewerProps {
  fileUrl: string;
  version: string;
}

export function PrivacyDocumentViewer({ fileUrl, version }: PrivacyDocumentViewerProps) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm"
      aria-label={`Documento informativa privacy versione ${version}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2 font-slab font-bold text-violet-950">
          <span className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          Informativa privacy · versione {version}
        </p>
        <a
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-800 underline underline-offset-4"
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
        >
          Apri a schermo intero
          <ExternalLink className="size-4" aria-hidden="true" />
        </a>
      </div>
      <iframe
        className="h-[75vh] min-h-[32rem] w-full bg-white"
        src={fileUrl}
        title={`Informativa privacy versione ${version}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    </section>
  );
}
