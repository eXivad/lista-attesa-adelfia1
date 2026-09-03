"use server";

import { redirect } from "next/navigation";
import { getStaffInvitationService } from "@/lib/server/staff";
import { StaffInvitationError } from "@/modules/staff/services/staff-invitation.service";

export type AcceptInvitationState = { status: "idle" } | { status: "error"; message: string };

export async function acceptInvitationAction(token: string, _state: AcceptInvitationState, formData: FormData): Promise<AcceptInvitationState> {
  void _state;
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password !== confirmation) return { status: "error", message: "Le password non coincidono." };
  try {
    await getStaffInvitationService().accept(token, password);
  } catch (error) {
    if (error instanceof StaffInvitationError) return { status: "error", message: error.userMessage };
    return { status: "error", message: "Non è stato possibile attivare l'account. Contatta il Capo Gruppo." };
  }
  redirect("/login?invitationAccepted=1");
}
