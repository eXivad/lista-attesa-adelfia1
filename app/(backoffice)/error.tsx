"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function BackofficeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Errore backoffice", { name: error.name, digest: error.digest }); }, [error]);
  return <div className="rounded-3xl border border-red-200 bg-white p-8 text-center"><h1 className="font-slab text-2xl font-bold text-red-900">Operazione non disponibile</h1><p className="mt-3 text-stone-600">Si è verificato un errore tecnico. Riprova; se persiste, contatta il Capo Gruppo.</p><Button className="mt-5" onClick={reset}>Riprova</Button></div>;
}
