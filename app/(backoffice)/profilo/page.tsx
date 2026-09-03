import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChangePasswordForm, ProfileForm } from "@/components/auth/profile-forms";
import { getPrismaClient } from "@/lib/server/prisma";
import { getCurrentUser } from "@/lib/server/session";
import { updateProfileAction } from "./actions";
import { redirect } from "next/navigation";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const current = await getCurrentUser(); if (!current) redirect("/login");
  const [user, query] = await Promise.all([getPrismaClient().user.findUniqueOrThrow({ where: { id: current.id }, select: { firstName: true, lastName: true, email: true, memberCode: true } }), searchParams]);
  return <div className="space-y-6"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">Account</p><h1 className="mt-2 font-slab text-3xl font-bold text-violet-950">Il mio profilo</h1><p className="mt-2 text-stone-600">Codice Socio: {user.memberCode}</p></div>{query.updated === "1" && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-emerald-900">Profilo aggiornato.</p>}<Card><CardHeader><h2 className="font-slab text-xl font-bold">Dati personali</h2></CardHeader><CardContent><ProfileForm action={updateProfileAction} user={user} /></CardContent></Card><Card><CardHeader><h2 className="font-slab text-xl font-bold">Password</h2></CardHeader><CardContent><ChangePasswordForm /></CardContent></Card></div>;
}
