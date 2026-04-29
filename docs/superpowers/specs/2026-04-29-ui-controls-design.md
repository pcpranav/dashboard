# DevPulse — UI Controls (Time Range + Global Search)

**Date:** 2026-04-29
**Status:** Design approved, awaiting implementation plan
**Sub-project of:** Task 1 feature audit — combines bullets **A2 (Time range)** and **A3 (Search/filter)** into one ship-unit since they share a filter-bar surface.

## Goal

Add two filter controls to the dashboard so users can:

- (A2) Switch the time scope of stats and charts between 24h / 7d / 30d / 90d.
- (A3) Type a query that narrows the lists rendered on the dashboard (deployment lists, activity feed, linked projects).

Both controls live in a single thin **FilterBar** mounted between `FactStrip` and the inner content of `/dashboard`. State lives in URL query params (`?range=7d&q=api-gateway`) so deep-links and refresh both work.

## Visual placement

The filter bar inserts here:

```
┌─────────────────────────────────────────────────┐
│  Header (sticky)                                │
├─────────────────────────────────────────────────┤
│  FactStrip (6 cells)                            │
├─────────────────────────────────────────────────┤
│  FilterBar  ← NEW                                │
├─────────────────────────────────────────────────┤
│  HeroCard                                       │
│  3-column service cards                         │
│  LinkedProjects                                 │
│  UsageBars                                      │
│  ActivityFeed                                   │
└─────────────────────────────────────────────────┘
```

Internal layout: hairline top + bottom borders (same as FactStrip). Two halves on the same row.

```
─────────────────────────────────────────────────────────
[ 24h ][ 7d ][ 30d ][ 90d ]      🔍 [Filter projects… ]
─────────────────────────────────────────────────────────
```

On narrow viewports the two halves stack (range on top, search underneath) — single column.

## Components

### `FilterBar.tsx` (new)

- Server component reading initial `searchParams` from the page; mounts a small client-component segment for interactive controls.
- Or: full client component that reads `useSearchParams()` and writes via `router.replace()`. **Pick this — simpler.**
- Renders two halves:
  - **Range segmented control:** 4 buttons. Selected: `bg-fg text-bg`. Unselected: `text-muted hover:text-fg`. Mono labels uppercase tracking-[0.15em] text-[10px].
  - **Search input:** `h-9` text input, `border border-border bg-surface px-3`, mono placeholder `Filter projects…`. Inline `<svg>` magnifying-glass on the left at 12px, color `var(--muted-soft)`. Debounced `router.replace` on input change (250ms) so URL doesn't update on every keystroke.
- Reset behavior: search has a small ⌫ button on the right when `q` is non-empty; clears it.

### `filter-context.tsx` (new)

Lightweight client-side context provider:

```ts
type FilterRange = "24h" | "7d" | "30d" | "90d";

interface FilterValue {
  range: FilterRange;
  cutoffMs: number; // pre-computed for consumers
  q: string;       // lowercased trim, "" when empty
}

export const FilterContext = React.createContext<FilterValue>({
  range: "7d",
  cutoffMs: 7 * 24 * 60 * 60 * 1000,
  q: "",
});

export function FilterProvider({ children, range, q }: { children: React.ReactNode; range: FilterRange; q: string }) { ... }

export function useFilter(): FilterValue { ... }

export function rangeToCutoffMs(range: FilterRange): number { ... }

export function rangeToLabel(range: FilterRange): string { ... } // "24h" → "24h", "7d" → "7d", etc. (used by FactStrip cell labels)
```

The provider derives `cutoffMs` from `range` once and passes both down so consumers don't recompute.

### `app/dashboard/page.tsx` (modify)

Read `searchParams.range` and `searchParams.q` from the page props (Next.js App Router pattern). Validate `range` against the allowed set; default to `"7d"` if missing or invalid. Strip + lowercase `q`. Pass both to `FilterProvider`.

```tsx
export default async function DashboardPage({ searchParams }: { searchParams: { range?: string; q?: string } }) {
  // ... existing auth + connected logic ...

  const range: FilterRange = isFilterRange(searchParams.range) ? searchParams.range : "7d";
  const q = (searchParams.q ?? "").trim().toLowerCase();

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <Header email={session.user.email} />
      <FactStrip connected={connected} />
      <FilterProvider range={range} q={q}>
        <FilterBar range={range} q={q} />
        <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <HeroCard connected={connected} />
          {/* ... existing layout ... */}
        </div>
      </FilterProvider>
    </main>
  );
}
```

### Consuming components (modify)

| Component | What it consumes | What changes |
|---|---|---|
| `FactStrip` | `range` (for cell relabel), `cutoffMs` (for "Failed" count window) | Cell label `Failed 24h` → `Failed ${range}` (e.g. `Failed 7d`). Re-uses cutoffMs in `countErrors24h`-equivalent (rename to `countErrorsInRange`). The `Deploys 7d` cell becomes `Deploys ${range}`. |
| `HeroCard` | `cutoffMs` | KPI numeral, prev-period delta calculation, chart day-bins all derive from cutoffMs. The bar chart's 7-day fixed span is replaced by a span that matches the selected range (24h: hour-bins; 7d/30d/90d: day-bins). For v1 keep day-bins for 7d/30d/90d and hour-bins for 24h — see chart binning section. |
| `ActivityFeed` | `cutoffMs`, `q` | Filter events to `ts >= now - cutoffMs`. If `q` non-empty, filter to events whose lowercased `message` or `service` includes `q`. The "last N events" eyebrow updates to reflect filtered count. |
| `DeploymentList` | `q` | Filter deployments by lowercased `project`, `branch`, or `commitMessage` substring match. If filtered set is empty AND q non-empty, render `<p>No deployments match "{q}"</p>` — do not collapse the section silently. |
| `LinkedProjects` | `q` | Filter links where either side's lowercased name includes `q`. Empty result → existing "Pair a frontend project…" empty state, with `q` mentioned. |

The per-service cards (`VercelCard`, `NetlifyCard`, `SupabaseCard`) are NOT directly consuming filters in v1 — they pass through to `DeploymentList`, which DOES consume `q`. Time-range scope was deferred (see "Out of scope" below).

### Chart day-binning

`HeroCard` currently renders 7 day-bins. With variable range:

- `24h`: 24 hour-bins, x-axis labels every 4h (`0`, `4`, `8`, `12`, `16`, `20`).
- `7d`: 7 day-bins, x-axis labels first letter of weekday.
- `30d`: 30 day-bins, x-axis labels every 7th day (`d1`, `d8`, `d15`, `d22`, `d29`).
- `90d`: 13 week-bins (90/7 ≈ 13), x-axis labels first day of each week (`w1`, `w7`, `w13`).

This requires generalizing `DeployBarChart` from a hardcoded 7-day loop to a `bins: { label: string; count: number; errors: number }[]` prop. The component shouldn't know what a "day" is — it just renders bars from the bins array.

`HeroCard` becomes responsible for computing bins based on range, then passing the array to `DeployBarChart`.

## Data flow

All filtering happens **client-side** on already-fetched data. No new API endpoints. Existing SWR fetches return enough data:

- `/api/vercel/deployments` returns last 10 (currently). For 30d/90d ranges this may be insufficient — flagged as a follow-up but acceptable for v1 since most users won't have 100+ deploys in 90 days. Document in spec; track for a "deeper history" follow-up sub-project.
- `/api/netlify/deploys` same.
- `/api/supabase/projects` is point-in-time, range-irrelevant.

## URL state

| Param | Type | Default | Validation |
|---|---|---|---|
| `range` | `"24h" \| "7d" \| "30d" \| "90d"` | `"7d"` | Anything else → fall back to `"7d"` (don't error). |
| `q` | string | `""` | Trim + lowercase. Empty string is allowed. Length cap 200 chars to prevent URL bloat. |

URL writes use `router.replace` (not `push`) — typing in the search shouldn't bloat browser history. Range button clicks also use `replace`.

## Tokens / styling

- Segmented buttons: `text-[10px] uppercase tracking-[0.15em] mono px-3 py-1.5 transition-colors`. Selected: `bg-fg text-bg`. Hover unselected: `text-fg`.
- Search input: `h-9 w-full max-w-xs border border-border bg-surface pl-9 pr-3 text-[12px] mono placeholder:text-muted-soft focus:outline-none focus:border-brand`. The `pl-9` accommodates the absolutely-positioned magnifying-glass icon.
- Container: `border-y border-border` (top + bottom hairlines), `flex` row on `md+`, `flex-col` on mobile, `px-4 md:px-6`, `py-2.5`.

## Acceptance criteria

1. Filter bar visible on `/dashboard` with both controls in their correct positions.
2. Selecting `30d` updates URL to `?range=30d`, refreshes the page, and:
   - HeroCard KPI shows deploys-in-30d count + 30-day delta vs previous 30d.
   - HeroCard chart shows 30 day-bins with correct labels.
   - FactStrip "Failed Nh" cell renamed to `Failed 30d`, count window updated.
   - ActivityFeed filtered to events within 30d, "last N events" eyebrow updates.
3. Typing `api-gateway` in search updates URL (debounced) to `?q=api-gateway`, deployment lists in service cards filter to matching rows, ActivityFeed filters to matching events, LinkedProjects filters to matching links.
4. Refreshing the page preserves both filters from URL.
5. Sharing the URL with another user (in same account) reproduces the same filtered view.
6. Empty search clears with the ⌫ button. Empty range falls back to `7d`.
7. Build / typecheck / lint clean.
8. No layout shift on the filter-bar mount (page doesn't jump when controls render).

## Out of scope (track for follow-ups)

1. **Per-service-card range support** — VercelCard / NetlifyCard / SupabaseCard each currently fetch their own deploys with a hardcoded `limit=10` query. Honoring `range` would mean adding a `?since=<iso>` parameter to those API routes, which expands DB queries and 3rd-party API call shapes. Out of v1; track as `range-extends-to-cards`.
2. **Custom range picker** (e.g. "between Apr 1 and Apr 15"). YAGNI; track as `custom-range`.
3. **Saved filter presets** ("My filters: failing-deploys-this-week"). Future work; track as `saved-filters`.
4. **Deeper deploy history fetching for 30d/90d** — current `limit=10` may not cover the range. Track as `deploy-history-pagination`.
5. **Cmd-K palette / keyboard shortcuts** for search. Track as `keyboard-shortcuts`.

## Risks / open questions

- **Hour-bin labels for 24h chart** may render cramped on mobile. Mitigation: drop the bottom labels at narrow widths and rely on the data-tooltip-on-hover (already a chart feature). Address in implementation if visual QA flags it.
- **Search debounce timing** (250ms) is a guess. Tune during visual QA.
- **Range button accessibility** — segmented control needs `role="tablist"` / `role="tab"` semantics OR plain `<button>` with `aria-pressed`. Pick `aria-pressed` (simpler, conveys state correctly).
