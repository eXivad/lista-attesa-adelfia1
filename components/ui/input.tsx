import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-base text-stone-950 shadow-xs outline-none placeholder:text-stone-500 focus:border-violet-600 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-stone-100 md:text-sm",
        "aria-invalid:border-red-600 aria-invalid:ring-red-100",
        className,
      )}
      {...props}
    />
  );
}
