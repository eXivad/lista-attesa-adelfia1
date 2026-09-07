import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-4 text-center"><p className="text-sm font-bold uppercase tracking-widest text-violet-700">404</p><h1 className="font-slab text-4xl font-bold text-violet-950">Pagina non trovata</h1><p className="text-stone-600">La risorsa richiesta non esiste o non è più disponibile.</p><Button asChild><Link href="/">Continua</Link></Button></main>;
}
