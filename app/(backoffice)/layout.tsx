import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getCurrentUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";

const navigation = [
  ["Dashboard", "/dashboard"],
  ["Lista d’attesa", "/lista-attesa"],
  ["Anno associativo", "/anno-associativo"],
  ["Statistiche", "/statistiche"],
  ["Il mio profilo", "/profilo"],
  ["Impostazioni", "/impostazioni"],
] as const;

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-h-11 items-center gap-2 font-slab font-bold text-violet-950">
            <span className="flex size-9 items-center justify-center rounded-lg bg-violet-800 text-sm text-white">A1</span>
            <span className="hidden sm:inline">Lista d’attesa</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-stone-900">{user.name}</p>
              <p className="text-xs text-stone-500">{user.role === "ADMIN" ? "Capo Gruppo" : "Capo"}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[14rem_1fr] lg:py-8">
        <nav aria-label="Navigazione backoffice" className="overflow-x-auto lg:overflow-visible">
          <ul className="flex min-w-max gap-2 lg:min-w-0 lg:flex-col">
            {navigation.map(([label, href]) => (
              <li key={href}>
                <Link className="flex min-h-11 items-center rounded-xl px-4 text-sm font-bold text-stone-700 hover:bg-violet-100 hover:text-violet-950" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main>{children}</main>
      </div>
    </div>
  );
}
