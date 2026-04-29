# DevPulse — Deploy Logs Viewer (B1)

**Date:** 2026-04-30
**Status:** Design approved, awaiting implementation plan
**Sub-project of:** Task 1 feature audit — bullet **B1 (Deploy logs viewer)**.

## Goal

Let users click any deployment row in `VercelCard` / `NetlifyCard` and see that deploy's build logs inline in DevPulse, without leaving the app to open Vercel or Netlify directly. Both providers normalize to one log line shape and render through one `LogView` component.

## Scope (v1)

- **Providers:** Vercel and Netlify build logs.
- **Trigger:** All deploys (success / building / error / cancelled) are clickable — not just failures.
- **Surface:** Dedicated route `/deploys/[provider]/[id]`. Server-rendered. Shareable URL. Survives refresh.
- **Liveness:** Static fetch on page load. Manual **Refresh** button (calls `router.refresh()`). No polling for in-progress builds in v1.
- **Log content:** Build logs only. Function / runtime logs are out of scope.

## Architecture

### Route + data flow

The page is a server component that calls fetcher functions directly (no client-side SWR). On navigation Next.js runs the server fetch; the page renders pre-hydrated.

```
URL: /deploys/<provider>/<id>
   ↓ server component
   auth() → session.user.id (else redirect /login)
   provider validation (vercel | netlify, else notFound())
   getDecryptedTokens(userId) → { vercel, netlify, ... }
   ↓
   Promise.all([
     fetch<Provider>Deployment(token, id),    // metadata → DeploymentData
     fetch<Provider>DeployLogs(token, id),    // → LogLine[]
   ])
   ↓
   <Header />
   <DeployMetaHeader deploy={meta} />
   <LogView lines={logs} />
```

No new API routes. The page is server-rendered; "Refresh" re-runs the server component via `router.refresh()`.

### File layout

```
app/deploys/[provider]/[id]/
  page.tsx                ← NEW: server component, the route
  loading.tsx             ← NEW: skeleton

components/deploys/
  LogView.tsx             ← NEW: client (copy + line styling), takes LogLine[]
  RefreshButton.tsx       ← NEW: client, calls router.refresh()
  DeployMetaHeader.tsx    ← NEW: server, renders deploy summary strip

components/dashboard/
  DeploymentList.tsx      ← MODIFY: wrap each row in <Link>

lib/fetchers/vercel.ts    ← MODIFY: add fetchVercelDeployment, fetchVercelDeployLogs
lib/fetchers/netlify.ts   ← MODIFY: add fetchNetlifyDeployment, fetchNetlifyDeployLog

types/index.ts            ← MODIFY: add LogLine type
```

### Shared shape

```ts
export interface LogLine {
  ts: number | null;                     // epoch ms (Vercel events have it; Netlify lines don't)
  level: "info" | "warn" | "error";
  text: string;                          // a single line; no trailing newline
}
```

### Vercel mapping

- **Metadata:** `GET https://api.vercel.com/v13/deployments/{id}` → returns the same fields as the v6 list (with extras). Extract a small helper from the existing `fetchVercelDeployments` mapper (`mapVercelDeployment(raw): DeploymentData`) and call it from both the list and single-deploy paths so the mapping stays DRY.
- **Logs:** `GET https://api.vercel.com/v3/deployments/{id}/events` → array of events.
  - Each event: `{ type: string, payload: { text?: string }, created: number, ... }`.
  - Map to `LogLine`:
    - `ts = event.created`
    - `text = event.payload?.text ?? ""`
    - `level`: error if `text` matches `/error|✗|failed/i` OR `event.type === "stderr"`; warn if matches `/warn/i`; else info.
  - Drop events with empty `text` (delimiters, internal markers).

```ts
export async function fetchVercelDeployment(token: string, id: string): Promise<DeploymentData>;
export async function fetchVercelDeployLogs(token: string, id: string): Promise<LogLine[]>;
```

### Netlify mapping

- **Metadata:** `GET https://api.netlify.com/api/v1/deploys/{id}` → returns deploy + `log_access_attributes`.
- **Logs:** depends on `log_access_attributes.type`:
  - `"old_logs"`: GET `log_access_attributes.url` (a pre-signed URL — no auth header needed) → plain text. Split on `\n`, then filter out lines whose `text.trim() === ""`.
  - `"logflow"` or attrs missing: return `{ lines: [], unavailable: "logflow" | "missing" }`. The page surfaces a "Live logs unavailable" note.
- For each line in old_logs path → `LogLine`:
  - `ts = null`
  - `level`: error if matches `/error|fail/i`; warn if matches `/warn/i`; else info.
  - `text` = the raw line.

The Netlify log fetcher returns a richer shape so the page can distinguish "empty log" from "logs not available":

```ts
export async function fetchNetlifyDeployment(token: string, id: string): Promise<DeploymentData>;

export interface NetlifyLogResult {
  lines: LogLine[];
  unavailable?: "logflow" | "missing";
}

export async function fetchNetlifyDeployLog(token: string, id: string): Promise<NetlifyLogResult>;
```

For symmetry the Vercel fetcher returns the simpler shape (always `LogLine[]` — Vercel always exposes events for accessible deployments):

```ts
export async function fetchVercelDeployment(token: string, id: string): Promise<DeploymentData>;
export async function fetchVercelDeployLogs(token: string, id: string): Promise<LogLine[]>;
```

The page normalizes both to a common shape for `LogView`:

```ts
type PageLogState =
  | { kind: "ok"; lines: LogLine[] }
  | { kind: "unavailable"; reason: "logflow" | "missing" }
  | { kind: "error" };
```

## UI

### DeploymentList row (modify)

Wrap the existing row content in `<Link href={\`/deploys/${d.provider}/${d.id}\`}>`. Keep all existing visual treatment (StatusDot, project, branch, context badge, commit message, duration, timeAgo). Add `cursor-pointer`. Existing `hover:bg-surface-alt` covers feedback.

### Page layout

```
┌──────────────────────────────────────────────────────────────┐
│ Header (existing dashboard chrome)                            │
├──────────────────────────────────────────────────────────────┤
│ ← Back to dashboard                                           │
│                                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ●  my-app                                  [Open ↗]      │ │  DeployMetaHeader
│ │    main · "fix login redirect"                           │ │
│ │    PROD · 42s · 14m ago                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                                │
│ BUILD LOGS                                  [Copy] [Refresh]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 14:02:11 ● Running build command...                     │ │  LogView
│ │ 14:02:14 ● Compiling 1247 modules                       │ │
│ │ 14:02:18 ● ./src/app/page.tsx                           │ │
│ │          ⚠ Warning: unused import 'foo'                  │ │
│ │ 14:02:22 ● ✗ Error: Module not found: Can't resolve...  │ │
│ │ 14:02:22 ● Build failed in 11s                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Container: `mx-auto w-full max-w-6xl px-4 md:px-6`, vertical stack with `gap-6 py-6 md:gap-8 md:py-8`.

Back link: small ghost `<Link href="/dashboard">` with the existing mono caption tracking, label `← Back to dashboard`.

### `DeployMetaHeader.tsx`

Server component. Single hairline-bordered strip (`border border-border bg-surface px-4 py-3`). Two rows of content + right-aligned external link:

- Row 1: `<StatusDot status={deploy.status} />` + project name (text-base font-medium) + right-side `<a href={deploy.url} target="_blank" rel="noopener noreferrer">Open ↗</a>` (mono text-[11px] text-muted hover:text-fg).
- Row 2: `mono text-[11px] text-muted` — `branch` + ` · ` + commit message (truncated).
- Row 3: `mono uppercase tracking-[0.15em] text-[10px] text-muted-soft` — context badge (PROD/PREV/BRANCH) + ` · ` + `formatDuration(duration)` + ` · ` + `timeAgo(createdAt)`.

### `LogView.tsx`

Client component (needs clipboard access). Props: `{ lines: LogLine[] }`.

Top toolbar inside the bordered box:
- Left: small mono caption `BUILD LOGS · {lines.length} lines`.
- Right: ghost buttons **Copy** and **Refresh** (Refresh dispatched via the imported `<RefreshButton>`).

Body:
- `<div className="border border-border bg-surface">` outer; `<div className="p-4 mono text-[12px] leading-[1.5]">` inner.
- Each line: 3 columns
  - ts: `text-muted-soft tnum w-[68px] shrink-0` — `HH:MM:SS` if `ts != null`, else blank.
  - level dot: `h-1.5 w-1.5 rounded-full mt-[7px] shrink-0` — color by level (`bg-muted-soft` info, `bg-warning` warn, `bg-danger` error).
  - text: `flex-1 break-words whitespace-pre-wrap` — colored by level (`text-fg` info, `text-warning` warn, `text-danger` error).
- Lines wrap; no horizontal scroll.
- If `lines.length === 0`: render `<p className="p-4 text-[13px] text-muted">No log output for this deploy.</p>`.

Copy behavior: `navigator.clipboard.writeText(lines.map(l => l.text).join("\n"))`. After successful copy, swap the button label to "Copied" for 1500ms then revert.

### `RefreshButton.tsx`

Client component. Single button labeled "Refresh"; on click calls `router.refresh()` from `next/navigation`. Style: ghost mono button matching existing chrome (`border border-border bg-surface px-3 h-8 mono text-[11px] uppercase tracking-[0.15em] hover:bg-surface-alt`).

### Loading skeleton (`loading.tsx`)

Renders DeployMetaHeader-shaped skeleton (~3 stacked `<Skeleton>` rows) + LogView-shaped skeleton (12 line skeletons inside a bordered container). Reuses existing `<Skeleton>` from `components/ui/skeleton.tsx`.

## Error states

| Condition | Behavior |
|---|---|
| No session | `redirect("/login")` (matches dashboard pattern) |
| Invalid `provider` (not vercel/netlify) | `notFound()` → built-in 404 |
| Provider token missing for this user | Render `<DeployMetaHeader>` skeleton + `<ConnectCTA service="Vercel" />` (or Netlify). |
| Deploy fetch returns 404 | Inline `<p>Deploy not found.</p>` + back-to-dashboard link. No log block. |
| Deploy fetch returns 5xx / network error | Inline "Failed to load deploy details." with `<RefreshButton>`. |
| Logs fetch fails but metadata succeeded | Render `<DeployMetaHeader>` normally; in the LogView slot show "Failed to load logs." + Refresh button. Partial render — don't blow up the whole page. |
| Netlify `log_access_attributes.type === "logflow"` or attrs missing | Empty LogView + small note "Live logs unavailable for this deploy. Refresh after build completes, or open in Netlify ↗." |
| Empty `lines` array (build never started or log purged) | "No log output for this deploy." |

Implementation note: the page `page.tsx` should `try/catch` the metadata fetch (renders error state instead of throwing) and the logs fetch separately (so a logs failure doesn't kill the metadata render). Use a small `Result<T>` discriminated union or `Promise.allSettled` to keep both branches independent.

## Acceptance criteria

1. Clicking any row in `VercelCard` or `NetlifyCard`'s `DeploymentList` navigates to `/deploys/{provider}/{id}`.
2. Page renders `DeployMetaHeader` (StatusDot, project, branch, commit, context, duration, time-ago, "Open ↗" link) and `LogView` with parsed lines.
3. Vercel: non-empty `payload.text` events render; delimiter / empty events suppressed; `ts` column shows `HH:MM:SS`.
4. Netlify (old_logs path): pre-signed URL fetched, log split into lines, level inferred via regex, `ts` column blank.
5. **Refresh** button re-fetches via `router.refresh()`; **Copy** button copies the joined plain text to clipboard and shows brief "Copied" feedback.
6. Invalid provider → 404. Missing token → `<ConnectCTA>`. Logs failure renders metadata + inline "Failed to load logs."
7. Empty log array → "No log output for this deploy."
8. Netlify logflow / missing attrs → "Live logs unavailable" note.
9. `npm run typecheck && npm run lint && npm run build` all pass.
10. No regression on dashboard: existing `DeploymentList` rows still render identically; the only diff is rows are now anchor tags.

## Out of scope (track for follow-ups)

- Live polling for in-progress builds (`b1-live-polling`)
- Netlify `logflow` (newer streaming format) support (`b1-netlify-logflow`)
- Runtime / function logs (`b1-runtime-logs`)
- Search within logs (`b1-log-search`)
- Download log as file (`b1-log-download`)
- Deep links from A1 alerts to specific failed-deploy logs (`alerting-deep-links`)
- Pagination / virtualization for huge logs (`b1-log-virtualization`)

## Risks / open questions

- **Netlify `log_access_attributes` shape** — based on Netlify docs and community usage; may need adjustment when first tested against real data. Mitigation: on first failed parse, log the response shape via `console.warn` so we can refine.
- **Vercel events authorization** — `/v3/deployments/{id}/events` may return 403 for team-owned deployments accessed with a personal token. Acceptable v1 limitation; surfaces as the "Failed to load logs." state.
- **Pre-signed URL TTL (Netlify)** — the URL doesn't accept an auth header; if its TTL has expired we'll see 401/403. Mitigated because we always re-fetch deploy metadata (and thus a fresh URL) on each page load.
- **Large logs** — a 10k-line build log is rare but possible. v1 renders all lines unvirtualized; if perf bites we virtualize as a follow-up.
- **Auth on Vercel events endpoint** — confirm Vercel's API does not require team query params for team deployments; may need `?teamId=` for team accounts. Verify during implementation; track as a fix-on-the-fly item.
