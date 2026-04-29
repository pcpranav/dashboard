"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export function RefreshButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [bumped, setBumped] = useState(false);

  function onClick() {
    startTransition(() => {
      router.refresh();
      setBumped(true);
      setTimeout(() => setBumped(false), 600);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className={cn(
        "mono inline-flex h-8 items-center border border-border bg-surface px-3 text-[11px] uppercase tracking-[0.15em] text-fg transition-colors hover:bg-surface-alt disabled:opacity-60",
        className,
      )}
    >
      {isPending || bumped ? "Refreshing…" : "Refresh"}
    </button>
  );
}
