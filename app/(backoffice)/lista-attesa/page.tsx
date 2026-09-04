import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";

import { BranchBadge, StatusBadge } from "@/components/applicants/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/date-time";
import { getPrismaClient } from "@/lib/server/prisma";
import { requireCapability } from "@/lib/server/session";
import { applicantListQuerySchema } from "@/modules/applicants/schemas/list-query";
import { calculateBranch } from "@/modules/branches/domain/branch";
import { PrismaApplicantQueryRepository } from "@/repositories/prisma/applicant-query.repository";

export const dynamic = "force-dynamic";

interface ApplicantListPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ApplicantListPage({ searchParams }: ApplicantListPageProps) {
  await requireCapability("applicants:read");
  const rawFilters = await searchParams;
  const filters = applicantListQuerySchema.parse(rawFilters);
  const result = await new PrismaApplicantQueryRepository(getPrismaClient()).list(filters);
  const referenceDate = new Date();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Gestione iscritti</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-slab text-3xl font-bold text-violet-950">Lista d’attesa</h1>
            <p className="mt-2 text-stone-600">{result.total} iscritti trovati, sempre in ordine cronologico.</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5">
          <form
            method="get"
            className="grid gap-3 lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_10rem_auto]"
          >
            <label className="space-y-1">
              <span className="block text-xs font-medium text-stone-600">
                Cerca
              </span>

              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-stone-400"
                  aria-hidden="true"
                />

                <input
                  className="form-control w-full !pl-11"
                  name="query"
                  defaultValue={filters.query}
                  placeholder="Nome, CF, genitore, telefono…"
                />
              </div>
            </label>

            <div className="space-y-1">
              <span className="block text-xs font-medium text-stone-600">
                Sesso
              </span>

              <FilterSelect
                name="gender"
                label="Sesso"
                defaultValue={filters.gender}
                options={[
                  ["", "Entrambi"],
                  ["M", "Maschi"],
                  ["F", "Femmine"],
                ]}
              />
            </div>

            <label className="space-y-1">
              <span className="block text-xs font-medium text-stone-600">
                Anno di nascita
              </span>

              <input
                className="form-control"
                type="number"
                name="birthYear"
                min="1900"
                max="2200"
                defaultValue={filters.birthYear}
                placeholder="Anno nascita"
              />
            </label>

            <div className="space-y-1">
              <span className="block text-xs font-medium text-stone-600">
                Stato iscrizione
              </span>

              <FilterSelect
                name="status"
                label="Stato"
                defaultValue={filters.status}
                options={[
                  ["", "Tutti gli stati"],
                  ["IN_ATTESA", "In attesa"],
                  ["DA_CHIAMARE", "Da chiamare"],
                  ["ACCETTATO", "Accettato"],
                  ["RIFIUTATO", "Rifiutato"],
                ]}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full lg:w-auto">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filtra
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result.items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-stone-600">Nessun iscritto corrisponde ai filtri selezionati.</CardContent></Card>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {result.items.map((entry) => {
              const branch = calculateBranch(entry.birthDate, referenceDate, result.branchConfiguration);
              return (
                <Card key={entry.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-stone-500">Posizione {entry.position}</p>
                        <h2 className="mt-1 font-slab text-xl font-bold text-violet-950">{entry.firstName} {entry.lastName}</h2>
                      </div>
                      <StatusBadge status={entry.status} />
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div><dt className="text-stone-500">Nascita</dt><dd className="font-medium text-stone-900">{formatDate(entry.birthDate)}</dd></div>
                      <div><dt className="text-stone-500">Branca</dt><dd className="mt-1"><BranchBadge branch={branch} /></dd></div>
                      <div className="col-span-2"><dt className="text-stone-500">Iscrizione</dt><dd className="font-medium text-stone-900">{formatDateTime(entry.createdAt)}</dd></div>
                    </dl>
                    <Button asChild variant="outline" className="mt-5 w-full"><Link href={`/iscritti/${entry.id}`}>Apri dettaglio</Link></Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-stone-200 bg-white md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-violet-950 text-white">
                <tr><th className="px-4 py-3">Pos.</th><th className="px-4 py-3">Iscritto</th><th className="px-4 py-3">Nascita</th><th className="px-4 py-3">Branca</th><th className="px-4 py-3">Iscrizione</th><th className="px-4 py-3">Stato</th><th className="px-4 py-3"><span className="sr-only">Azioni</span></th></tr>
              </thead>
              <tbody>
                {result.items.map((entry) => (
                  <tr key={entry.id} className="border-t border-stone-100">
                    <td className="px-4 py-4 font-bold text-stone-500">{entry.position}</td>
                    <td className="px-4 py-4 font-bold text-violet-950">{entry.firstName} {entry.lastName}</td>
                    <td className="px-4 py-4 text-stone-700">{formatDate(entry.birthDate)}</td>
                    <td className="px-4 py-4"><BranchBadge branch={calculateBranch(entry.birthDate, referenceDate, result.branchConfiguration)} /></td>
                    <td className="px-4 py-4 text-stone-700">{formatDateTime(entry.createdAt)}</td>
                    <td className="px-4 py-4"><StatusBadge status={entry.status} /></td>
                    <td className="px-4 py-4 text-right"><Button asChild variant="ghost" size="sm"><Link href={`/iscritti/${entry.id}`}>Dettaglio</Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <nav
        className="flex items-center justify-between gap-4"
        aria-label="Paginazione"
      >
        <Button
          asChild={filters.page > 1}
          variant="outline"
          disabled={filters.page <= 1}
        >
          {filters.page > 1 ? (
            <Link href={pageHref(rawFilters, filters.page - 1)}>
              <span className="inline-flex items-center justify-center gap-3">
                <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
                <span>Precedente</span>
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center gap-3">
              <ChevronLeft className="size-4 shrink-0" aria-hidden="true" />
              <span>Precedente</span>
            </span>
          )}
        </Button>

        <p className="text-sm font-bold text-stone-700">
          Pagina {filters.page} di {result.pageCount}
        </p>

        <Button
          asChild={filters.page < result.pageCount}
          variant="outline"
          disabled={filters.page >= result.pageCount}
        >
          {filters.page < result.pageCount ? (
            <Link href={pageHref(rawFilters, filters.page + 1)}>
              <span className="inline-flex items-center justify-center gap-3">
                <span>Successiva</span>
                <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
              </span>
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center gap-3">
              <span>Successiva</span>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </span>
          )}
        </Button>
      </nav>
    </div>
  );
}

function FilterSelect({ name, label, defaultValue, options }: { name: string; label: string; defaultValue?: string; options: string[][] }) {
  return (
    <label><span className="sr-only">{label}</span><select className="form-control" name={name} defaultValue={defaultValue ?? ""}>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>
  );
}

function pageHref(raw: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const key of ["query", "gender", "birthYear", "status"]) {
    const value = raw[key];
    if (typeof value === "string" && value) params.set(key, value);
  }
  params.set("page", String(page));
  return `/lista-attesa?${params.toString()}`;
}
