"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPrismaClient } from "@/lib/server/prisma";
import { getAuth } from "@/lib/server/auth";
import { requireCapability } from "@/lib/server/session";
import { getStaffInvitationService } from "@/lib/server/staff";
import { StaffInvitationError } from "@/modules/staff/services/staff-invitation.service";
import { monotonicFactory } from "ulid";

export type SettingsActionState = { status: "idle" } | { status: "error"; message: string };
const createId = monotonicFactory();

const staffSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  memberCode: z.string().trim().min(1).max(40),
  role: z.enum(["ADMIN", "STAFF"]),
});

export async function inviteStaffAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  void _state;
  const admin = await requireCapability("users:manage");
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Controlla i dati del nuovo Capo." };
  try {
    await getStaffInvitationService().invite({ ...parsed.data, createdById: admin.id });
  } catch (error) {
    if (error instanceof StaffInvitationError) return { status: "error", message: error.userMessage };
    return { status: "error", message: "Email o Codice Socio già utilizzati, oppure invio non disponibile." };
  }
  revalidatePath("/impostazioni");
  redirect("/impostazioni?invited=1");
}

export async function resendInvitationAction(invitationId: string, _state: SettingsActionState, _formData: FormData): Promise<SettingsActionState> {
  void _state; void _formData;
  const admin = await requireCapability("users:manage");
  const invitation = await getPrismaClient().staffInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.acceptedAt) return { status: "error", message: "Invito non trovato." };
  await getPrismaClient().staffInvitation.delete({ where: { id: invitation.id } });
  try {
    await getStaffInvitationService().invite({
      firstName: invitation.firstName, lastName: invitation.lastName, email: invitation.email,
      memberCode: invitation.memberCode, role: invitation.role, createdById: admin.id,
    });
  } catch {
    return { status: "error", message: "Non è stato possibile reinviare l'invito." };
  }
  revalidatePath("/impostazioni");
  redirect("/impostazioni?resent=1");
}

export async function deleteStaffAction(userId: string, _state: SettingsActionState, _formData: FormData): Promise<SettingsActionState> {
  void _state; void _formData;
  const admin = await requireCapability("users:manage");
  if (userId === admin.id) return { status: "error", message: "Non puoi eliminare il tuo account." };
  const target = await getPrismaClient().user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || target.role !== "STAFF") return { status: "error", message: "È possibile eliminare solo account Capo." };
  await getPrismaClient().user.delete({ where: { id: userId } });
  revalidatePath("/impostazioni");
  redirect("/impostazioni?staffDeleted=1");
}

export async function updateStaffAction(userId: string, _state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  void _state;
  await requireCapability("users:manage");
  const parsed = staffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Controlla i dati del Capo." };
  const current = await getPrismaClient().user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!current) return { status: "error", message: "Account non trovato." };
  if (current.role === "ADMIN" && parsed.data.role === "STAFF") {
    const adminCount = await getPrismaClient().user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) return { status: "error", message: "Non puoi retrocedere l'ultimo Capo Gruppo." };
  }
  try {
    await getPrismaClient().user.update({
      where: { id: userId },
      data: { ...parsed.data, name: `${parsed.data.firstName} ${parsed.data.lastName}` },
    });
  } catch {
    return { status: "error", message: "Email o Codice Socio già utilizzati." };
  }
  revalidatePath("/impostazioni");
  redirect("/impostazioni?staffUpdated=1");
}

export async function sendStaffPasswordResetAction(userId: string, _state: SettingsActionState, _formData: FormData): Promise<SettingsActionState> {
  void _state; void _formData;
  await requireCapability("users:manage");
  const user = await getPrismaClient().user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return { status: "error", message: "Account non trovato." };
  await getAuth().api.requestPasswordReset({ body: { email: user.email, redirectTo: "/reset-password/conferma" } });
  revalidatePath("/impostazioni");
  redirect("/impostazioni?resetSent=1");
}

export async function addMailingRecipientAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  void _state;
  await requireCapability("mailing:manage");
  const parsed = z.object({ email: z.email(), label: z.string().trim().min(1).max(120) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Inserisci etichetta ed email valide." };
  await getPrismaClient().mailingRecipient.upsert({
    where: { email: parsed.data.email.toLowerCase() },
    create: { id: createId(), email: parsed.data.email.toLowerCase(), label: parsed.data.label, isActive: true },
    update: { label: parsed.data.label, isActive: true },
  });
  revalidatePath("/impostazioni");
  redirect("/impostazioni?mailingUpdated=1");
}

export async function removeMailingRecipientAction(id: string, _state: SettingsActionState, _formData: FormData): Promise<SettingsActionState> {
  void _state; void _formData;
  await requireCapability("mailing:manage");
  await getPrismaClient().mailingRecipient.deleteMany({ where: { id } });
  revalidatePath("/impostazioni");
  redirect("/impostazioni?mailingUpdated=1");
}
