# DevPulse UI Controls (Time Range + Search) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a thin filter bar to the dashboard with a 4-option time-range segmented control and a global search input. State lives in URL query params; consumers read via React context.

**Architecture:** Bottom-up. (1) Define shared types + context. (2) Build `FilterBar` UI. (3) Generalize `DeployBarChart` from 7-day fixed bins to a `bins[]` prop. (4) Wire dashboard page to parse URL → provider. (5) Have each consumer (`HeroCard`, `FactStrip`, `ActivityFeed`, `DeploymentList`, `LinkedProjects`) read context and apply filters/cutoffs to already-fetched in-memory data. No new API endpoints in v1.

**Tech Stack:** Next.js 14 App Router · `useSearchParams` + `useRouter` for URL state · React context for in-tree filter values · existing hand-rolled SVG charts (extended) · existing tokens from the cream/cobalt design system.

---

## Verification approach

No automated tests. Per task verify via:

1. **`npm run typecheck`** — TypeScript compiles
2. **`npm run lint`** — ESLint clean
3. **Visual:** `npm run dev`, navigate to `/dashboard`, confirm the route renders without console errors and behaves per the task's success criteria

The dashboard page is auth-gated; for visual checks ensure you have a valid session.

## Spec reference

`docs/superpowers/specs/2026-04-29-ui-controls-design.md`. Read the "Components" and "Acceptance criteria" sections for the design contract.

---

## Tasks

### Task 1: Define `FilterRange` type, helpers, and context

**Files:**
- Create: `components/dashboard/filter-context.tsx`

- [ ] **Step 1: Create `components/dashboard/filter-context.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. (No consumers yet; the file just exports types and helpers.)

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/filter-context.tsx
git commit -m "feat(dashboard): add filter context with range + query helpers"
```

---

### Task 2: Build `FilterBar` component

**Files:**
- Create: `components/dashboard/FilterBar.tsx`

- [ ] **Step 1: Create `components/dashboard/FilterBar.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. (FilterBar isn't mounted yet; just compiles.)

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/FilterBar.tsx
git commit -m "feat(dashboard): add FilterBar with segmented range + debounced search"
```

---

### Task 3: Wire the dashboard page to parse URL params and mount the FilterBar + Provider

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Replace `app/dashboard/page.tsx` with**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTokensRow, initSchema } from "@/lib/db";
import type { ConnectedServices } from "@/types";
import { Header } from "@/components/dashboard/Header";
import { FactStrip } from "@/components/dashboard/FactStrip";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { FilterProvider, isFilterRange, type FilterRange } from "@/components/dashboard/filter-context";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { VercelCard } from "@/components/dashboard/VercelCard";
import { NetlifyCard } from "@/components/dashboard/NetlifyCard";
import { SupabaseCard } from "@/components/dashboard/SupabaseCard";
import { LinkedProjects } from "@/components/dashboard/LinkedProjects";
import { UsageBars } from "@/components/dashboard/UsageBars";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

// Force-dynamic: dashboard is user-specific; cannot cache statically
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string; q?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  let connected: ConnectedServices = { vercel: false, netlify: false, supabase: false };
  try {
    await initSchema();
    const row = await getTokensRow(session.user.id);
    connected = {
      vercel: Boolean(row?.vercel_token),
      netlify: Boolean(row?.netlify_token),
      supabase: Boolean(row?.supabase_token),
    };
  } catch {
    // DB unreachable — show dashboard with nothing connected
  }

  if (!connected.vercel && !connected.netlify && !connected.supabase) {
    redirect("/onboarding");
  }

  const range: FilterRange = isFilterRange(searchParams.range) ? searchParams.range : "7d";
  const q = (searchParams.q ?? "").trim().toLowerCase().slice(0, 200);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <Header email={session.user.email} />
      <FactStrip connected={connected} />
      <FilterProvider range={range} q={q}>
        <FilterBar range={range} q={q} />
        <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <HeroCard connected={connected} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <VercelCard connected={connected.vercel} />
            <NetlifyCard connected={connected.netlify} />
            <SupabaseCard connected={connected.supabase} />
          </div>
          <LinkedProjects connected={connected} />
          <UsageBars connected={connected} />
          <ActivityFeed connected={connected} />
        </div>
      </FilterProvider>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke (`npm run dev`)**

Open `http://localhost:3000/dashboard?range=30d&q=api`. Confirm:
- The FilterBar renders between FactStrip and the inner content.
- `30d` button is highlighted (`bg-fg text-bg`).
- Search input shows `api`.
- Click `7d` — URL changes to `/dashboard?q=api` (no `range=7d` since that's default).
- Type in search — URL updates after ~250ms.

Consumer components don't react to filters yet — that's tasks 4–9.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): mount FilterBar + provider, parse range/q from URL"
```

---

### Task 4: Generalize `DeployBarChart` to accept arbitrary bins

**Files:**
- Modify: `components/dashboard/DeployBarChart.tsx`

The chart currently builds 7 day-bins from a `deployments[]` prop. Refactor so it takes a pre-computed `bins[]` array and renders them. The 7-day computation moves out of the chart and into the caller (HeroCard, in Task 5).

- [ ] **Step 1: Replace `components/dashboard/DeployBarChart.tsx`**

```tsx
export interface ChartBin {
  /** Short label rendered under the bar (1–3 chars). */
  label: string;
  /** Bar value (number of items). */
  count: number;
  /** Items in error state — bar renders danger if > 0. */
  errors: number;
  /** Optional unique key for React key prop; falls back to index if absent. */
  key?: string;
}

interface Props {
  bins: ChartBin[];
  /** When true, x-axis labels are rendered every Nth bin where N = labelEvery. */
  labelEvery?: number;
}

export function DeployBarChart({ bins, labelEvery = 1 }: Props) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  const niceMax = max <= 4 ? 4 : max <= 8 ? 8 : max <= 12 ? 12 : Math.ceil(max / 5) * 5;
  const halfMax = Math.round(niceMax / 2);
  const peakIdx = bins.findIndex((b) => b.count === max && b.count > 0);

  const W = 320;
  const H = 120;
  const padL = 22;
  const padR = 6;
  const padT = 8;
  const padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const baselineY = H - padB;
  const barGap = bins.length > 30 ? 1 : bins.length > 14 ? 2 : 6;
  const barW = (chartW - barGap * Math.max(0, bins.length - 1)) / Math.max(1, bins.length);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Deploys per period"
      >
        {/* gridlines */}
        <line x1={padL} y1={padT} x2={W - padR} y2={padT} stroke="var(--chart-grid)" strokeWidth={1} />
        <line x1={padL} y1={padT + chartH / 2} x2={W - padR} y2={padT + chartH / 2} stroke="var(--chart-grid)" strokeWidth={1} />
        {/* baseline */}
        <line x1={padL} y1={baselineY} x2={W - padR} y2={baselineY} stroke="var(--rule)" strokeWidth={1} />

        {/* y-axis labels */}
        <text x={padL - 4} y={padT + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--muted-soft)">{niceMax}</text>
        <text x={padL - 4} y={padT + chartH / 2 + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--muted-soft)">{halfMax}</text>
        <text x={padL - 4} y={baselineY + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--muted-soft)">0</text>

        {/* bars */}
        {bins.map((bin, i) => {
          const h = bin.count === 0 ? 0 : (bin.count / niceMax) * chartH;
          const x = padL + i * (barW + barGap);
          const y = baselineY - h;
          let fill = "var(--chart-bar-typical)";
          if (bin.errors > 0) fill = "var(--danger)";
          else if (i === peakIdx && bin.count > 0) fill = "var(--brand)";
          const showLabel = i % labelEvery === 0;
          return (
            <g key={bin.key ?? i}>
              {h > 0 && <rect x={x} y={y} width={barW} height={h} fill={fill} />}
              {showLabel && bin.label && (
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  className="mono"
                  fontSize={9}
                  fill="var(--muted-soft)"
                >
                  {bin.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-brand" />
          peak
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="inline-block h-2 w-2 bg-[var(--chart-bar-typical)]" />
          typical
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="inline-block h-2 w-2 bg-danger" />
          had errors
        </span>
      </div>
    </div>
  );
}
```

Key changes vs prior version:
- New `ChartBin` interface, exported for callers.
- Prop is `bins: ChartBin[]` instead of `deployments: DeploymentData[]`.
- Bar gap shrinks for higher bin counts (30+ bins → 1px, 14+ → 2px, else 6px) so 90d week-bins still look proportional.
- New optional `labelEvery` prop hides x-axis labels except every Nth bin (callers use this for 30d and 90d to avoid overlapping labels).
- Aria label is now generic ("Deploys per period") since it's no longer always 7 days.

This task **breaks** the existing call site in `HeroCard.tsx` until Task 5 is complete. Typecheck will fail until then.

- [ ] **Step 2: Verify (with expected forward-reference error)**

```
npm run typecheck
```

Expected: ONE error in `HeroCard.tsx` — `Property 'deployments' does not exist on type ChartBin[]` or similar. This resolves in Task 5.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DeployBarChart.tsx
git commit -m "refactor(charts): generalize DeployBarChart to bins[] prop"
```

---

### Task 5: Make `HeroCard` consume the filter range and compute bins

**Files:**
- Modify: `components/dashboard/HeroCard.tsx`

The HeroCard needs to:
1. Read `range` and `cutoffMs` from `useFilter()`.
2. Compute the KPI count (deploys within `cutoffMs`).
3. Compute the prev-period delta (deploys in `[2*cutoffMs, cutoffMs)` window).
4. Build the `bins[]` array based on the range:
   - `24h`: 24 hour-bins.
   - `7d`: 7 day-bins.
   - `30d`: 30 day-bins.
   - `90d`: 13 week-bins.

- [ ] **Step 1: Replace `components/dashboard/HeroCard.tsx`**

Add an import for filter context and `ChartBin` type, then add a `buildBins` helper above the component, and modify the component to consume the filter and compute everything.

The full file content:

```tsx
"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type {
  ConnectedServices,
  DeploymentData,
  DomainData,
  NetlifyBandwidthData,
  NetlifyResponse,
  SupabaseResponse,
  VercelUsageData,
} from "@/types";
import { cn } from "@/lib/utils";
import { DeployBarChart, type ChartBin } from "./DeployBarChart";
import { useFilter, type FilterRange } from "./filter-context";

interface Issue {
  id: string;
  severity: "warning" | "danger";
  label: string;
}

const NETLIFY_BUILD_LIMIT = 300;

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function projectedEndOfMonth(currentPct: number): number {
  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (day < 3 || day >= daysInMonth) return currentPct;
  return (currentPct / day) * daysInMonth;
}

function buildIssues(args: {
  vercelDeploys?: DeploymentData[];
  vercelDomains?: DomainData[];
  vercelUsage?: VercelUsageData;
  netlify?: NetlifyResponse;
  netlifyBw?: NetlifyBandwidthData;
  supabase?: SupabaseResponse;
  cutoffMs: number;
}): Issue[] {
  const issues: Issue[] = [];
  const cutoff = Date.now() - args.cutoffMs;

  const allDeploys = [...(args.vercelDeploys ?? []), ...(args.netlify?.deploys ?? [])];
  const failing = allDeploys.filter(
    (d) => d.status === "error" && new Date(d.createdAt).getTime() >= cutoff,
  );
  if (failing.length > 0) {
    issues.push({
      id: "failing",
      severity: "danger",
      label: `${failing.length} failed deploy${failing.length === 1 ? "" : "s"} in ${labelForCutoff(args.cutoffMs)}`,
    });
  }

  const expiring = (args.vercelDomains ?? []).filter((d) => {
    const days = daysUntil(d.expiresAt);
    return days !== null && days <= 30 && days >= 0;
  });
  if (expiring.length > 0) {
    issues.push({
      id: "domains",
      severity: expiring.some((d) => (daysUntil(d.expiresAt) ?? 0) <= 7) ? "danger" : "warning",
      label: `${expiring.length} domain${expiring.length === 1 ? "" : "s"} expiring ≤30d`,
    });
  }

  if (args.netlify) {
    const pct = (args.netlify.buildMinutes / NETLIFY_BUILD_LIMIT) * 100;
    if (pct >= 90) {
      issues.push({ id: "netlify-build", severity: "danger", label: `Netlify build minutes ${Math.round(pct)}% of limit` });
    } else if (pct >= 70) {
      issues.push({ id: "netlify-build", severity: "warning", label: `Netlify build minutes ${Math.round(pct)}% of limit` });
    } else {
      const projected = projectedEndOfMonth(pct);
      if (projected >= 100) {
        issues.push({ id: "netlify-build-proj", severity: "warning", label: `Netlify build mins projected ${Math.round(projected)}% by EOM` });
      }
    }
  }

  if (args.netlifyBw?.available && args.netlifyBw.included) {
    const pct = ((args.netlifyBw.used ?? 0) / args.netlifyBw.included) * 100;
    if (pct >= 90) issues.push({ id: "netlify-bw", severity: "danger", label: `Netlify bandwidth ${Math.round(pct)}%` });
    else if (pct >= 70) issues.push({ id: "netlify-bw", severity: "warning", label: `Netlify bandwidth ${Math.round(pct)}%` });
    else {
      const projected = projectedEndOfMonth(pct);
      if (projected >= 100) issues.push({ id: "netlify-bw-proj", severity: "warning", label: `Netlify bandwidth projected ${Math.round(projected)}% by EOM` });
    }
  }

  if (args.vercelUsage?.available) {
    const u = args.vercelUsage;
    if (u.bandwidthLimitBytes && u.bandwidthBytes) {
      const pct = (u.bandwidthBytes / u.bandwidthLimitBytes) * 100;
      if (pct >= 90) issues.push({ id: "vercel-bw", severity: "danger", label: `Vercel bandwidth ${Math.round(pct)}%` });
      else if (pct >= 70) issues.push({ id: "vercel-bw", severity: "warning", label: `Vercel bandwidth ${Math.round(pct)}%` });
      else {
        const projected = projectedEndOfMonth(pct);
        if (projected >= 100) issues.push({ id: "vercel-bw-proj", severity: "warning", label: `Vercel bandwidth projected ${Math.round(projected)}% by EOM` });
      }
    }
    if (u.functionInvocationsLimit && u.functionInvocations) {
      const pct = (u.functionInvocations / u.functionInvocationsLimit) * 100;
      if (pct >= 90) issues.push({ id: "vercel-fn", severity: "danger", label: `Vercel invocations ${Math.round(pct)}%` });
      else if (pct >= 70) issues.push({ id: "vercel-fn", severity: "warning", label: `Vercel invocations ${Math.round(pct)}%` });
      else {
        const projected = projectedEndOfMonth(pct);
        if (projected >= 100) issues.push({ id: "vercel-fn-proj", severity: "warning", label: `Vercel invocations projected ${Math.round(projected)}% by EOM` });
      }
    }
  }

  if (args.supabase) {
    const paused = args.supabase.projects.filter((p) => p.status === "paused");
    if (paused.length > 0) {
      issues.push({ id: "supabase-paused", severity: "warning", label: `${paused.length} Supabase project${paused.length === 1 ? "" : "s"} paused` });
    }
    for (const h of args.supabase.health) {
      const unhealthy = h.services.filter((s) => !s.healthy);
      if (unhealthy.length > 0) {
        issues.push({
          id: `supabase-health-${h.projectRef}`,
          severity: "danger",
          label: `${unhealthy.length} Supabase service${unhealthy.length === 1 ? "" : "s"} unhealthy`,
        });
      }
    }
    for (const u of args.supabase.usage) {
      if (!u.available || !u.dbSizeBytes || !u.dbSizeLimitBytes) continue;
      const pct = (u.dbSizeBytes / u.dbSizeLimitBytes) * 100;
      if (pct >= 90) issues.push({ id: `supabase-db-${u.projectRef}`, severity: "danger", label: `${u.projectName} DB ${Math.round(pct)}% full` });
      else if (pct >= 70) issues.push({ id: `supabase-db-${u.projectRef}`, severity: "warning", label: `${u.projectName} DB ${Math.round(pct)}% full` });
    }
  }

  return issues;
}

function labelForCutoff(cutoffMs: number): string {
  const hours = Math.round(cutoffMs / (60 * 60 * 1000));
  if (hours <= 24) return "24h";
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function countInWindow(deploys: DeploymentData[], startMs: number, endMs: number): number {
  return deploys.filter((d) => {
    const t = new Date(d.createdAt).getTime();
    return t >= startMs && t < endMs;
  }).length;
}

function buildBins(deploys: DeploymentData[], range: FilterRange): { bins: ChartBin[]; labelEvery: number } {
  const now = Date.now();

  if (range === "24h") {
    // 24 hour-bins, label every 4h
    const bins: ChartBin[] = [];
    for (let i = 23; i >= 0; i--) {
      const start = now - (i + 1) * 60 * 60 * 1000;
      const end = now - i * 60 * 60 * 1000;
      const count = deploys.filter((d) => {
        const t = new Date(d.createdAt).getTime();
        return t >= start && t < end;
      }).length;
      const errors = deploys.filter((d) => {
        const t = new Date(d.createdAt).getTime();
        return t >= start && t < end && d.status === "error";
      }).length;
      const hourLabel = new Date(end - 1).getHours();
      bins.push({
        key: `h-${i}`,
        label: i % 4 === 0 ? String(hourLabel).padStart(2, "0") : "",
        count,
        errors,
      });
    }
    return { bins, labelEvery: 1 };
  }

  if (range === "7d") {
    const bins: ChartBin[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const count = countInWindow(deploys, start, end);
      const errors = deploys.filter((d) => {
        const t = new Date(d.createdAt).getTime();
        return t >= start && t < end && d.status === "error";
      }).length;
      bins.push({
        key: `d-${day.toISOString().slice(0, 10)}`,
        label: day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
        count,
        errors,
      });
    }
    return { bins, labelEvery: 1 };
  }

  if (range === "30d") {
    const bins: ChartBin[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const start = day.getTime();
      const end = start + 24 * 60 * 60 * 1000;
      const count = countInWindow(deploys, start, end);
      const errors = deploys.filter((d) => {
        const t = new Date(d.createdAt).getTime();
        return t >= start && t < end && d.status === "error";
      }).length;
      bins.push({
        key: `d-${day.toISOString().slice(0, 10)}`,
        label: `d${30 - i}`,
        count,
        errors,
      });
    }
    return { bins, labelEvery: 7 };
  }

  // 90d → 13 week-bins
  const bins: ChartBin[] = [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  for (let i = 12; i >= 0; i--) {
    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - (i + 1) * 7 + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const start = weekStart.getTime();
    const end = weekEnd.getTime();
    const count = countInWindow(deploys, start, end);
    const errors = deploys.filter((d) => {
      const t = new Date(d.createdAt).getTime();
      return t >= start && t < end && d.status === "error";
    }).length;
    bins.push({
      key: `w-${weekStart.toISOString().slice(0, 10)}`,
      label: `w${13 - i}`,
      count,
      errors,
    });
  }
  return { bins, labelEvery: 1 };
}

export function HeroCard({ connected }: { connected: ConnectedServices }) {
  const { range, cutoffMs } = useFilter();

  const vercelDeploys = useSWR<DeploymentData[]>(
    connected.vercel ? "/api/vercel/deployments" : null,
    fetcher,
    SWR_CONFIG,
  );
  const vercelDomains = useSWR<DomainData[]>(
    connected.vercel ? "/api/vercel/domains" : null,
    fetcher,
    SWR_CONFIG,
  );
  const vercelUsage = useSWR<VercelUsageData>(
    connected.vercel ? "/api/vercel/usage" : null,
    fetcher,
    SWR_CONFIG,
  );
  const netlify = useSWR<NetlifyResponse>(
    connected.netlify ? "/api/netlify/deploys" : null,
    fetcher,
    SWR_CONFIG,
  );
  const netlifyBw = useSWR<NetlifyBandwidthData>(
    connected.netlify ? "/api/netlify/bandwidth" : null,
    fetcher,
    SWR_CONFIG,
  );
  const supabase = useSWR<SupabaseResponse>(
    connected.supabase ? "/api/supabase/projects" : null,
    fetcher,
    SWR_CONFIG,
  );

  const issues = buildIssues({
    vercelDeploys: vercelDeploys.data,
    vercelDomains: vercelDomains.data,
    vercelUsage: vercelUsage.data,
    netlify: netlify.data,
    netlifyBw: netlifyBw.data,
    supabase: supabase.data,
    cutoffMs,
  });

  const allDeploys: DeploymentData[] = [
    ...(vercelDeploys.data ?? []),
    ...(netlify.data?.deploys ?? []),
  ];

  const now = Date.now();
  const inRangeCount = countInWindow(allDeploys, now - cutoffMs, now);
  const prevRangeCount = countInWindow(allDeploys, now - 2 * cutoffMs, now - cutoffMs);
  const deltaPct =
    prevRangeCount === 0
      ? null
      : Math.round(((inRangeCount - prevRangeCount) / prevRangeCount) * 100);

  const { bins, labelEvery } = buildBins(allDeploys, range);
  const topIssue = issues.find((i) => i.severity === "danger") ?? issues[0];

  return (
    <div className="border border-border bg-surface">
      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-8 md:gap-10">
        <div>
          <div
            className={cn(
              "mono text-[9px] uppercase tracking-[0.15em] font-medium",
              topIssue?.severity === "danger" && "text-danger",
              topIssue?.severity === "warning" && "text-warning",
              !topIssue && "text-success",
            )}
          >
            {topIssue?.severity === "danger"
              ? "[!] needs_attention"
              : topIssue?.severity === "warning"
                ? "[~] heads_up"
                : "[ok] all_clear"}
          </div>
          <h2 className="mt-2 text-2xl font-semibold leading-tight tracking-tight md:text-[26px]">
            {topIssue
              ? topIssue.label
              : `${inRangeCount} deploy${inRangeCount === 1 ? "" : "s"} in ${range} — all systems healthy.`}
          </h2>
          {issues.length > 1 && (
            <ul className="mt-4 space-y-1 text-[12px] text-muted">
              {issues.slice(1, 4).map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      i.severity === "danger" ? "bg-danger" : "bg-warning",
                    )}
                  />
                  {i.label}
                </li>
              ))}
              {issues.length > 4 && (
                <li className="text-[11px] text-muted-soft">+{issues.length - 4} more</li>
              )}
            </ul>
          )}
        </div>
        <div className="border-t border-border pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
          <div className="text-[9px] uppercase tracking-[0.15em] font-medium text-muted-soft">
            Deploys / {range}
          </div>
          <div className="mt-1 mono tnum text-[40px] font-semibold leading-none tracking-tight">
            {inRangeCount}
          </div>
          {deltaPct !== null && (
            <div
              className={cn(
                "mt-1 mono tnum text-[11px]",
                deltaPct >= 0 ? "text-brand" : "text-danger",
              )}
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct}% vs previous {range}
            </div>
          )}
          <div className="mt-4">
            <DeployBarChart bins={bins} labelEvery={labelEvery} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

Key changes vs prior version:
- Imports `useFilter` and `FilterRange` from filter-context, `ChartBin` from DeployBarChart.
- New `buildBins(deploys, range)` helper that returns `{ bins, labelEvery }` for any of the four ranges.
- `countLast7Days` and `countLast14To7Days` removed; replaced by generic `countInWindow(deploys, startMs, endMs)` and computed against `cutoffMs` from filter.
- KPI label is now `Deploys / ${range}` instead of `Deploys / 7d`.
- Delta label is now `vs previous ${range}` instead of `vs previous 7d`.
- All-clear headline reads `${count} deploys in ${range} — all systems healthy.`
- `buildIssues` now takes a `cutoffMs` parameter and uses it for the "failed in N" cutoff. Issue label says `in ${labelForCutoff(cutoffMs)}` instead of `in 24h`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. (Resolves the forward-reference from Task 4.)

- [ ] **Step 3: Visual smoke**

Open `/dashboard?range=24h`. Confirm:
- KPI label says `Deploys / 24h`.
- Chart shows 24 bars (hour-bins) with hour labels at 0/4/8/12/16/20.
- Switch to `?range=30d`. Chart shows 30 bars with `d1`, `d8`, `d15`, `d22`, `d29` labels.
- Switch to `?range=90d`. Chart shows 13 bars with `w1`, `w7`, `w13` labels.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/HeroCard.tsx
git commit -m "feat(dashboard): HeroCard consumes range, computes bins per range"
```

---

### Task 6: Make `FactStrip` consume the range

**Files:**
- Modify: `components/dashboard/FactStrip.tsx`

- [ ] **Step 1: Replace `components/dashboard/FactStrip.tsx`**

```tsx
"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type {
  ConnectedServices,
  DeploymentData,
  DomainData,
  NetlifyResponse,
  SupabaseResponse,
} from "@/types";
import { cn } from "@/lib/utils";
import { useFilter } from "./filter-context";

function countInWindow(deploys: DeploymentData[], startMs: number, endMs: number): number {
  return deploys.filter((d) => {
    const t = new Date(d.createdAt).getTime();
    return t >= startMs && t < endMs;
  }).length;
}

function countErrorsInWindow(deploys: DeploymentData[], startMs: number, endMs: number): number {
  return deploys.filter(
    (d) =>
      d.status === "error" &&
      new Date(d.createdAt).getTime() >= startMs &&
      new Date(d.createdAt).getTime() < endMs,
  ).length;
}

const NETLIFY_BUILD_LIMIT = 300;

export function FactStrip({ connected }: { connected: ConnectedServices }) {
  const { range, cutoffMs } = useFilter();

  const vercel = useSWR<DeploymentData[]>(
    connected.vercel ? "/api/vercel/deployments" : null,
    fetcher,
    SWR_CONFIG,
  );
  const netlify = useSWR<NetlifyResponse>(
    connected.netlify ? "/api/netlify/deploys" : null,
    fetcher,
    SWR_CONFIG,
  );
  const supabase = useSWR<SupabaseResponse>(
    connected.supabase ? "/api/supabase/projects" : null,
    fetcher,
    SWR_CONFIG,
  );
  const domains = useSWR<DomainData[]>(
    connected.vercel ? "/api/vercel/domains" : null,
    fetcher,
    SWR_CONFIG,
  );

  const allDeploys: DeploymentData[] = [
    ...(vercel.data ?? []),
    ...(netlify.data?.deploys ?? []),
  ];

  const totalProjects =
    (vercel.data?.length ? new Set(vercel.data.map((d) => d.project)).size : 0) +
    (netlify.data?.deploys.length ? new Set(netlify.data.deploys.map((d) => d.project)).size : 0) +
    (supabase.data?.projects.length ?? 0);

  const now = Date.now();
  const failedInRange = countErrorsInWindow(allDeploys, now - cutoffMs, now);
  const deploysInRange = countInWindow(allDeploys, now - cutoffMs, now);
  const buildMin = netlify.data?.buildMinutes ?? 0;
  const domainsCount = domains.data?.length ?? 0;

  const supabaseHealth = supabase.data?.health ?? [];
  const allHealthy = supabaseHealth.length === 0
    ? null
    : supabaseHealth.every((h) =>
        h.available === false ? true : h.services.every((s) => s.healthy),
      );

  const cells: { label: string; value: React.ReactNode; tone?: "default" | "danger" | "success" }[] = [
    { label: "Projects", value: totalProjects },
    { label: `Deploys ${range}`, value: deploysInRange },
    {
      label: `Failed ${range}`,
      value: failedInRange,
      tone: failedInRange > 0 ? "danger" : "default",
    },
    {
      label: "Build min",
      value: connected.netlify ? `${buildMin} / ${NETLIFY_BUILD_LIMIT}` : "—",
    },
    {
      label: "Domains",
      value: connected.vercel ? domainsCount : "—",
    },
    {
      label: "Health",
      value: allHealthy === null ? "—" : allHealthy ? "all up" : "issues",
      tone: allHealthy === false ? "danger" : allHealthy ? "success" : "default",
    },
  ];

  return (
    <div className="border-y border-border" style={{ borderTopColor: "var(--rule)", borderTopWidth: 1 }}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={cn(
              "px-4 py-2.5",
              i < cells.length - 1 && "border-r border-border",
              "last:border-r-0",
              "lg:[&:nth-child(6n)]:border-r-0",
            )}
          >
            <div className="text-[9px] uppercase tracking-[0.15em] font-medium text-muted-soft">
              {c.label}
            </div>
            <div
              className={cn(
                "mono tnum text-base font-semibold leading-tight",
                c.tone === "danger" && "text-danger",
                c.tone === "success" && "text-success",
              )}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Key changes:
- Imports `useFilter` from filter-context.
- `countErrors24h` → `countErrorsInWindow` (parameterized).
- `countLast7Days` removed; replaced by `countInWindow` against `cutoffMs`.
- `Deploys 7d` cell relabeled to `Deploys ${range}`.
- `Failed 24h` cell relabeled to `Failed ${range}` and uses cutoffMs window.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

Open `/dashboard?range=24h`. FactStrip cells now read `Deploys 24h` and `Failed 24h`. Switch to `?range=30d` — labels update.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/FactStrip.tsx
git commit -m "feat(dashboard): FactStrip consumes range, dynamically labels cells"
```

---

### Task 7: Make `ActivityFeed` consume range + query

**Files:**
- Modify: `components/dashboard/ActivityFeed.tsx`

- [ ] **Step 1: Replace `components/dashboard/ActivityFeed.tsx`**

```tsx
"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type { ActivityEvent, ConnectedServices, DeploymentData, NetlifyResponse, SupabaseResponse } from "@/types";
import { cn } from "@/lib/utils";
import { matchesQuery, useFilter } from "./filter-context";

const EVENT_COLOR: Record<ActivityEvent["type"], string> = {
  deploy_success: "bg-success",
  deploy_fail: "bg-danger",
  deploy_building: "bg-warning",
  user_signup: "bg-brand",
  error: "bg-danger",
};

function timeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function deployToEvent(d: DeploymentData): ActivityEvent {
  const type: ActivityEvent["type"] =
    d.status === "ready"
      ? "deploy_success"
      : d.status === "error"
        ? "deploy_fail"
        : d.status === "building"
          ? "deploy_building"
          : "deploy_success";
  const verb =
    d.status === "ready"
      ? "deployed"
      : d.status === "error"
        ? "failed to deploy"
        : d.status === "building"
          ? "is building"
          : "cancelled";
  return {
    id: `${d.provider}:${d.id}`,
    type,
    message: `${d.project} ${verb}${d.branch ? ` · ${d.branch}` : ""}`,
    service: d.provider,
    timestamp: d.createdAt,
  };
}

export function ActivityFeed({ connected }: { connected: ConnectedServices }) {
  const { cutoffMs, q } = useFilter();

  const vercel = useSWR<DeploymentData[]>(
    connected.vercel ? "/api/vercel/deployments" : null,
    fetcher,
    SWR_CONFIG,
  );
  const netlify = useSWR<NetlifyResponse>(
    connected.netlify ? "/api/netlify/deploys" : null,
    fetcher,
    SWR_CONFIG,
  );
  const supabase = useSWR<SupabaseResponse>(
    connected.supabase ? "/api/supabase/projects" : null,
    fetcher,
    SWR_CONFIG,
  );

  const events: ActivityEvent[] = [
    ...((vercel.data ?? []).map(deployToEvent)),
    ...((netlify.data?.deploys ?? []).map(deployToEvent)),
  ];
  if (supabase.data) {
    for (const project of supabase.data.projects) {
      if (project.status === "paused") {
        events.push({
          id: `supabase:${project.id}:paused`,
          type: "error",
          message: `${project.name} is paused`,
          service: "supabase",
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  const cutoff = Date.now() - cutoffMs;
  const filtered = events
    .filter((e) => new Date(e.timestamp).getTime() >= cutoff)
    .filter((e) => matchesQuery(e.message, q) || matchesQuery(e.service, q));

  const sorted = filtered
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">Recent activity</h3>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-soft">
          {q ? `${sorted.length} match${sorted.length === 1 ? "" : "es"}` : `last ${sorted.length} events`}
        </span>
      </div>
      <div className="border-t border-rule">
        {sorted.length === 0 ? (
          <p className="py-4 text-[13px] text-muted">
            {q ? `No activity matches "${q}".` : "No recent activity."}
          </p>
        ) : (
          <ul>
            {sorted.map((e) => (
              <li
                key={e.id}
                className={cn(
                  "grid grid-cols-[64px_1fr_84px_24px] items-center gap-3 border-b border-border px-2 py-2 text-[13px]",
                  e.type === "deploy_fail" && "bg-danger-soft",
                )}
              >
                <span className="mono tnum text-[11px] text-muted-soft">
                  {timeShort(e.timestamp)}
                </span>
                <span className="min-w-0 truncate text-fg">{e.message}</span>
                <span className="mono text-[11px] text-muted">{e.service}</span>
                <span className={cn("h-1.5 w-1.5 rounded-full justify-self-end", EVENT_COLOR[e.type])} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
```

Key changes:
- Imports `useFilter` and `matchesQuery` from filter-context.
- Filters events to `>= now - cutoffMs`.
- Filters by `matchesQuery(message, q) || matchesQuery(service, q)`.
- Eyebrow shows `N matches` when query is active, else `last N events`.
- Empty state shows the query in the message when active.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

`/dashboard?range=24h&q=api`. Confirm only events from the last 24h matching "api" render. Eyebrow says `N matches`.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/ActivityFeed.tsx
git commit -m "feat(dashboard): ActivityFeed consumes range cutoff + query filter"
```

---

### Task 8: Make `DeploymentList` consume the query (and handle empty match state)

**Files:**
- Modify: `components/dashboard/DeploymentList.tsx`

- [ ] **Step 1: Replace `components/dashboard/DeploymentList.tsx`**

```tsx
"use client";

import type { DeploymentData } from "@/types";
import { StatusDot } from "./StatusDot";
import { formatDuration, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { matchesQuery, useFilter } from "./filter-context";

export function DeploymentList({ deployments }: { deployments: DeploymentData[] }) {
  const { q } = useFilter();

  const filtered = q
    ? deployments.filter(
        (d) =>
          matchesQuery(d.project, q) ||
          matchesQuery(d.branch, q) ||
          matchesQuery(d.commitMessage, q),
      )
    : deployments;

  if (!deployments.length) {
    return <p className="text-[13px] text-muted">No deployments found.</p>;
  }
  if (q && filtered.length === 0) {
    return <p className="text-[13px] text-muted">No deployments match &ldquo;{q}&rdquo;.</p>;
  }

  return (
    <ul className="divide-y divide-border border-y border-border">
      {filtered.map((d) => (
        <li
          key={d.id}
          className="group flex items-start gap-3 px-2 py-2 transition-colors hover:bg-surface-alt"
        >
          <StatusDot status={d.status} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-sm font-medium">{d.project}</span>
              {d.context && (
                <span
                  className={cn(
                    "border px-1 py-0 text-[9px] mono uppercase tracking-[0.15em]",
                    d.context === "production"
                      ? "border-brand/40 bg-brand-soft text-brand"
                      : "border-border bg-surface-alt text-muted",
                  )}
                >
                  {d.context === "production" ? "prod" : d.context === "preview" ? "prev" : "branch"}
                </span>
              )}
              {d.branch && (
                <span className="mono truncate text-[11px] text-muted">{d.branch}</span>
              )}
            </div>
            {d.commitMessage && (
              <p className="truncate text-xs text-muted">{d.commitMessage}</p>
            )}
          </div>
          <div className="mono tnum shrink-0 text-right">
            <div className="text-[11px] text-fg">{formatDuration(d.duration)}</div>
            <div className="text-[10px] text-muted-soft">{timeAgo(d.createdAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

Key changes:
- File becomes a Client Component (`"use client"` at top) because it now consumes context. (It was previously a passthrough server-friendly component with no client-only deps.)
- Imports `matchesQuery` and `useFilter`.
- Pre-filters by query before rendering.
- New empty-match state.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DeploymentList.tsx
git commit -m "feat(dashboard): DeploymentList filters by query"
```

---

### Task 9: Make `LinkedProjects` consume the query

**Files:**
- Modify: `components/dashboard/LinkedProjects.tsx`

- [ ] **Step 1: Apply targeted change to `components/dashboard/LinkedProjects.tsx`**

This file is large; do not rewrite the whole thing. Apply these targeted edits:

1. Add the imports at the top:

   ```tsx
   import { matchesQuery, useFilter } from "./filter-context";
   ```

2. Inside the `LinkedProjects` component, after the existing `useState` declarations and `useMemo` for `frontendOptions`, derive a `filteredLinks`:

   ```tsx
   const { q } = useFilter();
   const filteredLinks = q
     ? (links.data ?? []).filter((l) => {
         const supName = supabase.data?.projects.find(
           (p) => p.domain.startsWith(`${l.supabaseProjectRef}.`),
         )?.name;
         return (
           matchesQuery(l.frontendProjectName, q) ||
           matchesQuery(l.supabaseProjectRef, q) ||
           matchesQuery(supName, q)
         );
       })
     : links.data;
   ```

3. Replace the existing `{links.data && links.data.length === 0 && !adding && (...)}` and `{links.data && links.data.length > 0 && (...)}` blocks with versions that use `filteredLinks`:

   ```tsx
   {!adding && filteredLinks && filteredLinks.length === 0 && (
     <p className="text-[13px] text-muted">
       {q
         ? `No linked projects match "${q}".`
         : "Pair a frontend project with a Supabase project to see deploy + DB state side-by-side."}
     </p>
   )}

   {filteredLinks && filteredLinks.length > 0 && (
     <ul className="space-y-1">
       {filteredLinks.map((l) => {
         // ... existing per-link rendering body, unchanged ...
       })}
     </ul>
   )}
   ```

   Inside the `.map((l) => { ... })` body, do NOT change anything — the rendering logic stays.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

`/dashboard?q=marketing`. If the user has linked projects matching "marketing", they render; otherwise the empty state says `No linked projects match "marketing".`

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/LinkedProjects.tsx
git commit -m "feat(dashboard): LinkedProjects filters by query"
```

---

### Task 10: Final smoke + cleanup

**Files:** none unless cleanup is needed

- [ ] **Step 1: Full verification**

```
npm run typecheck && npm run lint && npm run build
```

All three must PASS.

- [ ] **Step 2: End-to-end manual smoke**

```
npm run dev
```

Walk through each route + filter combination:
- `/dashboard` (no params): defaults to `range=7d`, no query. KPI label `Deploys / 7d`. FactStrip `Deploys 7d` + `Failed 7d`. Chart 7 day-bins.
- `/dashboard?range=24h`: KPI `Deploys / 24h`. FactStrip `Deploys 24h` + `Failed 24h`. Chart 24 hour-bins, hour labels at 0/4/8/12/16/20.
- `/dashboard?range=30d`: KPI `Deploys / 30d`. Chart 30 day-bins, labels every 7 days (`d1`, `d8`, `d15`, `d22`, `d29`).
- `/dashboard?range=90d`: KPI `Deploys / 90d`. Chart 13 week-bins (`w1`–`w13`).
- `/dashboard?q=api-gateway`: VercelCard / NetlifyCard deployment lists filter to matching rows. ActivityFeed filters to matching events. LinkedProjects filters. FactStrip and HeroCard KPI/chart unaffected (search doesn't filter aggregate stats).
- Click between range buttons — URL updates via `replace` (browser back returns to `/dashboard` not the previous range).
- Type in search — URL updates after 250ms. ⌫ clears it.
- Refresh on `/dashboard?range=30d&q=foo` — both filters preserved.
- Open `/dashboard?range=garbage`: falls back silently to `7d`.

- [ ] **Step 3: Spot-check accessibility**

- Range buttons: each has `aria-pressed={active}`. The group has `role="group" aria-label="Time range"`.
- Search input: has `aria-label="Filter dashboard"`.
- Clear button: has `aria-label="Clear filter"`.
- Tab order: range buttons → search input → (rest of dashboard).

- [ ] **Step 4: Commit (only if cleanup edits were needed)**

```bash
git status
# if changes:
git add -A
git commit -m "chore: ui-controls cleanup"
```

If no edits were needed, no commit. Report DONE.

---

## Self-review

**1. Spec coverage:**
- Filter bar between FactStrip and inner div → Task 3.
- 4-option range segmented control → Task 2.
- Search input with debounce + clear → Task 2.
- URL state via `?range` and `?q` → Task 3 (parsing) + Task 2 (writing).
- Default `7d` fallback → Task 3 (`isFilterRange` check).
- HeroCard reacts to range → Task 5.
- DeployBarChart bins per range → Task 4 (chart) + Task 5 (computation).
- FactStrip relabels cells, uses cutoffMs → Task 6.
- ActivityFeed filters by range + q → Task 7.
- DeploymentList filters by q (with empty-match state) → Task 8.
- LinkedProjects filters by q → Task 9.
- Per-service cards NOT directly filtering — confirmed: VercelCard / NetlifyCard / SupabaseCard pass through to DeploymentList. No tasks touch those files; their behavior emerges from DeploymentList changes. Acceptance criteria 3 lists "deployment lists in service cards filter to matching rows" — this happens naturally via DeploymentList in Task 8.

**2. Placeholder scan:** No "TBD" / "TODO" / vague directions. All steps have concrete code or commands.

**3. Type consistency:** `FilterRange`, `FilterValue`, `ChartBin`, `useFilter`, `matchesQuery`, `isFilterRange`, `rangeToCutoffMs` — names consistent across tasks 1, 2, 3, 4, 5, 6, 7, 8, 9.

**4. Single plan scope:** Yes — this plan is the A2 + A3 bundle, single ship-unit. The "out of scope" items in the spec are explicitly deferred to future sub-projects.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-29-ui-controls.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
