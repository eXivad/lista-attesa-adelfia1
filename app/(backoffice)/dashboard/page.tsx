import Link from "next/link";

import { StatusBadge } from "@/components/applicants/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/date-time";
import { getPrismaClient } from "@/lib/server/prisma";
import { requireCapability } from "@/lib/server/session";
import { PrismaDashboardRepository } from "@/repositories/prisma/dashboard.repository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireCapability("dashboard:read");
  const overview = await new PrismaDashboardRepository(getPrismaClient()).getOverview(new Date());
  const metrics = [
    ["Iscritti totali", overview.metrics.total],
    ["In attesa", overview.metrics.waiting],
    ["Da chiamare", overview.metrics.toCall],
    ["Accettati", overview.metrics.accepted],
    ["Rifiutati", overview.metrics.refused],
  ] as const;
  const maxMonthly = Math.max(1, ...overview.monthly.map(({ total }) => total));

  return <div className="space-y-6">
    <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Panoramica</p><h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">Dashboard</h1></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">{metrics.map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</p><p className="mt-2 font-slab text-3xl font-bold text-violet-950">{value}</p></CardContent></Card>)}</div>
    <div className="grid gap-6 xl:grid-cols-2"><ApplicantGroup title="In attesa da più tempo" entries={overview.oldest} /><ApplicantGroup title="Ultime iscrizioni" entries={overview.latest} /></div>
    <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Iscrizioni negli ultimi 12 mesi</h2></CardHeader><CardContent>{overview.monthly.length === 0 ? <p className="text-stone-600">Nessuna iscrizione nel periodo.</p> : <div className="flex min-h-56 items-end gap-2" role="img" aria-label="Grafico iscrizioni mensili">{overview.monthly.map((item) => <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={item.month}><span className="text-xs font-bold">{item.total}</span><div className="w-full rounded-t-lg bg-violet-700" style={{ height: `${Math.max(8, (item.total / maxMonthly) * 150)}px` }} /><span className="text-[10px] text-stone-600 [writing-mode:vertical-rl] sm:[writing-mode:initial]">{item.month}</span></div>)}</div>}</CardContent></Card>
  </div>;
}

function ApplicantGroup({ title, entries }: { title: string; entries: Array<{ id: string; firstName: string; lastName: string; registrationNumber: string; createdAt: Date; status: "IN_ATTESA" | "DA_CHIAMARE" | "ACCETTATO" | "RIFIUTATO" }> }) {
  return <Card><CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">{title}</h2></CardHeader><CardContent>{entries.length === 0 ? <p className="text-stone-600">Nessun iscritto.</p> : <ul className="divide-y divide-stone-100">{entries.map((entry) => <li className="flex items-center justify-between gap-3 py-3" key={entry.id}><div><Link className="font-bold text-violet-950 underline-offset-4 hover:underline" href={`/iscritti/${entry.id}`}>{entry.firstName} {entry.lastName}</Link><p className="text-xs text-stone-500">{entry.registrationNumber} · {formatDateTime(entry.createdAt)}</p></div><StatusBadge status={entry.status} /></li>)}</ul>}</CardContent></Card>;
}
