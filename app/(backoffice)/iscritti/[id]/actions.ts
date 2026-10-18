"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getApplicantMutationService } from "@/lib/server/applicant-mutations";
import { requireCapability } from "@/lib/server/session";
import { detailHref, listHref } from "@/modules/applicants/list-navigation";
import { APPLICANT_STATUSES } from "@/modules/applicants/domain/state-machine";
import { applicantDataFromFormData } from "@/modules/applicants/schemas/applicant-form-data";
import { ApplicantMutationError } from "@/modules/applicants/services/applicant-mutation.service";

const idSchema = z.string().regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, "Identificativo non valido.");
const statusSchema = z.enum(APPLICANT_STATUSES);

export type ApplicantActionState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function updateApplicantAction(
  idInput: string,
  listQuery: string,
  _previousState: ApplicantActionState,
  formData: FormData,
): Promise<ApplicantActionState> {
  void _previousState;
  await requireCapability("applicants:update");
  const id = idSchema.safeParse(idInput);
  if (!id.success) return { status: "error", message: id.error.issues[0].message };

  try {
    await getApplicantMutationService().update(id.data, applicantDataFromFormData(formData));
  } catch (error) {
    return actionError(error, "Non è stato possibile aggiornare l'iscritto.");
  }
  revalidatePath(`/iscritti/${id.data}`);
  revalidatePath("/lista-attesa");
  redirect(detailHref(id.data, listQuery, "updated"));
}

export async function changeApplicantStatusAction(
  idInput: string,
  targetInput: string,
  listQuery: string,
  _previousState: ApplicantActionState,
  _formData: FormData,
): Promise<ApplicantActionState> {
  void _previousState;
  void _formData;
  await requireCapability("applicants:change-status");
  const parsed = z.object({ id: idSchema, target: statusSchema }).safeParse({
    id: idInput,
    target: targetInput,
  });
  if (!parsed.success) return { status: "error", message: "Richiesta non valida." };

  try {
    await getApplicantMutationService().changeStatus(parsed.data.id, parsed.data.target);
  } catch (error) {
    return actionError(error, "Non è stato possibile cambiare lo stato.");
  }
  revalidatePath(`/iscritti/${parsed.data.id}`);
  revalidatePath("/lista-attesa");
  redirect(detailHref(parsed.data.id, listQuery, "statusChanged"));
}

export async function deleteApplicantAction(
  idInput: string,
  listQuery: string,
  _previousState: ApplicantActionState,
  _formData: FormData,
): Promise<ApplicantActionState> {
  void _previousState;
  void _formData;
  await requireCapability("applicants:delete");
  const id = idSchema.safeParse(idInput);
  if (!id.success) return { status: "error", message: id.error.issues[0].message };

  try {
    await getApplicantMutationService().delete(id.data);
  } catch (error) {
    return actionError(error, "Non è stato possibile cancellare l'iscritto.");
  }
  revalidatePath("/lista-attesa");
  const destination = new URL(listHref(listQuery), "http://local");
  destination.searchParams.set("deleted", "1");
  redirect(`${destination.pathname}${destination.search}`);
}

function actionError(error: unknown, fallback: string): ApplicantActionState {
  if (error instanceof ApplicantMutationError) {
    return { status: "error", message: error.userMessage };
  }
  console.error("Operazione iscritto non riuscita", {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
  return { status: "error", message: fallback };
}
