import Image from "next/image";
import { UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

export function GroupBrand({ groupName, logoUrl, subtitle, className }: { groupName: string; logoUrl: string | null; subtitle?: string; className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-3", className)}>
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-100 text-violet-800">
        {logoUrl ? <Image src={logoUrl} alt="" width={44} height={44} unoptimized className="size-11 object-contain" /> : <UsersRound className="size-6" aria-hidden="true" />}
      </span>
      <span className="min-w-0">
        <strong className="block truncate font-slab text-violet-950">{groupName}</strong>
        {subtitle && <span className="block truncate text-xs text-stone-500">{subtitle}</span>}
      </span>
    </span>
  );
}
