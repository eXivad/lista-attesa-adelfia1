import * as React from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base text-stone-950 shadow-xs outline-none placeholder:text-stone-500 focus:border-violet-600 focus:ring-4 focus:ring-violet-100 aria-invalid:border-red-600 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
