"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getPrismaClient } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/server/session";

export type ProfileActionState = { status: "idle" } | { status: "error"; message: string };

export async function updateProfileAction(_state: ProfileActionState, formData: FormData): Promise<ProfileActionState> {
  void _state;
  const current = await getCurrentUser();
  if (!current) return { status: "error", message: "La sessione è scaduta." };
  const parsed = z.object({ firstName: z.string().trim().min(1).max(120), lastName: z.string().trim().min(1).max(120), email: z.email().transform((v) => v.toLowerCase()) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Controlla nome, cognome ed email." };
  try {
    await getPrismaClient().user.update({ where: { id: current.id }, data: { ...parsed.data, name: `${parsed.data.firstName} ${parsed.data.lastName}` } });
  } catch {
    return { status: "error", message: "L'email è già utilizzata da un altro account." };
  }
  revalidatePath("/profilo");
  redirect("/profilo?updated=1");
}
