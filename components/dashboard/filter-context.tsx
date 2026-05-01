"use client";

import * as React from "react";
import { rangeToCutoffMs, type FilterRange } from "./filter-shared";

export { FILTER_RANGES, isFilterRange, rangeToCutoffMs, rangeToShortLabel, matchesQuery } from "./filter-shared";
export type { FilterRange } from "./filter-shared";

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
