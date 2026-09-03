"use server";

import { headers } from "next/headers";

import { getApplicantRegistrationService } from "@/lib/server/applicant-registration";
import { getPublicRegistrationRateLimiter } from "@/lib/server/public-registration-rate-limit";
import { getClientSource, RateLimitExceededError } from "@/lib/security/rate-limiter";
import type { ApplicantRegistrationInput } from "@/modules/applicants/schemas/registration";
import { ApplicantRegistrationError } from "@/modules/applicants/services/registration.service";
import type { RegisterApplicantActionResult } from "@/components/registration/registration-wizard";

export async function registerApplicantAction(
  input: ApplicantRegistrationInput,
): Promise<RegisterApplicantActionResult> {
  try {
    const requestHeaders = await headers();
    await getPublicRegistrationRateLimiter().assertAllowed(getClientSource(requestHeaders));
    const result = await getApplicantRegistrationService().register(input);
    return {
      status: "success",
      registrationNumber: result.registrationNumber,
      emailDelivery: result.emailDelivery,
    };
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof ApplicantRegistrationError) {
      return { status: "error", message: error.userMessage };
    }

    console.error("Registrazione non riuscita", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return {
      status: "error",
      message: "Non è stato possibile completare l'iscrizione. Riprova più tardi o contatta il Gruppo.",
    };
  }
}
