import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ApplicantStatus } from "@/modules/applicants/domain/state-machine";
import { BRANCH_COLORS, type Branch } from "@/modules/branches/domain/branch";

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

export function BranchBadge({ branch, className }: { branch: Branch | null; className?: string }) {
  return (
    <Badge className={cn(branch ? "text-stone-950 ring-1 ring-black/10" : "bg-stone-100 text-stone-700", className)} style={branch ? { backgroundColor: BRANCH_COLORS[branch] } : undefined}>
      {branch ? branch.replace(/([A-Z])/g, "$1/").slice(0, -1) : "Fuori branca"}
    </Badge>
  );
}
