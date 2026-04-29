"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[dashboard/error.tsx]", error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-12 md:px-6">
      <div className="border border-border bg-surface p-8">
        <div className="mono text-[9px] uppercase tracking-[0.15em] text-danger">
          [!] dashboard_error
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">
          Dashboard couldn&apos;t load.
        </h1>
        <p className="mt-3 text-[13px] text-muted leading-relaxed">
          One of the connected services may be returning bad data, or your session may have expired.
          {error.digest && (
            <>
              {" "}
              Reference: <span className="mono tnum">{error.digest}</span>
            </>
          )}
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={reset}>Retry</Button>
          <a href="/onboarding"><Button variant="ghost">Reconnect tokens</Button></a>
        </div>
      </div>
    </main>
  );
}
