"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarRange,
  CircleUserRound,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackofficeShellProps {
  children: React.ReactNode;
  user: { name: string; role: "ADMIN" | "STAFF" };
  groupName: string;
  logoUrl: string | null;
}

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Lista d’attesa", href: "/lista-attesa", icon: ClipboardList },
  {
    label: "Anno associativo",
    href: "/anno-associativo",
    icon: CalendarRange,
    adminOnly: true,
  },
  {
    label: "Statistiche",
    href: "/statistiche",
    icon: BarChart3,
    adminOnly: true,
  },
  { label: "Il mio profilo", href: "/profilo", icon: CircleUserRound },
  {
    label: "Impostazioni",
    href: "/impostazioni",
    icon: Settings,
    adminOnly: true,
  },
];

export function BackofficeShell({
  children,
  user,
  groupName,
  logoUrl,
}: BackofficeShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = navigation.filter(
    (item) => !item.adminOnly || user.role === "ADMIN",
  );

  return (
    <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
      <div className="min-h-screen bg-stone-50">
        <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Dialog.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Apri navigazione"
                >
                  <Menu className="size-5" aria-hidden="true" />
                </Button>
              </Dialog.Trigger>
              <BrandLink groupName={groupName} logoUrl={logoUrl} />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-stone-900">{user.name}</p>
                <p className="text-xs text-stone-500">
                  {user.role === "ADMIN" ? "Capo Gruppo" : "Capo"}
                </p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </header>

        <div
          className={cn(
            "mx-auto grid max-w-7xl gap-6 px-4 py-5 transition-[grid-template-columns] sm:px-6 lg:py-8",
            collapsed
              ? "lg:grid-cols-[4.75rem_1fr]"
              : "lg:grid-cols-[14rem_1fr]",
          )}
        >
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-3">
              <Button
                type="button"
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                className={cn(
                  collapsed ? "mx-auto flex" : "w-full justify-start",
                )}
                onClick={() => setCollapsed((value) => !value)}
                aria-label={
                  collapsed ? "Espandi navigazione" : "Comprimi navigazione"
                }
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-5" aria-hidden="true" />
                ) : (
                  <PanelLeftClose className="size-5" aria-hidden="true" />
                )}
                {!collapsed && <span>Comprimi</span>}
              </Button>
              <nav aria-label="Navigazione backoffice">
                <NavigationList
                  items={items}
                  pathname={pathname}
                  collapsed={collapsed}
                />
              </nav>
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-violet-950/55 backdrop-blur-[2px] lg:hidden" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-2rem))] overflow-y-auto bg-white p-5 shadow-2xl focus:outline-none lg:hidden"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-5">
            <Dialog.Title className="min-w-0">
              <BrandContent groupName={groupName} logoUrl={logoUrl} />
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Chiudi navigazione"
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <nav className="mt-5" aria-label="Navigazione mobile">
            <NavigationList
              items={items}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function NavigationList({
  items,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  items: NavigationItem[];
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition hover:bg-violet-100 hover:text-violet-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300",
                active ? "bg-violet-100 text-violet-950" : "text-stone-700",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span className={collapsed ? "sr-only" : undefined}>{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function BrandLink({
  groupName,
  logoUrl,
}: {
  groupName: string;
  logoUrl: string | null;
}) {
  return (
    <Link
      href="/dashboard"
      className="min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
    >
      <BrandContent groupName={groupName} logoUrl={logoUrl} />
    </Link>
  );
}

function BrandContent({
  groupName,
  logoUrl,
}: {
  groupName: string;
  logoUrl: string | null;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 font-slab font-bold text-violet-950">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-100 text-violet-800">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="size-9 object-contain"
          />
        ) : (
          <UsersRound className="size-5" aria-hidden="true" />
        )}
      </span>
      <span className="truncate">Gruppo {groupName}</span>
    </span>
  );
}
