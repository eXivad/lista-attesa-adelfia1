import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { acceptInvitationAction } from "./actions";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12"><Card className="w-full"><CardHeader><p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">AGESCI Adelfia 1</p><h1 className="font-slab text-3xl font-bold text-violet-950">Attiva il tuo account</h1><p className="text-sm text-stone-600">Scegli una password di almeno 12 caratteri. Il link è monouso e valido 24 ore.</p></CardHeader><CardContent><AcceptInvitationForm action={acceptInvitationAction.bind(null, token)} /></CardContent></Card></main>;
}
