"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md border border-border bg-surface p-8">
        <div className="mono text-[9px] uppercase tracking-[0.15em] text-danger">
          [!] something_broke
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Something went wrong.
        </h1>
        <p className="mt-3 text-[13px] text-muted leading-relaxed">
          An unexpected error occurred. The team has been notified.
          {error.digest && (
            <>
              {" "}
              Reference: <span className="mono tnum">{error.digest}</span>
            </>
          )}
        </p>
        <div className="mt-6">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}
