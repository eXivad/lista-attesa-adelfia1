import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-stone-50">
      <header className="border-b border-violet-900/10 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex min-h-11 items-center gap-3" aria-label="AGESCI Adelfia 1, home">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-800 font-slab text-lg font-bold text-white">
              A1
            </span>
            <span>
              <strong className="block font-slab text-violet-950">AGESCI Adelfia 1</strong>
              <span className="text-xs text-stone-500">Lista d’attesa</span>
            </span>
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Area Capi</Link>
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-20">
        <div className="absolute inset-x-0 top-0 -z-0 h-64 bg-[radial-gradient(circle_at_top_left,_rgba(174,176,217,0.55),_transparent_62%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <Badge>Gruppo scout AGESCI Adelfia 1</Badge>
            <h1 className="mt-5 max-w-3xl font-slab text-4xl font-bold leading-tight text-violet-950 sm:text-6xl">
              Un primo passo verso una nuova avventura.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
              Inserisci tuo figlio o tua figlia nella lista d’attesa del Gruppo. La richiesta sarà conservata nel rigoroso ordine cronologico di arrivo.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/iscrizione">
                  Inizia l’iscrizione
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/privacy">Leggi l’informativa privacy</Link>
              </Button>
            </div>
          </div>

          <aside className="rounded-[2rem] bg-violet-950 p-6 text-white shadow-xl sm:p-8" aria-label="Come funziona">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">Come funziona</p>
            <ul className="mt-6 space-y-6">
              <Feature icon={<Clock3 />} title="Ordine trasparente" text="La posizione segue sempre data e ora di iscrizione." />
              <Feature icon={<ShieldCheck />} title="Dati protetti" text="Consenso privacy esplicito e accesso riservato ai Capi." />
              <Feature icon={<CalendarDays />} title="Chiamate annuali" text="Il Gruppo contatta i ragazzi negli anni di ingresso delle branche." />
            </ul>
          </aside>
        </div>
      </section>

      <footer className="mt-auto border-t border-stone-200 bg-white px-4 py-6 text-center text-sm text-stone-600">
        <p>AGESCI Adelfia 1 · Servizio per la gestione della lista d’attesa</p>
      </footer>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-violet-300 [&>svg]:size-5"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div>
        <h2 className="font-slab text-lg font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-violet-100">{text}</p>
      </div>
    </li>
  );
}
