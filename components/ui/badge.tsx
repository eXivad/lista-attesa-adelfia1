import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-950", className)}
      {...props}
    />
  );
}
