import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-none bg-surface-alt",
        "before:absolute before:inset-0 before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
