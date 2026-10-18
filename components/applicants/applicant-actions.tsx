import { Check, RotateCcw, Trash2, UserRoundSearch, X } from "lucide-react";

import { ConfirmedActionForm } from "./confirmed-action-form";
import {
  changeApplicantStatusAction,
  deleteApplicantAction,
} from "@/app/(backoffice)/iscritti/[id]/actions";
import type { ApplicantStatus } from "@/modules/applicants/domain/state-machine";

interface ApplicantActionProps {
  id: string;
  name: string;
  status: ApplicantStatus;
  listQuery?: string;
}

export function ApplicantStatusActions({ id, name, status, listQuery = "" }: ApplicantActionProps) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {status === "IN_ATTESA" && (
        <ConfirmedActionForm
          action={changeApplicantStatusAction.bind(null, id, "DA_CHIAMARE", listQuery)}
          confirmation={`Confermi di voler spostare ${name} tra gli iscritti da chiamare?`}
          label="Da chiamare"
          variant="secondary"
          icon={<UserRoundSearch className="size-4" aria-hidden="true" />}
        />
      )}
      {status === "DA_CHIAMARE" && (
        <>
          <ConfirmedActionForm
            action={changeApplicantStatusAction.bind(null, id, "ACCETTATO", listQuery)}
            confirmation={`Confermi di voler segnare ${name} come ACCETTATO? Verrà inviata una comunicazione ai genitori.`}
            label="Accetta"
            icon={<Check className="size-4" aria-hidden="true" />}
          />
          <ConfirmedActionForm
            action={changeApplicantStatusAction.bind(null, id, "RIFIUTATO", listQuery)}
            confirmation={`Confermi di voler segnare ${name} come RIFIUTATO? Verrà inviata una comunicazione ai genitori.`}
            label="Rifiuta"
            variant="destructive"
            icon={<X className="size-4" aria-hidden="true" />}
          />
          <ConfirmedActionForm
            action={changeApplicantStatusAction.bind(null, id, "IN_ATTESA", listQuery)}
            confirmation={`Confermi di voler riportare ${name} in attesa?`}
            label="Riporta in attesa"
            variant="outline"
            icon={<RotateCcw className="size-4" aria-hidden="true" />}
          />
        </>
      )}
    </div>
  );
}

export function ApplicantDeleteAction({ id, name, listQuery = "" }: Pick<ApplicantActionProps, "id" | "name" | "listQuery">) {
  return (
    <ConfirmedActionForm
      action={deleteApplicantAction.bind(null, id, listQuery)}
      confirmation={`Confermi la cancellazione definitiva di ${name}? Questa operazione non può essere annullata.`}
      label="Cancella definitivamente"
      variant="destructive"
      icon={<Trash2 className="size-4" aria-hidden="true" />}
    />
  );
}
