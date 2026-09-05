"use client";

import { useActionState, useId } from "react";

import type { ButtonProps } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import type { ApplicantActionState } from "@/app/(backoffice)/iscritti/[id]/actions";

interface ConfirmedActionFormProps {
  action: (state: ApplicantActionState, formData: FormData) => Promise<ApplicantActionState>;
  confirmation: string;
  label: string;
  variant?: ButtonProps["variant"];
  icon?: React.ReactNode;
}

export function ConfirmedActionForm({ action, confirmation, label, variant, icon }: ConfirmedActionFormProps) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const formId = useId();
  return (
    <form
      id={formId}
      action={formAction}
      className="space-y-2"
    >
      <ConfirmationDialog formId={formId} triggerLabel={label} title="Conferma operazione" description={confirmation} confirmLabel={label} pending={pending} variant={variant} className="w-full sm:w-auto" icon={icon} />
      {state.status === "error" && <p className="max-w-sm text-sm font-medium text-red-700" role="alert">{state.message}</p>}
    </form>
  );
}
