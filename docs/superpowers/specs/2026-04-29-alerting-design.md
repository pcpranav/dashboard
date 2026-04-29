# DevPulse — Alerting (A1)

**Date:** 2026-04-29
**Status:** Design approved, awaiting implementation plan
**Sub-project of:** Task 1 feature audit — bullet **A1 (Alerting / notifications)**.

## Goal

Turn the existing `NeedsAttention` rules (already evaluated in `HeroCard` on every dashboard load) into actual outbound notifications. A Vercel cron job runs every 15 minutes, evaluates the same rules against every user with alerting configured, and posts new + resolved issues to their Slack webhook.

## Scope (v1)

- **Channels:** Slack incoming webhook only. Email and browser push are deferred to follow-up sub-projects.
- **Trigger:** Polling cron, 15-minute cadence.
- **Categories:** Predefined opt-in set matching the existing `buildIssues` rules. No custom rules in v1.
- **Dedupe:** Per `(user_id, issue_id, severity)` — prevents repeat alerts for the same active issue. When an issue clears, send a resolution alert and reset state.

## Architecture

### Issue rule extraction

`buildIssues()` currently lives inside `components/dashboard/HeroCard.tsx` and is hard-coded to take SWR data shapes. Move it to a pure function in `lib/alerts/rules.ts` that takes the same inputs and returns `Issue[]`. HeroCard imports from the new location; the cron job calls it with data fetched server-side.

The `Issue` interface stays as defined in HeroCard (`{ id, severity: "warning" | "danger", label }`). Adding one optional field for routing:

```ts
export interface Issue {
  id: string;
  severity: "warning" | "danger";
  label: string;
  category: AlertCategory; // NEW
}

export type AlertCategory =
  | "failed_deploys"
  | "expiring_domains"
  | "quota_warning"
  | "supabase_paused"
  | "supabase_unhealthy"
  | "supabase_db_full";
```

The cron filters by the user's `enabled_categories` before sending.

### Channels

`lib/alerts/channels/slack.ts` exports:

```ts
interface SlackAlertPayload {
  newIssues: Issue[];
  resolvedIssues: Issue[];
  isTest?: boolean;
}

export async function sendSlackAlert(webhookUrl: string, payload: SlackAlertPayload): Promise<void>;
```

The function POSTs a Slack `blocks`-format JSON message. Failures throw — caller logs and continues to next user.

### Cron evaluator

`lib/alerts/check.ts` exports:

```ts
export async function evaluateAndDispatch(): Promise<{
  usersChecked: number;
  alertsSent: number;
  errors: number;
}>;
```

Algorithm:
1. SELECT all users with `slack_webhook_url IS NOT NULL` from `user_alert_prefs`.
2. For each user (sequentially — keep memory small, rate-limit-friendly):
   a. Decrypt their tokens.
   b. Fetch all data needed by `buildIssues` (Vercel deploys/domains/usage, Netlify deploys/bw, Supabase health/usage). Best-effort — if a fetch fails, log and continue with what we have.
   c. Compute `currentIssues` via `buildIssues()`.
   d. Filter `currentIssues` to the user's `enabled_categories`.
   e. SELECT `sent_alerts WHERE user_id = ?` to get prior state.
   f. Compute `newIssues = currentIssues - priorActiveIssues` and `resolvedIssues = priorActiveIssues - currentIssues`.
   g. If either is non-empty, decrypt the Slack URL and `sendSlackAlert`.
   h. If send succeeded: INSERT new rows for `newIssues` (severity = the issue's severity), DELETE rows for `resolvedIssues`, INSERT a `(severity = "resolved")` row for each resolved (so we don't re-resolve a resolved issue).
   i. If send failed: log, continue. Don't update state — we'll retry on the next cron tick.
3. Return summary stats.

### Cron route

`app/api/cron/check-alerts/route.ts`:

```ts
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Forbidden", { status: 403 });
  }
  const result = await evaluateAndDispatch();
  return Response.json(result);
}
```

`vercel.json` declares the cron:

```json
{
  "crons": [
    { "path": "/api/cron/check-alerts", "schedule": "*/15 * * * *" }
  ]
}
```

### Settings API routes

- `GET /api/settings/alerts` — returns `{ slackConfigured: boolean, enabledCategories: AlertCategory[] }`. Never returns the webhook URL.
- `POST /api/settings/alerts` — body `{ slackWebhookUrl?: string | null, enabledCategories: AlertCategory[] }`. If `slackWebhookUrl` is `null`, deletes it. If a non-null string, encrypts and stores. Validates URL starts with `https://hooks.slack.com/`.
- `POST /api/settings/alerts/test` — sends a test message to the user's stored webhook. Body: `{}`. Returns `{ ok: true }` or 4xx with error.
- `DELETE /api/settings/alerts` — wipes prefs row.

All authenticated via `auth()`. Authorization is implicit (operates on session.user.id).

### Settings UI

New routes:
- `app/settings/layout.tsx` — auth guard, applies dashboard chrome (same Header).
- `app/settings/alerts/page.tsx` — server component, loads prefs from DB, renders `<AlertPrefsForm>`.
- `components/settings/AlertPrefsForm.tsx` — client component, controlled form.

Form layout (cream/cobalt, hairlines, matches design system):

```
┌─────────────────────────────────────────────┐
│ Settings · Alerts                       [×] │
├─────────────────────────────────────────────┤
│                                              │
│ SLACK WEBHOOK URL                            │
│ ┌────────────────────────────────────────┐  │
│ │ https://hooks.slack.com/services/T0... │  │
│ └────────────────────────────────────────┘  │
│ How to create one →                          │
│                                              │
│ [Send test alert]    [Save webhook URL]      │
│                                              │
├─────────────────────────────────────────────┤
│ CATEGORIES                                   │
│                                              │
│ ☑ Failed deploys (24h)                       │
│ ☑ Expiring domains                           │
│ ☑ Quota near cap                             │
│ ☑ Supabase: paused projects                  │
│ ☑ Supabase: service unhealthy                │
│ ☑ Supabase: DB near cap                      │
│                                              │
│ [Save categories]                            │
└─────────────────────────────────────────────┘
```

Header link: add a small `Alerts` ghost button next to the email pill, linking to `/settings/alerts`.

### DB migration

Both new tables go into `initSchema` so they auto-create on first request after deploy:

```sql
CREATE TABLE IF NOT EXISTS user_alert_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  slack_webhook_url TEXT,                   -- encrypted same as tokens
  enabled_categories TEXT NOT NULL DEFAULT '["failed_deploys","expiring_domains","quota_warning","supabase_paused","supabase_unhealthy","supabase_db_full"]',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sent_alerts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, issue_id, severity)
);

CREATE INDEX IF NOT EXISTS idx_sent_alerts_user_issue ON sent_alerts (user_id, issue_id);
```

New `lib/db.ts` helpers:

```ts
export async function getAlertPrefs(userId: string): Promise<{
  slackConfigured: boolean;
  enabledCategories: AlertCategory[];
} | null>;

export async function getSlackWebhookUrl(userId: string): Promise<string | null>; // returns decrypted

export async function saveAlertPrefs(userId: string, prefs: {
  slackWebhookUrl?: string | null;
  enabledCategories?: AlertCategory[];
}): Promise<void>;

export async function listUsersWithAlerting(): Promise<Array<{ userId: string; enabledCategories: AlertCategory[] }>>;

export async function getActiveAlerts(userId: string): Promise<Array<{ issueId: string; severity: string }>>;

export async function recordAlertSent(userId: string, issueId: string, severity: string): Promise<void>;

export async function clearAlertResolved(userId: string, issueId: string): Promise<void>;
```

## Acceptance criteria

1. Visiting `/settings/alerts` (authenticated) renders the form with current prefs (empty initially: no webhook, all categories enabled by default).
2. Pasting a valid Slack webhook URL and clicking "Save webhook URL" persists it (encrypted) and reloads the page showing "✓ Configured".
3. Clicking "Send test alert" with a configured URL POSTs a small test message to Slack ("DevPulse test alert · all systems healthy"). Returns success/failure feedback inline.
4. Toggling categories and clicking "Save categories" persists the array.
5. Cron route `/api/cron/check-alerts` returns 403 without the right `Authorization` header.
6. With the right header, the cron evaluates all users' issues and POSTs to their Slack webhooks. Returns summary JSON.
7. Subsequent runs don't re-alert on the same active issue (dedupe via `sent_alerts`).
8. When an issue clears, the next run sends a resolution message and clears the `sent_alerts` row.
9. `npm run typecheck && npm run lint && npm run build` all pass.
10. The dashboard's HeroCard still renders correctly after `buildIssues` extraction (no behavior change).

## Out of scope (track for follow-ups)

- Email channel (`alerting-email`)
- Custom rule definitions (`alerting-custom-rules`)
- Snooze / mute (`alerting-snooze`)
- Per-project / per-environment granularity (`alerting-granular`)
- Alert history dashboard view (`alerting-history`)
- Browser push notifications (`alerting-push`)
- Multi-channel routing (`alerting-multi-channel`)
- The audit's I2 (rate limiting on /api endpoints) — flagged as a separate cleanup task.

## Risks / open questions

- **Scale:** With N users × 6 third-party API calls × every 15 min, third-party rate-limits will eventually bite. Acceptable for personal-use single-digit users; flag for re-architecting if user count grows.
- **Cron timeout:** Vercel cron functions have a 60s default timeout. If users-with-alerts × per-user-fetch-time exceeds 60s, the cron will partial-fail. v1 assumes a tiny user base; mitigations (parallelization, sharding by user_id mod N) deferred.
- **Slack webhook revocation:** if a user revokes the webhook, our POST will return 4xx. v1 logs and skips; v2 could surface "webhook broken" on the settings page.
- **Encryption key rotation** — webhook URL is encrypted with the same `ENCRYPTION_KEY` as service tokens. If the key rotates, all stored webhooks become unreadable. Same risk as for tokens, not new.
