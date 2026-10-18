"use client";

import Link from "next/link";
import { cloneElement, isValidElement, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { get, useForm, type FieldPath, type Resolver } from "react-hook-form";

import { PrivacyConsentStep } from "@/components/registration/privacy-consent-step";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createApplicantRegistrationSchema,
  type ApplicantRegistrationInput,
} from "@/modules/applicants/schemas/registration";
import { createBackofficeApplicantDataSchema } from "@/modules/applicants/schemas/backoffice-applicant-data";
import { cn } from "@/lib/utils";

const publicSteps = ["Dati del minore", "Genitore A", "Genitore B", "Privacy", "Riepilogo", "Conferma"];
const backofficeSteps = ["Dati del minore", "Genitore A", "Genitore B", "Privacy", "Riepilogo", "Conferma"];

const stepFields: Array<Array<FieldPath<ApplicantRegistrationInput>>> = [
  [
    "minor.firstName",
    "minor.lastName",
    "minor.gender",
    "minor.birthDate",
    "minor.birthPlace",
    "minor.birthProvince",
    "minor.fiscalCode",
    "minor.residenceAddress",
    "minor.residenceCity",
    "minor.residenceProvince",
    "minor.residencePostalCode",
    "minor.notes",
  ],
  [
    "guardians.0.firstName",
    "guardians.0.lastName",
    "guardians.0.birthDate",
    "guardians.0.birthPlace",
    "guardians.0.birthProvince",
    "guardians.0.fiscalCode",
    "guardians.0.address",
    "guardians.0.city",
    "guardians.0.province",
    "guardians.0.postalCode",
    "guardians.0.email",
    "guardians.0.phone",
  ],
  [
    "guardians.1.firstName",
    "guardians.1.lastName",
    "guardians.1.birthDate",
    "guardians.1.birthPlace",
    "guardians.1.birthProvince",
    "guardians.1.fiscalCode",
    "guardians.1.address",
    "guardians.1.city",
    "guardians.1.province",
    "guardians.1.postalCode",
    "guardians.1.email",
    "guardians.1.phone",
  ],
  ["privacyAccepted"],
  [],
];

export type RegisterApplicantActionResult =
  | { status: "idle" }
  | { status: "success"; registrationNumber: string; emailDelivery: "SENT" | "FAILED" | "NOT_SENT"; id?: string }
  | { status: "error"; message: string };

interface RegistrationWizardProps {
  privacyPolicy?: { version: string; fileUrl: string };
  mode?: "public" | "backoffice";
  submitAction: (input: ApplicantRegistrationInput) => Promise<RegisterApplicantActionResult>;
}

export function RegistrationWizard({ privacyPolicy, submitAction, mode = "public" }: RegistrationWizardProps) {
  const isBackoffice = mode === "backoffice";
  const steps = isBackoffice ? backofficeSteps : publicSteps;
  const summaryStep = steps.length - 2;
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RegisterApplicantActionResult>({ status: "idle" });
  const schema = useMemo(() => isBackoffice
    ? createBackofficeApplicantDataSchema(() => new Date(), true)
    : createApplicantRegistrationSchema(), [isBackoffice]);
  const form = useForm<ApplicantRegistrationInput>({
    resolver: zodResolver(schema) as Resolver<ApplicantRegistrationInput>,
    mode: "onTouched",
    defaultValues: {
      minor: {
        firstName: "",
        lastName: "",
        gender: "M",
        birthDate: "",
        birthPlace: "",
        birthProvince: "",
        fiscalCode: "",
        residenceAddress: "",
        residenceCity: "",
        residenceProvince: "",
        residencePostalCode: "",
        notes: "",
      },
      guardians: [emptyGuardian("A"), emptyGuardian("B")],
      privacyAccepted: false,
      privacyPolicyVersion: privacyPolicy?.version ?? "",
    },
  });

  const values = form.getValues();
  const errorFor = (name: FieldPath<ApplicantRegistrationInput>) => {
    const error = get(form.formState.errors, name);
    return typeof error?.message === "string" ? error.message : undefined;
  };

  async function goForward() {
    const isValid = await form.trigger(stepFields[step], { shouldFocus: true });
    if (isValid) {
      setStep((current) => Math.min(current + 1, summaryStep));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const onSubmit = form.handleSubmit(async (input) => {
    setPending(true);
    setResult({ status: "idle" });
    try {
      const actionResult = await submitAction(isBackoffice ? form.getValues() : input);
      setResult(actionResult);
      if (actionResult.status === "success") {
        setStep(summaryStep + 1);
      }
    } finally {
      setPending(false);
    }
  });

  if (result.status === "success") {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-5 py-12 text-center" aria-live="polite">
          <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <Check className="size-8" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <p className="font-slab text-3xl font-bold text-violet-950">Iscrizione completata</p>
            <p className="max-w-lg text-stone-600">
              Conserva il numero della pratica: potrà essere utilizzato per richiedere assistenza al Gruppo.
            </p>
            {!isBackoffice && <p className="max-w-lg text-stone-600">
              Riceverai un’email a breve agli indirizzi indicati nel modulo. 📩 Se non la trovi, controlla anche la cartella Spam o Posta indesiderata.
            </p>}
          </div>
          <strong className="rounded-2xl bg-violet-50 px-6 py-4 font-mono text-xl tracking-wide text-violet-950">
            {result.registrationNumber}
          </strong>
          {isBackoffice && result.id && <Button asChild><Link href={`/iscritti/${result.id}`}>Apri dettaglio</Link></Button>}
          {isBackoffice && result.emailDelivery === "SENT" && (
            <p className="text-sm text-emerald-900">Conferma inviata agli indirizzi email indicati.</p>
          )}
          {isBackoffice && result.emailDelivery === "NOT_SENT" && (
            <p className="text-sm text-stone-600">Nessuna email indicata: conferma non inviata.</p>
          )}
          {isBackoffice && result.emailDelivery === "FAILED" && (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
              Iscrizione salvata, ma la mail di conferma non è partita.
            </p>
          )}
          {!isBackoffice && result.emailDelivery === "FAILED" && (
            <p className="max-w-lg rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
              La pratica è valida, ma la mail di conferma non è partita. I Capi potranno verificarne l’invio.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-slab mt-2 text-3xl font-bold text-violet-950 sm:text-4xl">
          {isBackoffice ? "Nuova iscrizione dalla segreteria" : "Modulo di Pre-Iscrizione al Gruppo"}
        </h1>
        <p className="mt-3 max-w-2xl text-stone-600">
          {isBackoffice
            ? "Inserisci i dati disponibili. Per il minore sono richiesti nome, cognome, sesso e data di nascita; i genitori sono facoltativi. La conferma sarà inviata agli indirizzi email indicati."
            : "Completa tutti i passaggi. Potrai verificare le informazioni inserite prima dell’invio definitivo."}
        </p>
        {!isBackoffice && privacyPolicy && <p className="mt-3 text-sm font-medium text-violet-800">
          Nel passaggio dedicato potrai leggere l’informativa privacy completa, versione {privacyPolicy.version}, prima di confermare la richiesta.
        </p>}
      </div>

      <nav
        aria-label="Avanzamento iscrizione"
        className="overflow-x-auto rounded-lg pb-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
        tabIndex={0}
      >
        <ol className="flex min-w-max items-center gap-2">
          {steps.map((label, index) => (
            <li key={label} className="flex items-center gap-2">
              <span
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs font-bold",
                  index === step && "border-violet-800 bg-violet-800 text-white",
                  index < step && "border-emerald-200 bg-emerald-50 text-emerald-900",
                  index > step && "border-stone-200 bg-white text-stone-500",
                )}
              >
                <span aria-hidden="true">{index < step ? "✓" : index + 1}</span>
                <span>{label}</span>
              </span>
              {index < steps.length - 1 && <span className="h-px w-3 bg-stone-300" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </nav>

      <Card>
        <CardHeader>
          <p className="text-sm font-bold text-violet-700">Passaggio {step + 1} di {summaryStep + 1}</p>
          <h2 className="font-slab text-2xl font-bold text-violet-950">{steps[step]}</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            {step === 0 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Nome" name="minor.firstName" error={errorFor("minor.firstName")}>
                  <Input id="minor.firstName" autoComplete="given-name" {...form.register("minor.firstName")} />
                </FormField>
                <FormField label="Cognome" name="minor.lastName" error={errorFor("minor.lastName")}>
                  <Input id="minor.lastName" autoComplete="family-name" {...form.register("minor.lastName")} />
                </FormField>
                <FormField label="Sesso" name="minor.gender" error={errorFor("minor.gender")}>
                  <select id="minor.gender" className="form-control" {...form.register("minor.gender")}>
                    <option value="M">Maschio</option>
                    <option value="F">Femmina</option>
                  </select>
                </FormField>
                <FormField label="Data di nascita" name="minor.birthDate" error={errorFor("minor.birthDate")}>
                  <Input id="minor.birthDate" type="date" {...form.register("minor.birthDate")} />
                </FormField>
                <FormField label="Luogo di nascita" name="minor.birthPlace" error={errorFor("minor.birthPlace")}>
                  <Input id="minor.birthPlace" {...form.register("minor.birthPlace")} />
                </FormField>
                <FormField label="Provincia di nascita" name="minor.birthProvince" error={errorFor("minor.birthProvince")} hint="Sigla di due lettere">
                  <Input id="minor.birthProvince" maxLength={2} autoCapitalize="characters" {...form.register("minor.birthProvince")} />
                </FormField>
                <FormField label="Codice Fiscale" name="minor.fiscalCode" error={errorFor("minor.fiscalCode")} className="sm:col-span-2">
                  <Input id="minor.fiscalCode" maxLength={24} autoCapitalize="characters" {...form.register("minor.fiscalCode")} />
                </FormField>
                <FormField label="Indirizzo di residenza" name="minor.residenceAddress" error={errorFor("minor.residenceAddress")} className="sm:col-span-2">
                  <Input id="minor.residenceAddress" autoComplete="street-address" {...form.register("minor.residenceAddress")} />
                </FormField>
                <FormField label="Comune di residenza" name="minor.residenceCity" error={errorFor("minor.residenceCity")}>
                  <Input id="minor.residenceCity" autoComplete="address-level2" {...form.register("minor.residenceCity")} />
                </FormField>
                <FormField label="Provincia di residenza" name="minor.residenceProvince" error={errorFor("minor.residenceProvince")}>
                  <Input id="minor.residenceProvince" maxLength={2} autoComplete="address-level1" {...form.register("minor.residenceProvince")} />
                </FormField>
                <FormField label="CAP" name="minor.residencePostalCode" error={errorFor("minor.residencePostalCode")}>
                  <Input id="minor.residencePostalCode" inputMode="numeric" autoComplete="postal-code" maxLength={12} {...form.register("minor.residencePostalCode")} />
                </FormField>
                <FormField label="Note" name="minor.notes" error={errorFor("minor.notes")} className="sm:col-span-2" hint="Provenienza da altro gruppo, fratelli o sorelle nel gruppo, residenza fuori paese o altre informazioni utili.">
                  <Textarea id="minor.notes" {...form.register("minor.notes")} />
                </FormField>
              </div>
            )}

            {(step === 1 || step === 2) && (
              <><p className="mb-5 text-sm text-stone-600">{isBackoffice ? "Compila solo i dati disponibili; puoi lasciare vuoto questo genitore." : "Inserisci i dati del genitore o tutore."}</p><GuardianFields
                index={step - 1 as 0 | 1}
                register={form.register}
                errorFor={errorFor}
              /></>
            )}

            {step === 3 && (privacyPolicy ? (
              <PrivacyConsentStep
                policy={privacyPolicy}
                error={errorFor("privacyAccepted")}
                registration={form.register("privacyAccepted")}
                variant={isBackoffice ? "paper" : "public"}
              />
            ) : isBackoffice ? (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
                Nessuna informativa attiva: il consenso cartaceo non può essere registrato in questa iscrizione.
              </p>
            ) : null)}

            {step === summaryStep && <RegistrationSummary values={values} isBackoffice={isBackoffice} />}

            {result.status === "error" && (
              <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-900">
                {result.message}
              </p>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0 || pending}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Indietro
              </Button>
              {step < summaryStep ? (
                <Button key="continue" type="button" onClick={goForward}>
                  Continua
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button key="submit" type="submit" disabled={pending}>
                  {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
                  {pending ? "Invio in corso…" : "Conferma iscrizione"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function emptyGuardian(type: "A" | "B") {
  return {
    type,
    firstName: "",
    lastName: "",
    birthDate: "",
    birthPlace: "",
    birthProvince: "",
    fiscalCode: "",
    address: "",
    city: "",
    province: "",
    postalCode: "",
    email: "",
    phone: "",
  };
}

interface GuardianFieldsProps {
  index: 0 | 1;
  register: ReturnType<typeof useForm<ApplicantRegistrationInput>>["register"];
  errorFor: (name: FieldPath<ApplicantRegistrationInput>) => string | undefined;
}

function GuardianFields({ index, register, errorFor }: GuardianFieldsProps) {
  const prefix = `guardians.${index}` as const;
  const field = (name: string) => `${prefix}.${name}` as FieldPath<ApplicantRegistrationInput>;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" value={index === 0 ? "A" : "B"} {...register(field("type"))} />
      <FormField label="Nome" name={field("firstName")} error={errorFor(field("firstName"))}>
        <Input id={field("firstName")} autoComplete="given-name" {...register(field("firstName"))} />
      </FormField>
      <FormField label="Cognome" name={field("lastName")} error={errorFor(field("lastName"))}>
        <Input id={field("lastName")} autoComplete="family-name" {...register(field("lastName"))} />
      </FormField>
      <FormField label="Data di nascita" name={field("birthDate")} error={errorFor(field("birthDate"))}>
        <Input id={field("birthDate")} type="date" {...register(field("birthDate"))} />
      </FormField>
      <FormField label="Luogo di nascita" name={field("birthPlace")} error={errorFor(field("birthPlace"))}>
        <Input id={field("birthPlace")} {...register(field("birthPlace"))} />
      </FormField>
      <FormField label="Provincia di nascita" name={field("birthProvince")} error={errorFor(field("birthProvince"))}>
        <Input id={field("birthProvince")} maxLength={2} {...register(field("birthProvince"))} />
      </FormField>
      <FormField label="Codice Fiscale" name={field("fiscalCode")} error={errorFor(field("fiscalCode"))}>
        <Input id={field("fiscalCode")} autoCapitalize="characters" {...register(field("fiscalCode"))} />
      </FormField>
      <FormField label="Indirizzo di residenza" name={field("address")} error={errorFor(field("address"))} className="sm:col-span-2">
        <Input id={field("address")} autoComplete="street-address" {...register(field("address"))} />
      </FormField>
      <FormField label="Comune di residenza" name={field("city")} error={errorFor(field("city"))}>
        <Input id={field("city")} autoComplete="address-level2" {...register(field("city"))} />
      </FormField>
      <FormField label="Provincia di residenza" name={field("province")} error={errorFor(field("province"))}>
        <Input id={field("province")} maxLength={2} autoComplete="address-level1" {...register(field("province"))} />
      </FormField>
      <FormField label="CAP" name={field("postalCode")} error={errorFor(field("postalCode"))}>
        <Input id={field("postalCode")} inputMode="numeric" autoComplete="postal-code" maxLength={12} {...register(field("postalCode"))} />
      </FormField>
      <FormField label="Email" name={field("email")} error={errorFor(field("email"))}>
        <Input id={field("email")} type="email" inputMode="email" autoComplete="email" {...register(field("email"))} />
      </FormField>
      <FormField label="Cellulare" name={field("phone")} error={errorFor(field("phone"))}>
        <Input id={field("phone")} type="tel" inputMode="tel" autoComplete="tel" {...register(field("phone"))} />
      </FormField>
    </div>
  );
}

function RegistrationSummary({ values, isBackoffice }: { values: ApplicantRegistrationInput; isBackoffice: boolean }) {
  return (
    <div className="space-y-6">
      <SummarySection title="Minore" rows={[
        ["Nome", `${values.minor.firstName} ${values.minor.lastName}`],
        ["Data di nascita", values.minor.birthDate],
        ["Sesso", values.minor.gender === "M" ? "Maschio" : "Femmina"],
        ["Codice Fiscale", values.minor.fiscalCode],
        ["Residenza", `${values.minor.residenceAddress}, ${values.minor.residenceCity} (${values.minor.residenceProvince}) ${values.minor.residencePostalCode}`],
      ]} />
      {values.guardians.filter((guardian) => !isBackoffice ||
        Object.entries(guardian).some(([key, value]) => key !== "type" && Boolean(value))).map((guardian) => (
        <SummarySection
          key={guardian.type}
          title={`Genitore ${guardian.type}`}
          rows={[
            ["Nome", `${guardian.firstName} ${guardian.lastName}`],
            ["Email", guardian.email],
            ["Cellulare", guardian.phone],
            ["Residenza", `${guardian.address}, ${guardian.city} (${guardian.province}) ${guardian.postalCode}`],
          ]}
        />
      ))}
      {!isBackoffice && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">
        Consenso privacy versione <strong>{values.privacyPolicyVersion}</strong> confermato.
      </p>}
      {isBackoffice && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
        {values.privacyAccepted
          ? `Consenso raccolto tramite modulo cartaceo per l'informativa versione ${values.privacyPolicyVersion}.`
          : "Consenso privacy cartaceo non registrato."}
        {values.guardians.some((guardian) => guardian.email.trim())
          ? " La conferma sarà inviata agli indirizzi email indicati."
          : " Nessuna email di conferma sarà inviata."}
      </p>}
    </div>
  );
}

function SummarySection({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section aria-labelledby={`summary-${title.replaceAll(" ", "-")}`}>
      <h3 id={`summary-${title.replaceAll(" ", "-")}`} className="font-slab text-lg font-bold text-violet-950">
        {title}
      </h3>
      <dl className="mt-3 grid gap-3 rounded-2xl bg-stone-50 p-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-bold uppercase tracking-wide text-stone-500">{label}</dt>
            <dd className="mt-1 break-words text-sm text-stone-900">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FormField({
  label,
  name,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const control = isValidElement<Record<string, unknown>>(children)
    ? cloneElement(children, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;
  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-bold text-stone-800" htmlFor={name}>
        {label}
      </label>
      {control}
      {hint && <p id={hintId} className="text-xs leading-5 text-stone-500">{hint}</p>}
      {error && <FieldError id={errorId} message={error} />}
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string }) {
  return <p id={id} role="alert" className="text-sm font-medium text-red-700">{message}</p>;
}
