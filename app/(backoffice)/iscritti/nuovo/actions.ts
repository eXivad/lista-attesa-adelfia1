"use server";

import { revalidatePath } from "next/cache";

import type { RegisterApplicantActionResult } from "@/components/registration/registration-wizard";
import { getApplicantRegistrationService } from "@/lib/server/applicant-registration";
import { requireCapability } from "@/lib/server/session";
import type { ApplicantRegistrationInput } from "@/modules/applicants/schemas/registration";
import { ApplicantRegistrationError } from "@/modules/applicants/services/registration.service";

export async function registerBackofficeApplicantAction(
  input: ApplicantRegistrationInput,
): Promise<RegisterApplicantActionResult> {
  await requireCapability("applicants:create");
  try {
    const result = await getApplicantRegistrationService().registerFromBackoffice(input);
    revalidatePath("/lista-attesa");
    return { status: "success", id: result.id, registrationNumber: result.registrationNumber, emailDelivery: result.emailDelivery };
  } catch (error) {
    if (error instanceof ApplicantRegistrationError) {
      return { status: "error", message: error.userMessage };
    }
    console.error("Registrazione interna non riuscita", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "error", message: "Non è stato possibile completare l'iscrizione." };
  }
}
