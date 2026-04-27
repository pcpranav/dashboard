import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border border-border bg-white/[0.03] px-4 py-2 text-sm text-fg backdrop-blur-md",
        "placeholder:text-muted/70",
        "transition-all focus:outline-none focus:border-violet/60 focus:bg-white/[0.06] focus:ring-2 focus:ring-violet/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
