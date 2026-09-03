"use client";

import { useActionState } from "react";

import type { YearActionState } from "@/app/(backoffice)/anno-associativo/actions";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Action = (state: YearActionState, formData: FormData) => Promise<YearActionState>;

export function CreateYearForm({ action, proposedYear }: { action: Action; proposedYear: number }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} className="space-y-3" onSubmit={(event) => { if (!window.confirm(`Confermi la creazione del nuovo anno associativo?`)) event.preventDefault(); }}>
    <label className="block space-y-2 text-sm font-bold text-stone-800">Anno iniziale<Input name="startYear" type="number" min="2000" max="2100" defaultValue={proposedYear} required /></label>
    <Button disabled={pending} type="submit">{pending ? "Creazione…" : "Crea nuovo anno"}</Button>
    {state.status === "error" && <p role="alert" className="text-sm font-medium text-red-700">{state.message}</p>}
  </form>;
}

export function YearDangerForm({ action, label, confirmation, variant = "default" }: { action: Action; label: string; confirmation: string; variant?: ButtonProps["variant"] }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} className="space-y-2" onSubmit={(event) => { if (!window.confirm(confirmation)) event.preventDefault(); }}>
    <Button disabled={pending} type="submit" variant={variant}>{pending ? "Operazione…" : label}</Button>
    {state.status === "error" && <p role="alert" className="text-sm font-medium text-red-700">{state.message}</p>}
  </form>;
}

export function BranchConfigurationForm({ action, rows }: { action: Action; rows: Array<{ branch: "LC" | "EG" | "RS"; minAge: number; maxAge: number; entryAge: number; colorHex: string }> }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return <form action={formAction} className="space-y-5">
    <div className="grid gap-4 lg:grid-cols-3">{rows.map((row) => <fieldset key={row.branch} className="rounded-2xl border border-stone-200 p-4"><legend className="px-2 font-slab text-lg font-bold text-violet-950">{row.branch.replace(/([A-Z])/g, "$1/").slice(0, -1)}</legend>
      <div className="grid grid-cols-3 gap-2">
        <NumberField name={`${row.branch}.minAge`} label="Min" value={row.minAge} />
        <NumberField name={`${row.branch}.maxAge`} label="Max" value={row.maxAge} />
        <NumberField name={`${row.branch}.entryAge`} label="Ingresso" value={row.entryAge} />
      </div>
      <label className="mt-3 block space-y-2 text-xs font-bold text-stone-700">Colore<Input name={`${row.branch}.colorHex`} defaultValue={row.colorHex} pattern="#[0-9A-Fa-f]{6}" required /></label>
    </fieldset>)}</div>
    <Button type="submit" disabled={pending} variant="outline">{pending ? "Salvataggio…" : "Salva configurazione"}</Button>
    {state.status === "error" && <p role="alert" className="text-sm font-medium text-red-700">{state.message}</p>}
  </form>;
}

function NumberField({ name, label, value }: { name: string; label: string; value: number }) {
  return <label className="space-y-2 text-xs font-bold text-stone-700">{label}<Input name={name} type="number" min="0" max="30" defaultValue={value} required /></label>;
}
