import Link from "next/link";
import { RequestPasswordResetForm } from "@/components/auth/password-reset-forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RequestPasswordResetPage() {
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12"><Card className="w-full"><CardHeader><h1 className="font-slab text-3xl font-bold text-violet-950">Password dimenticata</h1><p className="text-sm text-stone-600">Riceverai un link valido per un’ora.</p></CardHeader><CardContent className="space-y-5"><RequestPasswordResetForm /><Link href="/login" className="block text-center text-sm font-bold text-violet-800 underline">Torna all’accesso</Link></CardContent></Card></main>;
}
