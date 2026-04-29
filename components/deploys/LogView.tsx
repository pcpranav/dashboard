"use client";

import { useState } from "react";
import type { LogLine } from "@/types";
import { cn } from "@/lib/utils";
import { RefreshButton } from "./RefreshButton";

function formatTs(ts: number | null): string {
  if (ts == null) return "";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

const DOT_COLOR: Record<LogLine["level"], string> = {
  info: "bg-muted-soft",
  warn: "bg-warning",
  error: "bg-danger",
};

const TEXT_COLOR: Record<LogLine["level"], string> = {
  info: "text-fg",
  warn: "text-warning",
  error: "text-danger",
};

export function LogView({
  lines,
  status,
}: {
  lines: LogLine[];
  status?: { kind: "unavailable"; reason: "logflow" | "missing" } | { kind: "error" };
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(lines.map((l) => l.text).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silently no-op
    }
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="mono text-[10px] uppercase tracking-[0.15em] text-muted-soft">
          Build logs · {lines.length} {lines.length === 1 ? "line" : "lines"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={lines.length === 0}
            className="mono inline-flex h-8 items-center border border-border bg-surface px-3 text-[11px] uppercase tracking-[0.15em] text-fg transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <RefreshButton />
        </div>
      </div>

      <div className="border border-border bg-surface">
        {status?.kind === "error" && (
          <p className="p-4 text-[13px] text-danger">Failed to load logs.</p>
        )}
        {status?.kind === "unavailable" && status.reason === "logflow" && (
          <p className="p-4 text-[13px] text-muted">
            Live logs unavailable for this deploy. Refresh after the build completes, or open in
            Netlify ↗.
          </p>
        )}
        {status?.kind === "unavailable" && status.reason === "missing" && (
          <p className="p-4 text-[13px] text-muted">
            Logs are not available for this deploy.
          </p>
        )}
        {!status && lines.length === 0 && (
          <p className="p-4 text-[13px] text-muted">No log output for this deploy.</p>
        )}
        {!status && lines.length > 0 && (
          <ol className="mono divide-y divide-border text-[12px] leading-[1.5]">
            {lines.map((line, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-1">
                <span className="tnum w-[68px] shrink-0 text-muted-soft">
                  {formatTs(line.ts)}
                </span>
                <span
                  className={cn(
                    "mt-[7px] inline-block h-1.5 w-1.5 shrink-0 rounded-full",
                    DOT_COLOR[line.level],
                  )}
                />
                <span className={cn("flex-1 whitespace-pre-wrap break-words", TEXT_COLOR[line.level])}>
                  {line.text}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
