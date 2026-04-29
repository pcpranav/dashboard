# Deploy Logs Viewer (B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users click any deployment row in `VercelCard` / `NetlifyCard` and see that deploy's build logs at `/deploys/[provider]/[id]`, with metadata header + normalized monospace log view.

**Architecture:** A single server-rendered route fetches metadata + logs in parallel (no SWR, no new API routes). Both providers normalize to `LogLine[]` via dedicated fetcher functions, then render through one shared `LogView` client component. Refresh = `router.refresh()`.

**Tech Stack:** Next.js 14 App Router (server components + client islands), TypeScript, Tailwind, existing `@/lib/auth` + `@/lib/db` + `@/lib/fetchers/*` patterns. No new dependencies. **No test framework** — this codebase has no Jest/Vitest; verify via `npm run typecheck`, `npm run lint`, `npm run build`, and manual UI checks.

---

## File Map

```
types/index.ts                                 ← MODIFY: add LogLine type
lib/fetchers/vercel.ts                         ← MODIFY: extract mapper, add fetchVercelDeployment, fetchVercelDeployLogs
lib/fetchers/netlify.ts                        ← MODIFY: add NetlifyLogResult type, fetchNetlifyDeployment, fetchNetlifyDeployLog
components/deploys/DeployMetaHeader.tsx        ← CREATE: server component, deploy summary strip
components/deploys/LogView.tsx                 ← CREATE: client component, monospace log lines + copy button
components/deploys/RefreshButton.tsx           ← CREATE: client component, calls router.refresh()
app/deploys/[provider]/[id]/page.tsx           ← CREATE: server component, the route
app/deploys/[provider]/[id]/loading.tsx        ← CREATE: skeleton
components/dashboard/DeploymentList.tsx        ← MODIFY: wrap row content in <Link>
```

Each task below produces a self-contained commit. After each commit, the build still succeeds (the route works progressively as fetchers and UI fill in).

---

### Task 1: Add `LogLine` type

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Add the type to types/index.ts**

Add this block at the very end of `types/index.ts` (the file already exports many interfaces; just append):

```ts
export interface LogLine {
  ts: number | null;
  level: "info" | "warn" | "error";
  text: string;
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exits 0, no output.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(b1): add LogLine type for deploy logs"
```

---

### Task 2: Extract Vercel deployment mapper

**Files:**
- Modify: `lib/fetchers/vercel.ts`

This task is a pure refactor (no behavior change). It extracts the inline `.map(...)` body inside `fetchVercelDeployments` into a named helper so the single-deploy fetcher (Task 3) can reuse it.

- [ ] **Step 1: Add `mapVercelDeployment` helper**

In `lib/fetchers/vercel.ts`, just **above** the existing `export async function fetchVercelDeployments(...)` (around line 83), insert:

```ts
function mapVercelDeployment(d: VercelDeployment): DeploymentData {
  const startedAt = d.buildingAt ?? d.created;
  const duration = d.ready && startedAt ? Math.round((d.ready - startedAt) / 1000) : 0;
  return {
    id: d.uid,
    project: d.name,
    status: mapVercelState(d.readyState ?? d.state),
    branch: d.meta?.githubCommitRef ?? "",
    commitMessage: d.meta?.githubCommitMessage ?? "",
    duration,
    createdAt: new Date(d.created).toISOString(),
    url: d.url.startsWith("http") ? d.url : `https://${d.url}`,
    provider: "vercel" as const,
    context: mapVercelContext(d.target),
  };
}
```

- [ ] **Step 2: Replace the inline `.map(...)` body in `fetchVercelDeployments`**

Replace the existing function body of `fetchVercelDeployments` so it uses the helper. The full updated function:

```ts
export async function fetchVercelDeployments(token: string, limit = 10): Promise<DeploymentData[]> {
  const res = await fetch(`${BASE}/v6/deployments?limit=${limit}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vercel deployments ${res.status}`);
  const json = (await res.json()) as { deployments: VercelDeployment[] };
  return json.deployments.map(mapVercelDeployment);
}
```

- [ ] **Step 3: Verify typecheck + build still pass**

Run: `npm run typecheck && npm run build`
Expected: both succeed. Build output mentions all existing routes; no new ones yet.

- [ ] **Step 4: Commit**

```bash
git add lib/fetchers/vercel.ts
git commit -m "refactor(b1): extract mapVercelDeployment helper"
```

---

### Task 3: Add Vercel single-deploy + logs fetchers

**Files:**
- Modify: `lib/fetchers/vercel.ts`

- [ ] **Step 1: Add the `LogLine` import to `lib/fetchers/vercel.ts`**

The existing import block (lines 1-9) imports many types from `@/types`. Add `LogLine`:

```ts
import type {
  DeployContext,
  DeploymentData,
  DeployStatus,
  DomainData,
  LogLine,
  ProjectData,
  VercelTeam,
  VercelUsageData,
} from "@/types";
```

- [ ] **Step 2: Add `fetchVercelDeployment`**

Append to `lib/fetchers/vercel.ts` (after `fetchVercelDeployments`):

```ts
export async function fetchVercelDeployment(token: string, id: string): Promise<DeploymentData> {
  const res = await fetch(`${BASE}/v13/deployments/${encodeURIComponent(id)}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vercel deployment ${res.status}`);
  const raw = (await res.json()) as VercelDeployment;
  return mapVercelDeployment(raw);
}
```

- [ ] **Step 3: Add `fetchVercelDeployLogs`**

Append below `fetchVercelDeployment`:

```ts
interface VercelEvent {
  type?: string;
  created?: number;
  payload?: { text?: string };
  text?: string;
}

function inferLevel(text: string, type?: string): LogLine["level"] {
  if (type === "stderr") return "error";
  if (/error|✗|failed/i.test(text)) return "error";
  if (/warn/i.test(text)) return "warn";
  return "info";
}

export async function fetchVercelDeployLogs(token: string, id: string): Promise<LogLine[]> {
  const res = await fetch(
    `${BASE}/v3/deployments/${encodeURIComponent(id)}/events?limit=1000`,
    { headers: headers(token), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`vercel events ${res.status}`);
  const events = (await res.json()) as VercelEvent[];
  const lines: LogLine[] = [];
  for (const e of events) {
    const text = e.payload?.text ?? e.text ?? "";
    if (!text.trim()) continue;
    lines.push({
      ts: typeof e.created === "number" ? e.created : null,
      level: inferLevel(text, e.type),
      text,
    });
  }
  return lines;
}
```

- [ ] **Step 4: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/fetchers/vercel.ts
git commit -m "feat(b1): add fetchVercelDeployment and fetchVercelDeployLogs"
```

---

### Task 4: Add Netlify single-deploy + logs fetchers

**Files:**
- Modify: `lib/fetchers/netlify.ts`

- [ ] **Step 1: Add `LogLine` import**

Update the import block at the top of `lib/fetchers/netlify.ts` to include `LogLine`:

```ts
import type {
  DeployContext,
  DeploymentData,
  DeployStatus,
  LogLine,
  NetlifyAccountInfo,
  NetlifyBandwidthData,
  NetlifyFormData,
  NetlifyFunctionData,
  ProjectData,
} from "@/types";
```

- [ ] **Step 2: Extract `mapNetlifyDeploy` helper**

The existing `fetchNetlifyDeploys` (around lines 93-112) maps inline. Extract that mapper so the new `fetchNetlifyDeployment` can reuse it. Add this helper just **above** `fetchNetlifyDeploys`:

```ts
function mapNetlifyDeploy(d: NetlifyDeploy): DeploymentData {
  return {
    id: d.id,
    project: d.name ?? "",
    status: mapNetlifyState(d.state),
    branch: d.branch ?? "",
    commitMessage: d.title ?? "",
    duration: d.deploy_time ?? 0,
    createdAt: d.created_at,
    url: d.deploy_url ?? d.ssl_url ?? d.url ?? "",
    provider: "netlify" as const,
    context: mapNetlifyContext(d.context),
  };
}
```

- [ ] **Step 3: Update `fetchNetlifyDeploys` to use the helper**

Replace the body of `fetchNetlifyDeploys`:

```ts
export async function fetchNetlifyDeploys(token: string, limit = 10): Promise<DeploymentData[]> {
  const res = await fetch(`${BASE}/deploys?per_page=${limit}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`netlify deploys ${res.status}`);
  const deploys = (await res.json()) as NetlifyDeploy[];
  return deploys.map(mapNetlifyDeploy);
}
```

- [ ] **Step 4: Add `NetlifyLogResult` type + `fetchNetlifyDeployment` + `fetchNetlifyDeployLog`**

Append at the end of `lib/fetchers/netlify.ts`:

```ts
export async function fetchNetlifyDeployment(token: string, id: string): Promise<DeploymentData> {
  const res = await fetch(`${BASE}/deploys/${encodeURIComponent(id)}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`netlify deploy ${res.status}`);
  const raw = (await res.json()) as NetlifyDeploy;
  return mapNetlifyDeploy(raw);
}

interface NetlifyLogAccessAttributes {
  type?: string;
  url?: string;
}

interface NetlifyDeployWithLogAccess extends NetlifyDeploy {
  log_access_attributes?: NetlifyLogAccessAttributes;
}

export interface NetlifyLogResult {
  lines: LogLine[];
  unavailable?: "logflow" | "missing";
}

function inferNetlifyLevel(text: string): LogLine["level"] {
  if (/error|fail/i.test(text)) return "error";
  if (/warn/i.test(text)) return "warn";
  return "info";
}

export async function fetchNetlifyDeployLog(token: string, id: string): Promise<NetlifyLogResult> {
  const res = await fetch(`${BASE}/deploys/${encodeURIComponent(id)}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`netlify deploy ${res.status}`);
  const raw = (await res.json()) as NetlifyDeployWithLogAccess;
  const attrs = raw.log_access_attributes;
  if (!attrs || !attrs.url) {
    return { lines: [], unavailable: "missing" };
  }
  if (attrs.type && attrs.type !== "old_logs") {
    return { lines: [], unavailable: "logflow" };
  }
  const logRes = await fetch(attrs.url, { cache: "no-store" });
  if (!logRes.ok) throw new Error(`netlify log ${logRes.status}`);
  const text = await logRes.text();
  const lines: LogLine[] = text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      ts: null,
      level: inferNetlifyLevel(line),
      text: line,
    }));
  return { lines };
}
```

- [ ] **Step 5: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
git add lib/fetchers/netlify.ts
git commit -m "feat(b1): add fetchNetlifyDeployment and fetchNetlifyDeployLog"
```

---

### Task 5: `DeployMetaHeader` component

**Files:**
- Create: `components/deploys/DeployMetaHeader.tsx`

- [ ] **Step 1: Create the component file**

Create `components/deploys/DeployMetaHeader.tsx`:

```tsx
import type { DeploymentData } from "@/types";
import { StatusDot } from "@/components/dashboard/StatusDot";
import { formatDuration, timeAgo } from "@/lib/utils";

const CONTEXT_LABEL: Record<string, string> = {
  production: "PROD",
  preview: "PREV",
  branch: "BRANCH",
};

export function DeployMetaHeader({ deploy }: { deploy: DeploymentData }) {
  const contextLabel = deploy.context ? CONTEXT_LABEL[deploy.context] : null;

  return (
    <section className="border border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot status={deploy.status} />
          <span className="truncate text-base font-medium text-fg">
            {deploy.project || "—"}
          </span>
        </div>
        {deploy.url && (
          <a
            href={deploy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono shrink-0 text-[11px] text-muted hover:text-fg"
          >
            Open ↗
          </a>
        )}
      </div>
      <p className="mono mt-1 truncate text-[11px] text-muted">
        {deploy.branch || "—"}
        {deploy.commitMessage && (
          <>
            {" · "}
            <span>{deploy.commitMessage}</span>
          </>
        )}
      </p>
      <p className="mono mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-soft">
        {contextLabel && (
          <>
            {contextLabel}
            {" · "}
          </>
        )}
        {formatDuration(deploy.duration)}
        {" · "}
        {timeAgo(deploy.createdAt)}
      </p>
    </section>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/deploys/DeployMetaHeader.tsx
git commit -m "feat(b1): add DeployMetaHeader component"
```

---

### Task 6: `RefreshButton` component

**Files:**
- Create: `components/deploys/RefreshButton.tsx`

- [ ] **Step 1: Create the component file**

Create `components/deploys/RefreshButton.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/deploys/RefreshButton.tsx
git commit -m "feat(b1): add RefreshButton client component"
```

---

### Task 7: `LogView` component

**Files:**
- Create: `components/deploys/LogView.tsx`

- [ ] **Step 1: Create the component file**

Create `components/deploys/LogView.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/deploys/LogView.tsx
git commit -m "feat(b1): add LogView client component"
```

---

### Task 8: Page route — `/deploys/[provider]/[id]`

**Files:**
- Create: `app/deploys/[provider]/[id]/page.tsx`

This task wires everything together: auth + token decryption + parallel fetch with `Promise.allSettled` + the three render branches (token missing, deploy fetch error, success).

- [ ] **Step 1: Create the page file**

Create `app/deploys/[provider]/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDecryptedTokens } from "@/lib/db";
import type { DeploymentData, LogLine } from "@/types";
import { Header } from "@/components/dashboard/Header";
import { ConnectCTA } from "@/components/dashboard/ConnectCTA";
import { DeployMetaHeader } from "@/components/deploys/DeployMetaHeader";
import { LogView } from "@/components/deploys/LogView";
import { RefreshButton } from "@/components/deploys/RefreshButton";
import {
  fetchVercelDeployment,
  fetchVercelDeployLogs,
} from "@/lib/fetchers/vercel";
import {
  fetchNetlifyDeployment,
  fetchNetlifyDeployLog,
  type NetlifyLogResult,
} from "@/lib/fetchers/netlify";

export const dynamic = "force-dynamic";

type Provider = "vercel" | "netlify";
const PROVIDER_LABEL: Record<Provider, string> = {
  vercel: "Vercel",
  netlify: "Netlify",
};

function isProvider(p: string): p is Provider {
  return p === "vercel" || p === "netlify";
}

interface LogResult {
  lines: LogLine[];
  unavailable?: "logflow" | "missing";
}

async function fetchProviderLogs(provider: Provider, token: string, id: string): Promise<LogResult> {
  if (provider === "vercel") {
    const lines = await fetchVercelDeployLogs(token, id);
    return { lines };
  }
  const result: NetlifyLogResult = await fetchNetlifyDeployLog(token, id);
  return { lines: result.lines, unavailable: result.unavailable };
}

async function fetchProviderDeployment(
  provider: Provider,
  token: string,
  id: string,
): Promise<DeploymentData> {
  if (provider === "vercel") return fetchVercelDeployment(token, id);
  return fetchNetlifyDeployment(token, id);
}

export default async function DeployLogsPage({
  params,
}: {
  params: { provider: string; id: string };
}) {
  if (!isProvider(params.provider)) notFound();
  const provider: Provider = params.provider;

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const tokens = await getDecryptedTokens(session.user.id);
  const token = provider === "vercel" ? tokens.vercel : tokens.netlify;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <Header email={session.user.email} />
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        <Link
          href="/dashboard"
          className="mono text-[11px] uppercase tracking-[0.15em] text-muted hover:text-fg"
        >
          ← Back to dashboard
        </Link>

        {!token ? (
          <ConnectCTA service={PROVIDER_LABEL[provider]} />
        ) : (
          <DeployContent provider={provider} token={token} id={params.id} />
        )}
      </div>
    </main>
  );
}

async function DeployContent({
  provider,
  token,
  id,
}: {
  provider: Provider;
  token: string;
  id: string;
}) {
  const [metaResult, logsResult] = await Promise.allSettled([
    fetchProviderDeployment(provider, token, id),
    fetchProviderLogs(provider, token, id),
  ]);

  if (metaResult.status === "rejected") {
    return (
      <section className="border border-border bg-surface p-4">
        <p className="text-[13px] text-danger">Failed to load deploy details.</p>
        <div className="mt-3">
          <RefreshButton />
        </div>
      </section>
    );
  }

  const deploy = metaResult.value;

  if (logsResult.status === "rejected") {
    return (
      <>
        <DeployMetaHeader deploy={deploy} />
        <LogView lines={[]} status={{ kind: "error" }} />
      </>
    );
  }

  const logs = logsResult.value;

  return (
    <>
      <DeployMetaHeader deploy={deploy} />
      <LogView
        lines={logs.lines}
        status={
          logs.unavailable
            ? { kind: "unavailable", reason: logs.unavailable }
            : undefined
        }
      />
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed. Build output now includes `/deploys/[provider]/[id]` as a dynamic route.

- [ ] **Step 3: Commit**

```bash
git add app/deploys
git commit -m "feat(b1): add /deploys/[provider]/[id] route"
```

---

### Task 9: Loading skeleton

**Files:**
- Create: `app/deploys/[provider]/[id]/loading.tsx`

- [ ] **Step 1: Create the loading file**

Create `app/deploys/[provider]/[id]/loading.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <div className="flex h-14 items-center border-b border-border">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        <Skeleton className="h-4 w-40" />
        <section className="space-y-2 border border-border bg-surface px-4 py-3">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </section>
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
          <div className="space-y-1.5 border border-border bg-surface p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed.

- [ ] **Step 3: Commit**

```bash
git add app/deploys/[provider]/[id]/loading.tsx
git commit -m "feat(b1): add loading skeleton for deploy logs route"
```

---

### Task 10: Make `DeploymentList` rows linkable

**Files:**
- Modify: `components/dashboard/DeploymentList.tsx`

- [ ] **Step 1: Update `DeploymentList.tsx`**

Replace the entire file contents of `components/dashboard/DeploymentList.tsx` with:

```tsx
"use client";

import Link from "next/link";
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
        <li key={d.id}>
          <Link
            href={`/deploys/${d.provider}/${encodeURIComponent(d.id)}`}
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
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Verify typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed. Build still emits the dashboard and deploys routes.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DeploymentList.tsx
git commit -m "feat(b1): make DeploymentList rows link to /deploys/[provider]/[id]"
```

---

### Task 11: Final QA — typecheck, lint, build, manual UI verification

**Files:** none modified.

This is a verification-only task. No commit unless something fails and needs fixing.

- [ ] **Step 1: Run the full quality suite**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all three exit 0. Build output lists `/deploys/[provider]/[id]` as a dynamic route alongside existing routes.

- [ ] **Step 2: Manual UI check (dev server)**

Run: `npm run dev` (in a separate terminal if needed; otherwise just background it).
Open `http://localhost:3000/dashboard`. Click a deployment row in either the Vercel or Netlify card. Verify:
- URL changes to `/deploys/<provider>/<id>`.
- Loading skeleton briefly visible.
- DeployMetaHeader renders with status dot, project, branch, commit message, context badge, duration, time-ago, and the "Open ↗" link.
- LogView renders monospace lines with timestamps (Vercel) or blank ts column (Netlify).
- Copy button copies plain text and briefly says "Copied".
- Refresh button triggers a re-fetch (status text flips to "Refreshing…" momentarily).

- [ ] **Step 3: Manual error-state check**

In the browser:
- Visit `/deploys/foobar/anything` → should 404 (`notFound()`).
- Visit `/deploys/vercel/does-not-exist` → metadata fetch fails → "Failed to load deploy details." with Refresh button.
- For a Netlify deploy whose `log_access_attributes.type !== "old_logs"` (if any exist) → "Live logs unavailable" message.
- For a deploy with no log output (rare) → "No log output for this deploy."

- [ ] **Step 4: Manual no-regression check on dashboard**

Return to `/dashboard`. Confirm:
- DeploymentList rows still render with all the same visual treatment as before.
- Hover state still works (`hover:bg-surface-alt`).
- Filter search still narrows the list.
- No console errors.

- [ ] **Step 5: If everything passes, no commit needed.** If a fix is required, edit the offending file, run the QA suite again, and commit with a descriptive message.

---

## Spec Coverage Self-Check

Mapped against `docs/superpowers/specs/2026-04-30-deploy-logs-viewer-design.md`:

- **Goal / scope (all deploys clickable, dedicated route, server-rendered, static fetch)** → Task 8 page + Task 10 link wrapping.
- **File layout** → Tasks 1–10 each create or modify exactly the files listed in the spec's "File layout" section.
- **`LogLine` shape** → Task 1.
- **Vercel mapping (v13 deployment + v3 events, mapper extracted)** → Tasks 2 + 3.
- **Netlify mapping (v1 deploy + log_access_attributes branching)** → Task 4.
- **`NetlifyLogResult` richer return type** → Task 4.
- **`DeployMetaHeader` (status, project, branch, commit, context, duration, time-ago, Open ↗)** → Task 5.
- **`LogView` (toolbar with copy + refresh, line columns, level dots, color by level, empty state, unavailable states, error state)** → Task 7.
- **`RefreshButton` calling `router.refresh()`** → Task 6.
- **Page route with auth, provider validation, token check, parallel fetch, partial-render on logs failure** → Task 8.
- **Loading skeleton** → Task 9.
- **`DeploymentList` rows wrapped in `<Link>`** → Task 10.
- **Acceptance criteria (typecheck/lint/build clean, no dashboard regression, all error states reachable)** → Task 11.

No gaps.
