"use client";

import { AlertTriangle } from "lucide-react";
import { AlertDialog } from "radix-ui";

import { Button, type ButtonProps } from "@/components/ui/button";

interface ConfirmationDialogProps {
  formId: string;
  triggerLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  pendingLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  formId,
  triggerLabel,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annulla",
  pending = false,
  pendingLabel = "Operazione in corso…",
  variant = "default",
  size,
  className,
  icon,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>
        <Button type="button" variant={variant} size={size} className={className} disabled={pending}>
          {icon}
          {pending ? pendingLabel : triggerLabel}
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-violet-950/55 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-[60] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start gap-4">
            <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${variant === "destructive" ? "bg-red-100 text-red-700" : "bg-violet-100 text-violet-800"}`}>
              <AlertTriangle className="size-5" aria-hidden="true" />
            </span>
            <div>
              <AlertDialog.Title className="font-slab text-xl font-bold text-violet-950">{title}</AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm leading-6 text-stone-600">{description}</AlertDialog.Description>
            </div>
          </div>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="outline" disabled={pending}>{cancelLabel}</Button>
            </AlertDialog.Cancel>
            <Button type="submit" form={formId} variant={variant} disabled={pending}>
              {pending ? pendingLabel : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
