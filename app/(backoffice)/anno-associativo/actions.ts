"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAssociativeYearRepository, getAssociativeYearService } from "@/lib/server/associative-years";
import { requireCapability } from "@/lib/server/session";
import { BRANCHES } from "@/modules/branches/domain/branch";
import { branchConfigurationsSchema } from "@/modules/branches/schemas/branch-configuration";
import { AssociativeYearError } from "@/modules/years/services/associative-year.service";

export type YearActionState = { status: "idle" } | { status: "error"; message: string };

export async function createYearAction(_state: YearActionState, formData: FormData): Promise<YearActionState> {
  void _state;
  await requireCapability("years:manage");
  const startYear = z.coerce.number().int().safeParse(formData.get("startYear"));
  if (!startYear.success) return { status: "error", message: "Inserisci un anno valido." };
  try {
    await getAssociativeYearService().create(startYear.data);
  } catch (error) {
    return yearError(error, "Non è stato possibile creare l'anno associativo.");
  }
  revalidatePath("/anno-associativo");
  redirect("/anno-associativo?created=1");
}

export async function openCallsAction(_state: YearActionState, _formData: FormData): Promise<YearActionState> {
  void _state; void _formData;
  await requireCapability("years:manage");
  try {
    await getAssociativeYearService().openCalls();
  } catch (error) {
    return yearError(error, "Non è stato possibile aprire le chiamate.");
  }
  revalidatePath("/anno-associativo"); revalidatePath("/lista-attesa"); revalidatePath("/dashboard");
  redirect("/anno-associativo?opened=1");
}

export async function closeCallsAction(_state: YearActionState, _formData: FormData): Promise<YearActionState> {
  void _state; void _formData;
  await requireCapability("years:manage");
  try {
    await getAssociativeYearService().closeCalls();
  } catch (error) {
    return yearError(error, "Non è stato possibile chiudere le chiamate.");
  }
  revalidatePath("/anno-associativo"); revalidatePath("/lista-attesa"); revalidatePath("/dashboard"); revalidatePath("/statistiche");
  redirect("/anno-associativo?closed=1");
}

export async function updateBranchesAction(_state: YearActionState, formData: FormData): Promise<YearActionState> {
  void _state;
  await requireCapability("branches:manage");
  const parsed = branchConfigurationsSchema.safeParse(BRANCHES.map((branch) => ({
    branch,
    minAge: formData.get(`${branch}.minAge`),
    maxAge: formData.get(`${branch}.maxAge`),
    entryAge: formData.get(`${branch}.entryAge`),
    colorHex: formData.get(`${branch}.colorHex`),
  })));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Configurazione non valida." };
  await getAssociativeYearRepository().updateBranchConfigurations(parsed.data);
  revalidatePath("/anno-associativo"); revalidatePath("/lista-attesa");
  redirect("/anno-associativo?branchesUpdated=1");
}

function yearError(error: unknown, fallback: string): YearActionState {
  if (error instanceof AssociativeYearError) return { status: "error", message: error.userMessage };
  console.error("Operazione anno associativo non riuscita", { errorName: error instanceof Error ? error.name : "UnknownError" });
  return { status: "error", message: fallback };
}
