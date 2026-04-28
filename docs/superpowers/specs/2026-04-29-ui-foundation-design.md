# DevPulse UI Foundation Redesign

**Date:** 2026-04-29
**Status:** Design approved, awaiting implementation plan
**Owner:** Pranav

## Goal

Replace DevPulse's current dark-glass dashboard UI with a distinctive light-theme design system. The current UI was flagged as "vibe coded" — every card weighs the same, single-color palette (blue), mono labels copy-pasted everywhere, charts that read as placeholders.

This spec defines **the design foundation only**. New feature pages (alerting, deploy logs viewer, uptime, cost, etc.) are handled in separate sub-project specs and will be built on top of these tokens.

## Visual Direction

**Cream + cobalt, light theme, hairline structure.** Deliberately not dark — most dev tools are dark, light is the distinguishing move. References: Stripe Dashboard, Notion, Financial Times graphics. Anti-references: Vercel dashboard, glass-morphism templates.

Sharp corners (max 4px radius), no shadows, no gradients (single exception: faint area fill under sparklines).

## Color Tokens

Defined as CSS custom properties in `app/globals.css`. Existing dark tokens are removed.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#fafaf7` | Page background (cream) |
| `--surface` | `#ffffff` | Card backgrounds |
| `--surface-alt` | `#f6f4ec` | Alt rows, hover states |
| `--border` | `#e6e4dd` | Hairline borders everywhere |
| `--border-strong` | `#cbc8be` | Card hover, focused inputs |
| `--rule` | `#0a0a0a` | Section top-rules (newspaper-style heavy line) |
| `--fg` | `#0a0a0a` | Primary text |
| `--muted` | `#5a5a55` | Secondary text |
| `--muted-soft` | `#8a8a85` | Tertiary text, label captions |
| `--brand` | `#1452cc` | Cobalt — primary accent, links, CTAs, chart highlights |
| `--brand-soft` | `#e8eef9` | Sparkline area fills, brand-tinted backgrounds |
| `--success` | `#16a34a` | Healthy / succeeded |
| `--warning` | `#ca8a04` | At-risk quotas, expiring domains |
| `--danger` | `#c2410c` | Failed deploys, critical alerts |
| `--danger-soft` | `#fef7f2` | Alert row backgrounds |
| `--chart-bar-typical` | `#cbd5e1` | Slate — typical-day bars |

Existing dark-mode tokens (`--bg-soft`, `--surface-strong`, `--blue`, `--blue-soft`, `--emerald`, `--amber`, `--red`, the `.glass`/`.glass-strong`/`.aurora-text`/`.grid-lines`/`.aurora-orb` classes, the `bg-aurora` gradient) are removed entirely.

## Typography

Replaces DM Sans + Space Mono.

- **Body + display:** Inter (weights 400, 500, 600). Loaded via `next/font/google`.
- **Accent / data:** JetBrains Mono (weights 400, 500). Loaded via `next/font/google`.
- Tabular numerals globally on numeric content via `font-feature-settings: "tnum"`. Apply via a utility class `.tnum` and on chart text.

**Type scale (used in dashboard):**

| Use | Family | Size | Weight | Letter-spacing |
|---|---|---|---|---|
| KPI display number | Inter | 32–44px | 600 | -1px to -2px |
| Card title | Inter | 13px | 600 | normal |
| Section heading | Inter | 18–26px | 600 | -0.5px to -0.8px |
| Body | Inter | 13px | 400 | normal |
| Label / caption | Inter | 9–10px uppercase | 600 | 1.5px tracking |
| Mono accent (delta, ts, id) | JetBrains Mono | 10–12px | 400–500 | normal |

**Important:** mono accents are *selective* — used for change deltas (`+12.3% wow`), timestamps (`09:14`), commit hashes, status codes (`[ok]`, `[78%]`), API-style labels (`deploys.last_7d`). Body prose stays in Inter. This is the rule that prevents the "mono labels everywhere" anti-pattern from the audit.

## Layout

**Page composition (dashboard):**

1. **Header** — sticky, hairline-bottom border, holds logo + user email + sign-out.
2. **Top fact strip** — thin row spanning page width, between header and hero. Replaces the current `SummaryBar`. Newspaper-spreadsheet aesthetic: top rule (1px black `--rule`), bottom rule (hairline `--border`), 5–6 fact cells separated by vertical hairlines, mono numerals, 9px uppercase muted captions. Cells: Projects, Deploys 7d, Failed 24h, Build min, Domains, Health. (Borrows the editorial-tabular density the user gravitated to without committing to layout 3 wholesale.)
3. **Hero card** — primary attention anchor. Internal grid `1.4fr / 1fr`:
   - Left: alert headline OR contextual primary message + actions
   - Right: separated by left rule, primary KPI (display numeral) + 7-day chart
4. **Supporting cards** — 3-column grid. Equal weight. One per service (Vercel / Netlify / Supabase). Compact: status dot, deploy count, mini sparkline, health indicator.
5. **Activity table** — bottom of page. Newspaper-style: top rule (`--rule`, 1px black), hairline rows, mono timestamps, alert rows tinted `--danger-soft`. Columns: time, event description, service, status dot.
6. **Linked Projects + Usage Bars** — preserved sections, repainted to new tokens.

**Spacing:**
- Page max-width: 1152px (preserve current `max-w-6xl`)
- Page padding: 16px mobile / 24px desktop (preserve current)
- Hero card padding: 28–32px
- Supporting card padding: 14–16px
- Section gaps: 14–22px
- Hairline 1px borders only. No shadows. No `backdrop-blur`.

## Charts

**Hand-rolled SVG. No chart library.** Continuing the current lean approach but raising the polish bar.

**Required chart anatomy:**
- **Axis labels:** mono, 9–10px, `--muted-soft`. Y-axis values right-aligned, x-axis labels centered under bars.
- **Gridlines:** `#f0eee7` 1px horizontal at major ticks (typically 0/mid/max).
- **Baseline:** 1px `--fg` (black) under x-axis. Heavier than gridlines — anchors the chart.
- **Bars:** `--brand` for highlights (peak day, current period), `--chart-bar-typical` for typical days.
- **Sparklines:** 1.5px stroke `--brand`, optional `--brand-soft` area fill below the line.
- **Legend:** small swatch + label below chart, mono caption (e.g., "peak day / typical").
- **No tooltips required for v1** — values readable from chart directly.

**Affected components:** `DeployBarChart`, `UsageBars` (add tick labels), and any sparkline added to supporting cards.

## Components Affected

This is the full repaint scope for the foundation. Specific token mappings:

| File | Change |
|---|---|
| `app/globals.css` | Full token rewrite. Remove `.glass`, `.glass-strong`, `.aurora-text`, `.grid-lines`, `.aurora-orb`, `bg-aurora` keyframes. Add new `:root` token block. Add `.tnum` utility. |
| `tailwind.config.ts` | Replace color palette with new tokens. Add Inter + JetBrains Mono via `next/font` references. Remove `pulse-dot` if unused after repaint (likely keep for "building" state). Drop `glowDrift` / `float` / hero animations (no longer applicable in light theme). |
| `app/layout.tsx` | Swap `next/font` from DM Sans + Space Mono to Inter + JetBrains Mono. |
| `components/ui/card.tsx` | Drop `glass` class. Use `bg-surface border border-border rounded-none` (sharp corners — matches mockups, distinctive). Hover: `border-border-strong`. |
| `components/ui/button.tsx` | Default variant: `bg-brand text-white` (cobalt). Outline: `bg-surface border border-border`. Ghost: transparent + hover `bg-surface-alt`. Drop `bg-aurora`, drop violet focus ring (use brand). |
| `components/ui/badge.tsx` | Repaint variants. Keep mono uppercase tracking. Variants: default (border + transparent), success/warning/danger (use status tokens with `*-soft` backgrounds). |
| `components/ui/input.tsx` | `bg-surface border border-border`. Focus: `border-brand` + `ring-brand/20`. |
| `components/ui/progress.tsx` | `bg-border` track, `bg-brand` fill (warning/danger variants for >70% / >90% — uses `--warning` / `--danger`). |
| `components/ui/skeleton.tsx` | `bg-surface-alt` base. Keep the shimmer keyframe; update gradient colors to play against light surface (white-to-cream sweep instead of white-to-dark). |
| `components/ui/separator.tsx` | `bg-border`. |
| `components/ui/logo.tsx` | Update colors to brand + bg. White stroke removed (replace with hairline border or just brand fill on cream). |
| `components/ui/service-logos.tsx` | Stays — uses `currentColor`, automatically picks up new fg. |
| `components/dashboard/Header.tsx` | Repaint to light. Sticky, hairline bottom border. |
| `components/dashboard/SummaryBar.tsx` | Renamed (or replaced by) `FactStrip`. Renders the top fact strip described in the Layout section — 5–6 cells, hairline-separated, mono numerals, top rule + bottom rule. Removes the heavy 4-cell rounded-card grid currently in use. |
| `components/dashboard/VercelCard.tsx`, `NetlifyCard.tsx`, `SupabaseCard.tsx` | Become "supporting cards" in new layout. Reduced internal density (the heavy detail moves to per-service drilldown pages, out of scope for this spec). v1 keeps current detail but in new visual language. |
| `components/dashboard/DeployBarChart.tsx` | Add axis labels, gridlines, baseline, legend per chart anatomy above. |
| `components/dashboard/UsageBars.tsx` | Add tick labels (current / limit shown above bar with mono numerals). |
| `components/dashboard/NeedsAttention.tsx` | Becomes hero card content when alerts present. Newspaper-style headline treatment. |
| `components/dashboard/ActivityFeed.tsx` | Reformat to tabular layout (per "Activity table" above). Mono timestamps, alert rows tinted. |
| `components/dashboard/StatusDot.tsx` | Update colors to status tokens. Pulse animation kept for "building" status. |
| `components/dashboard/LinkedProjects.tsx`, `DeploymentList.tsx`, `ConnectCTA.tsx` | Repaint. |
| `app/page.tsx` (landing) | Repaint to match. The `.aurora-orb` background and dark hero come out. New: cream page with hairline cards. |
| `app/login/page.tsx`, `app/onboarding/page.tsx` | Repaint. Login keeps its "more breathing room" treatment as the one moment of emphasis, but in new tokens. |

## Iconography

- **Custom SVGs preserved:** `Logo`, `service-logos`, the inline arrow/check/etc. in onboarding. They use `currentColor` and pick up the new foreground automatically.
- **Adopt `lucide-react`** (already in `package.json`, never imported) for utility icons going forward — settings gears, search, filter, chevrons, alert triangles. Stroke width 1.5, size 14–18px to match the type scale.

## Motion & Interaction

Minimal, deliberate.

- `transition-colors` on hoverable cards (border + background).
- `active:scale-[0.98]` on buttons.
- Pulse on `StatusDot` when status is "building" — kept from current.
- All other current motion (`glowDrift`, `float`, hero parallax) is **removed** — it belonged to the dark theme.

## Out of Scope

These are explicitly **not** part of this design and will be specced separately:

- Alerting / notifications system (sub-project: alerting)
- Deploy logs viewer page (sub-project: deploy-logs)
- Uptime monitoring (sub-project: uptime)
- Cost / billing surfacing (sub-project: cost)
- Time range picker + global search/filter (sub-project: ui-controls)
- Per-service drilldown pages (not yet specced)

The tokens, type system, layout patterns, and chart anatomy defined here are **the source of truth** for those sub-projects.

## Acceptance Criteria

The redesign is complete when:

1. The dashboard renders in cream/cobalt with no remaining glass / dark / aurora visuals.
2. All existing dashboard data is visible and correctly formatted in new tokens.
3. `DeployBarChart` and `UsageBars` have axis labels, gridlines, baseline, legend.
4. Inter + JetBrains Mono load via `next/font/google`. DM Sans and Space Mono are removed from the app and `package.json` (if any explicit references).
5. `npm run typecheck` and `npm run lint` pass.
6. Visual smoke: dashboard, login, onboarding, landing all use the new tokens with no visual regressions vs the current information density.

## Mockup References

Brainstorming session mockups (committed to `.superpowers/brainstorm/41072-1777406587/content/`):

- `direction.html` — DNA selection (4 directions, picked C)
- `layout.html` — layout philosophy (3 options, picked 2)
- `typography.html` — type system (3 options, picked C)
- `charts.html` — chart treatment (3 options, picked A)

These are the ground truth for what the final visual character should resemble.
