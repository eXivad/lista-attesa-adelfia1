"use client";

import { useActionState, useId } from "react";

import type { ApplicantActionState } from "@/app/(backoffice)/iscritti/[id]/actions";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface ApplicantEditValues {
  minor: {
    firstName: string; lastName: string; gender: "M" | "F"; birthDate: string;
    birthPlace: string; birthProvince: string; fiscalCode: string; residenceAddress: string;
    residenceCity: string; residenceProvince: string; residencePostalCode: string; notes: string;
  };
  guardians: Array<{
    type: "A" | "B"; firstName: string; lastName: string; birthDate: string;
    birthPlace: string; birthProvince: string; fiscalCode: string; address: string;
    city: string; province: string; postalCode: string; email: string; phone: string;
  }>;
}

interface ApplicantEditFormProps {
  action: (state: ApplicantActionState, formData: FormData) => Promise<ApplicantActionState>;
  values: ApplicantEditValues;
}

export function ApplicantEditForm({ action, values }: ApplicantEditFormProps) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  const formId = useId();
  return (
    <form
      id={formId}
      action={formAction}
      className="space-y-6"
    >
      <Card>
        <CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Dati del minore</h2></CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field name="minor.firstName" label="Nome" defaultValue={values.minor.firstName} />
          <Field name="minor.lastName" label="Cognome" defaultValue={values.minor.lastName} />
          <label className="space-y-2 text-sm font-bold text-stone-800">Sesso
            <select className="form-control" name="minor.gender" defaultValue={values.minor.gender} required>
              <option value="M">Maschio</option><option value="F">Femmina</option>
            </select>
          </label>
          <Field name="minor.birthDate" label="Data di nascita" type="date" defaultValue={values.minor.birthDate} />
          <Field name="minor.birthPlace" label="Luogo di nascita" defaultValue={values.minor.birthPlace} />
          <Field name="minor.birthProvince" label="Provincia di nascita" defaultValue={values.minor.birthProvince} maxLength={2} />
          <Field name="minor.fiscalCode" label="Codice Fiscale" defaultValue={values.minor.fiscalCode} maxLength={16} className="uppercase" />
          <Field name="minor.residenceAddress" label="Indirizzo di residenza" defaultValue={values.minor.residenceAddress} />
          <Field name="minor.residenceCity" label="Comune di residenza" defaultValue={values.minor.residenceCity} />
          <Field name="minor.residenceProvince" label="Provincia di residenza" defaultValue={values.minor.residenceProvince} maxLength={2} />
          <Field name="minor.residencePostalCode" label="CAP" defaultValue={values.minor.residencePostalCode} maxLength={12} inputMode="numeric" />
          <label className="space-y-2 text-sm font-bold text-stone-800 sm:col-span-2 lg:col-span-3">Note
            <Textarea name="minor.notes" defaultValue={values.minor.notes} maxLength={2000} />
          </label>
        </CardContent>
      </Card>

      {values.guardians.map((guardian) => (
        <Card key={guardian.type}>
          <CardHeader><h2 className="font-slab text-xl font-bold text-violet-950">Genitore {guardian.type}</h2></CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field name={`guardian.${guardian.type}.firstName`} label="Nome" defaultValue={guardian.firstName} />
            <Field name={`guardian.${guardian.type}.lastName`} label="Cognome" defaultValue={guardian.lastName} />
            <Field name={`guardian.${guardian.type}.birthDate`} label="Data di nascita" type="date" defaultValue={guardian.birthDate} />
            <Field name={`guardian.${guardian.type}.birthPlace`} label="Luogo di nascita" defaultValue={guardian.birthPlace} />
            <Field name={`guardian.${guardian.type}.birthProvince`} label="Provincia di nascita" defaultValue={guardian.birthProvince} maxLength={2} />
            <Field name={`guardian.${guardian.type}.fiscalCode`} label="Codice Fiscale" defaultValue={guardian.fiscalCode} maxLength={16} className="uppercase" />
            <Field name={`guardian.${guardian.type}.address`} label="Indirizzo" defaultValue={guardian.address} />
            <Field name={`guardian.${guardian.type}.city`} label="Comune" defaultValue={guardian.city} />
            <Field name={`guardian.${guardian.type}.province`} label="Provincia" defaultValue={guardian.province} maxLength={2} />
            <Field name={`guardian.${guardian.type}.postalCode`} label="CAP" defaultValue={guardian.postalCode} maxLength={12} inputMode="numeric" />
            <Field name={`guardian.${guardian.type}.email`} label="Email" type="email" defaultValue={guardian.email} />
            <Field name={`guardian.${guardian.type}.phone`} label="Cellulare" type="tel" defaultValue={guardian.phone} />
          </CardContent>
        </Card>
      ))}

      {state.status === "error" && <p role="alert" className="rounded-xl bg-red-50 p-4 font-medium text-red-800">{state.message}</p>}
      <div className="flex justify-end"><ConfirmationDialog formId={formId} triggerLabel="Salva modifiche" title="Conferma le modifiche" description="Confermi il salvataggio dei dati aggiornati dell’iscritto?" confirmLabel="Salva modifiche" pending={pending} pendingLabel="Salvataggio…" /></div>
    </form>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return <label className="space-y-2 text-sm font-bold text-stone-800">{label}<Input required={props.name === "minor.firstName" || props.name === "minor.lastName" || props.name === "minor.birthDate"} {...props} /></label>;
}
