import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicantStatus } from "@/modules/applicants/domain/state-machine";
import type { Branch } from "@/modules/branches/domain/branch";

const statusStyles: Record<ApplicantStatus, string> = {
  IN_ATTESA: "bg-amber-100 text-amber-950",
  DA_CHIAMARE: "bg-sky-100 text-sky-950",
  ACCETTATO: "bg-emerald-100 text-emerald-950",
  RIFIUTATO: "bg-red-100 text-red-950",
};

const statusLabels: Record<ApplicantStatus, string> = {
  IN_ATTESA: "In attesa",
  DA_CHIAMARE: "Da chiamare",
  ACCETTATO: "Accettato",
  RIFIUTATO: "Rifiutato",
};

export function StatusBadge({ status }: { status: ApplicantStatus }) {
  return <Badge className={statusStyles[status]}>{statusLabels[status]}</Badge>;
}

const branchStyles: Record<Branch, string> = {
  LC: "bg-yellow-100 text-yellow-950 ring-1 ring-yellow-300",
  EG: "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300",
  RS: "bg-red-100 text-red-950 ring-1 ring-red-300",
};

export function BranchBadge({ branch, className }: { branch: Branch | null; className?: string }) {
  return (
    <Badge className={cn(branch ? branchStyles[branch] : "bg-stone-100 text-stone-700", className)}>
      {branch ? branch.replace(/([A-Z])/g, "$1/").slice(0, -1) : "Fuori branca"}
    </Badge>
  );
}
