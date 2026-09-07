import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-violet-800 text-white shadow-sm hover:bg-violet-950",
        secondary: "bg-violet-100 text-violet-950 hover:bg-violet-200",
        outline: "border border-violet-300 bg-white text-violet-950 hover:bg-violet-50",
        destructive: "bg-red-700 text-white hover:bg-red-800",
        ghost: "text-violet-950 hover:bg-violet-100",
      },
      size: {
        default: "min-h-11",
        sm: "min-h-9 rounded-lg px-3",
        lg: "min-h-12 px-7 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
