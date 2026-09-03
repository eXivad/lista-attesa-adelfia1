import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";

import { ApplicantActions } from "@/components/applicants/applicant-actions";
import { BranchBadge, StatusBadge } from "@/components/applicants/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/date-time";
import { getPrismaClient } from "@/lib/server/prisma";
import { requireCapability } from "@/lib/server/session";
import { calculateBranch } from "@/modules/branches/domain/branch";
import { PrismaApplicantQueryRepository } from "@/repositories/prisma/applicant-query.repository";

export const dynamic = "force-dynamic";

export default async function ApplicantDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireCapability("applicants:read");
  const { id } = await params;
  const result = await new PrismaApplicantQueryRepository(getPrismaClient()).getById(id);
  if (!result.entry) notFound();

  const entry = result.entry;
  const branch = calculateBranch(entry.birthDate, new Date(), result.branchConfiguration);
  const messages = await searchParams;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="-ml-3"><Link href="/lista-attesa"><ArrowLeft className="size-4" aria-hidden="true" />Lista d’attesa</Link></Button>
      {(messages.updated === "1" || messages.statusChanged === "1") && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900">
          {messages.updated === "1" ? "Dati aggiornati correttamente." : "Stato aggiornato correttamente."}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">{entry.registrationNumber}</p>
          <h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">{entry.firstName} {entry.lastName}</h1>
          <div className="mt-3 flex flex-wrap gap-2"><StatusBadge status={entry.status} /><BranchBadge branch={branch} /></div>
        </div>
        <div>
          <Button asChild variant="outline"><Link href={`/iscritti/${entry.id}/modifica`}><Pencil className="size-4" aria-hidden="true" />Modifica</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Dati del minore</h2></CardHeader>
        <CardContent><InfoGrid rows={[
          ["Nome", entry.firstName], ["Cognome", entry.lastName], ["Sesso", entry.gender === "M" ? "Maschio" : "Femmina"],
          ["Data di nascita", formatDate(entry.birthDate)], ["Anno di nascita", String(entry.birthYear)], ["Luogo di nascita", entry.birthPlace],
          ["Provincia", entry.birthProvince], ["Codice Fiscale", entry.fiscalCode], ["Data iscrizione", formatDateTime(entry.createdAt)],
          ["Branca calcolata", branch ?? "Fuori branca"], ["Versione privacy", entry.privacyPolicyVersion], ["Consenso privacy", formatDateTime(entry.privacyAcceptedAt)],
        ]} /></CardContent>
      </Card>

      {entry.guardians.map((guardian) => (
        <Card key={guardian.id}>
          <CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Genitore {guardian.type}</h2></CardHeader>
          <CardContent><InfoGrid rows={[
            ["Nome", guardian.firstName], ["Cognome", guardian.lastName], ["Data di nascita", formatDate(guardian.birthDate)],
            ["Luogo di nascita", guardian.birthPlace], ["Provincia di nascita", guardian.birthProvince], ["Codice Fiscale", guardian.fiscalCode],
            ["Indirizzo", guardian.address], ["Comune", guardian.city], ["Provincia", guardian.province],
            ["Email", guardian.email], ["Cellulare", guardian.phone],
          ]} /></CardContent>
        </Card>
      ))}

      <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Note</h2></CardHeader><CardContent><p className="whitespace-pre-wrap text-stone-700">{entry.notes || "Nessuna nota."}</p></CardContent></Card>

      <Card>
        <CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Azioni</h2><p className="text-sm text-stone-600">Le operazioni di stato e cancellazione richiedono sempre conferma.</p></CardHeader>
        <CardContent><ApplicantActions id={entry.id} name={`${entry.firstName} ${entry.lastName}`} status={entry.status} /></CardContent>
      </Card>
    </div>
  );
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{rows.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-stone-900">{value}</dd></div>)}</dl>;
}
