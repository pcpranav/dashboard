"use client";

import * as React from "react";

export type FilterRange = "24h" | "7d" | "30d" | "90d";

export const FILTER_RANGES: readonly FilterRange[] = ["24h", "7d", "30d", "90d"] as const;

export function isFilterRange(v: unknown): v is FilterRange {
  return typeof v === "string" && (FILTER_RANGES as readonly string[]).includes(v);
}

export function rangeToCutoffMs(range: FilterRange): number {
  switch (range) {
    case "24h": return 24 * 60 * 60 * 1000;
    case "7d": return 7 * 24 * 60 * 60 * 1000;
    case "30d": return 30 * 24 * 60 * 60 * 1000;
    case "90d": return 90 * 24 * 60 * 60 * 1000;
  }
}

export function rangeToShortLabel(range: FilterRange): string {
  return range; // "24h", "7d", etc.
}

interface FilterValue {
  range: FilterRange;
  cutoffMs: number;
  q: string;
}

const FilterContext = React.createContext<FilterValue>({
  range: "7d",
  cutoffMs: rangeToCutoffMs("7d"),
  q: "",
});

export function FilterProvider({
  range,
  q,
  children,
}: {
  range: FilterRange;
  q: string;
  children: React.ReactNode;
}) {
  const value = React.useMemo<FilterValue>(
    () => ({ range, cutoffMs: rangeToCutoffMs(range), q }),
    [range, q],
  );
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter(): FilterValue {
  return React.useContext(FilterContext);
}

export function matchesQuery(haystack: string | null | undefined, q: string): boolean {
  if (!q) return true;
  if (!haystack) return false;
  return haystack.toLowerCase().includes(q);
}
