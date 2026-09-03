"use client";

import { useActionState } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
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
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
      className="space-y-2"
    >
      <Button type="submit" variant={variant} disabled={pending} className="w-full sm:w-auto">
        {icon}{pending ? "Operazione…" : label}
      </Button>
      {state.status === "error" && <p className="max-w-sm text-sm font-medium text-red-700" role="alert">{state.message}</p>}
    </form>
  );
}
