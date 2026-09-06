"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPrismaClient } from "@/lib/server/prisma";
import { getAuth } from "@/lib/server/auth";
import { requireCapability } from "@/lib/server/session";
import { getStaffInvitationService } from "@/lib/server/staff";
import { getGroupBrandingRepository, GROUP_BRANDING_CACHE_TAG } from "@/lib/server/group-branding";
import { PRIVACY_POLICY_CACHE_TAG } from "@/lib/server/privacy-policy";
import { groupNameSchema, MAX_GROUP_LOGO_BYTES, validateGroupLogo } from "@/modules/branding/group-branding";
import { privacyPolicyInputSchema } from "@/modules/privacy/privacy-policy";
import { StaffInvitationError } from "@/modules/staff/services/staff-invitation.service";
import { PrismaPrivacyRepository, PrivacyPolicyVersionConflictError } from "@/repositories/prisma/privacy.repository";
import { monotonicFactory } from "ulid";

export type SettingsActionState = { status: "idle" } | { status: "error"; message: string };
const createId = monotonicFactory();

export async function updateGroupNameAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  void _state;
  await requireCapability("branding:manage");
  const parsed = groupNameSchema.safeParse(formData.get("groupName"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Nome del gruppo non valido." };
  await getGroupBrandingRepository().updateGroupName(parsed.data);
  updateTag(GROUP_BRANDING_CACHE_TAG);
  revalidatePath("/", "layout");
  redirect("/impostazioni?brandingUpdated=1");
}

export async function uploadGroupLogoAction(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  void _state;
  await requireCapability("branding:manage");
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Seleziona un logo PNG, JPEG o WebP." };
  if (file.size > MAX_GROUP_LOGO_BYTES) return { status: "error", message: "Il logo non può superare 2 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const { mimeType } = validateGroupLogo({ mimeType: file.type, bytes, size: file.size });
    await getGroupBrandingRepository().replaceLogo({ mimeType, bytes });
  } catch (error) {
    return { status: "error", message: error instanceof Error ? error.message : "Logo non valido." };
  }
  updateTag(GROUP_BRANDING_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/api/branding/logo");
  redirect("/impostazioni?brandingUpdated=1");
}

export async function removeGroupLogoAction(_state: SettingsActionState, _formData: FormData): Promise<SettingsActionState> {
  void _state; void _formData;
  await requireCapability("branding:manage");
  await getGroupBrandingRepository().removeLogo();
  updateTag(GROUP_BRANDING_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/api/branding/logo");
  redirect("/impostazioni?brandingUpdated=1");
}

export async function publishPrivacyPolicyAction(
  _state: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  void _state;
  await requireCapability("privacy:manage");
  const parsed = privacyPolicyInputSchema.safeParse({
    version: formData.get("version"),
    fileUrl: formData.get("fileUrl"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Versione o link del PDF non validi.",
    };
  }

  try {
    await new PrismaPrivacyRepository(getPrismaClient()).publish(parsed.data);
  } catch (error) {
    if (error instanceof PrivacyPolicyVersionConflictError) {
      return {
        status: "error",
        message: "Questa versione esiste già con un altro link. Inserisci una nuova versione per non alterare i consensi storici.",
      };
    }
    return { status: "error", message: "Non è stato possibile pubblicare l'informativa privacy." };
  }

  updateTag(PRIVACY_POLICY_CACHE_TAG);
  revalidatePath("/privacy");
  revalidatePath("/iscrizione");
  revalidatePath("/impostazioni");
  redirect("/impostazioni?privacyUpdated=1#privacy");
}

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
