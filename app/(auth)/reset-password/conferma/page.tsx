import { ResetPasswordForm } from "@/components/auth/password-reset-forms";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const token = typeof query.token === "string" ? query.token : "";
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12"><Card className="w-full"><CardHeader><h1 className="font-slab text-3xl font-bold text-violet-950">Nuova password</h1><p className="text-sm text-stone-600">Usa almeno 12 caratteri.</p></CardHeader><CardContent>{token ? <ResetPasswordForm token={token} /> : <p role="alert" className="text-red-700">Link di reset non valido.</p>}</CardContent></Card></main>;
}
