import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  BranchConfigurationForm,
  CreateYearForm,
  YearDangerForm,
} from "@/components/years/year-management-forms";
import { formatDateTime } from "@/lib/date-time";
import { getAssociativeYearRepository } from "@/lib/server/associative-years";
import { requireCapability } from "@/lib/server/session";
import {
  closeCallsAction,
  createYearAction,
  openCallsAction,
  updateBranchesAction,
} from "./actions";

export const dynamic = "force-dynamic";

const statusLabels = {
  CREATED: "Creato",
  ACTIVE_CALLS_CLOSED: "Chiamate chiuse",
  CALLS_OPEN: "Chiamate aperte",
  CLOSED: "Concluso",
} as const;

export default async function AssociativeYearPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireCapability("years:manage");
  const [overview, messages] = await Promise.all([
    getAssociativeYearRepository().getManagementOverview(),
    searchParams,
  ]);
  const proposedYear = overview.current
    ? overview.current.startYear + 1
    : new Date().getFullYear();
  const notice =
    messages.created === "1"
      ? "Nuovo anno associativo creato con chiamate chiuse."
      : messages.opened === "1"
        ? "Chiamate aperte e candidati eleggibili selezionati."
        : messages.closed === "1"
          ? "Chiamate chiuse, statistiche salvate e residui riportati in attesa."
          : messages.branchesUpdated === "1"
            ? "Configurazione branche aggiornata."
            : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">
          Configurazione annuale
        </p>
        <h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">
          Anno Associativo
        </h1>
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-50 p-4 font-medium text-emerald-900"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-slab text-xl font-bold text-violet-950">
              Anno corrente
            </h2>
          </CardHeader>
          <CardContent>
            {overview.current ? (
              <div className="space-y-5">
                <div>
                  <p className="font-slab text-3xl font-bold text-violet-950">
                    {overview.current.label}
                  </p>
                  <p className="mt-1 font-bold text-stone-600">
                    {statusLabels[overview.current.status]}
                  </p>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-stone-500">Apertura</dt>
                    <dd className="font-medium">
                      {overview.current.callsOpenedAt
                        ? formatDateTime(overview.current.callsOpenedAt)
                        : "Non ancora aperte"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Ultima chiusura</dt>
                    <dd className="font-medium">
                      {overview.current.callsClosedAt
                        ? formatDateTime(overview.current.callsClosedAt)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                {overview.current.status === "ACTIVE_CALLS_CLOSED" && (
                  <YearDangerForm
                    action={openCallsAction}
                    label="Apri chiamate"
                    confirmation={`Vuoi aprire le chiamate per l'anno associativo ${overview.current.label}?`}
                  />
                )}
                {overview.current.status === "CALLS_OPEN" && (
                  <YearDangerForm
                    action={closeCallsAction}
                    label="Chiudi chiamate"
                    variant="destructive"
                    confirmation={`Confermi la chiusura delle chiamate ${overview.current.label}? Verrà creato lo snapshot statistico e gli inevasi torneranno in attesa.`}
                  />
                )}
              </div>
            ) : (
              <p className="text-stone-600">
                Nessun A.A. configurato.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-slab text-xl font-bold text-violet-950">
              Crea nuovo A.A.
            </h2>
            <p className="text-sm text-stone-600">
              La creazione non apre automaticamente le chiamate.
            </p>
          </CardHeader>
          <CardContent>
            <CreateYearForm
              action={createYearAction}
              proposedYear={proposedYear}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-slab text-xl font-bold text-violet-950">
            Soglie branche
          </h2>
          <p className="text-sm text-stone-600">
            Imposta l’età delle branche. Con queste informazioni viene calcolata automaticamente la branca dell’iscritto/a.
          </p>
        </CardHeader>
        <CardContent>
          {overview.branches.length === 3 ? (
            <BranchConfigurationForm
              action={updateBranchesAction}
              rows={overview.branches}
            />
          ) : (
            <p role="alert" className="text-red-700">
              Configurazione iniziale non presente: esegui il seed del database.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-slab text-xl font-bold text-violet-950">
            Storico anni
          </h2>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Anno</th>
                  <th>Stato</th>
                  <th>Chiusura</th>
                </tr>
              </thead>
              <tbody>
                {overview.years.map((year) => (
                  <tr className="border-b border-stone-100" key={year.id}>
                    <td className="py-3 font-bold">{year.label}</td>
                    <td>{statusLabels[year.status]}</td>
                    <td>
                      {year.callsClosedAt
                        ? formatDateTime(year.callsClosedAt)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
