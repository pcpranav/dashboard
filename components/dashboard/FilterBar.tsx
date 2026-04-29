"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { FILTER_RANGES, type FilterRange } from "./filter-context";

interface Props {
  range: FilterRange;
  q: string;
}

export function FilterBar({ range, q }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Local input state, debounced into the URL
  const [draft, setDraft] = useState(q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local draft when q changes from elsewhere (e.g. browser back)
  useEffect(() => {
    setDraft(q);
  }, [q]);

  function pushParams(next: { range?: FilterRange; q?: string }) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.range !== undefined) {
      if (next.range === "7d") params.delete("range");
      else params.set("range", next.range);
    }
    if (next.q !== undefined) {
      const cleaned = next.q.trim().toLowerCase().slice(0, 200);
      if (cleaned) params.set("q", cleaned);
      else params.delete("q");
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/dashboard?${qs}` : "/dashboard");
    });
  }

  function handleRangeClick(r: FilterRange) {
    if (r === range) return;
    pushParams({ range: r });
  }

  function handleSearchChange(v: string) {
    setDraft(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams({ q: v });
    }, 250);
  }

  function clearSearch() {
    setDraft("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pushParams({ q: "" });
  }

  return (
    <div className="border-b border-border">
      <div className="flex flex-col gap-2.5 px-1 py-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
        <div className="flex items-center gap-1" role="group" aria-label="Time range">
          {FILTER_RANGES.map((r) => {
            const active = r === range;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => handleRangeClick(r)}
                className={cn(
                  "mono px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] transition-colors",
                  active
                    ? "bg-fg text-bg"
                    : "text-muted hover:text-fg",
                )}
              >
                {r}
              </button>
            );
          })}
        </div>
        <div className="relative w-full md:max-w-xs">
          <SearchIcon />
          <input
            type="text"
            value={draft}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filter projects, deploys, services…"
            maxLength={200}
            spellCheck={false}
            aria-label="Filter dashboard"
            className="mono h-9 w-full border border-border bg-surface pl-9 pr-9 text-[12px] text-fg placeholder:text-muted-soft focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          {draft && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear filter"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-soft transition-colors hover:text-fg"
            >
              <ClearIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-soft"
      aria-hidden="true"
    >
      <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 8L11 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
