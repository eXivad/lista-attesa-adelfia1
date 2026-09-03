import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getAssociativeYearRepository } from "@/lib/server/associative-years";
import { requireCapability } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function StatisticsPage() {
  await requireCapability("statistics:read");
  const years = await getAssociativeYearRepository().getStatistics();
  return <div className="space-y-6">
    <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Snapshot anonimi</p><h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">Statistiche annuali</h1><p className="mt-2 text-stone-600">I conteggi restano disponibili anche dopo l’eliminazione dei dati personali.</p></div>
    {years.length === 0 ? <Card><CardContent className="py-10 text-center text-stone-600">Le statistiche saranno disponibili dopo la prima chiusura delle chiamate.</CardContent></Card> : years.map((year) => {
      const totals = year.statistics.reduce((sum, row) => ({ total: sum.total + row.totalCandidates, accepted: sum.accepted + row.accepted, refused: sum.refused + row.refused, remaining: sum.remaining + row.remaining }), { total: 0, accepted: 0, refused: 0, remaining: 0 });
      return <Card key={year.id}><CardHeader><h2 className="font-slab text-2xl font-bold text-violet-950">{year.label}</h2><div className="grid grid-cols-2 gap-3 pt-3 sm:grid-cols-4"><Metric label="Coinvolti" value={totals.total} /><Metric label="Accettati" value={totals.accepted} /><Metric label="Rifiutati" value={totals.refused} /><Metric label="Inevasi" value={totals.remaining} /></div></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="py-2">Branca</th><th>Sesso</th><th>Nascita</th><th>Totale</th><th>Accettati</th><th>Rifiutati</th><th>Inevasi</th></tr></thead><tbody>{year.statistics.map((row) => <tr className="border-b border-stone-100" key={row.id}><td className="py-3 font-bold">{row.branch}</td><td>{row.gender}</td><td>{row.birthYear}</td><td>{row.totalCandidates}</td><td>{row.accepted}</td><td>{row.refused}</td><td>{row.remaining}</td></tr>)}</tbody></table></div></CardContent></Card>;
    })}
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-stone-50 p-3"><p className="text-xs font-bold uppercase text-stone-500">{label}</p><p className="mt-1 font-slab text-2xl font-bold text-violet-950">{value}</p></div>;
}
