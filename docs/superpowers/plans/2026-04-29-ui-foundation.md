# DevPulse UI Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace DevPulse's dark-glass dashboard UI with a cream/cobalt light-theme system per `docs/superpowers/specs/2026-04-29-ui-foundation-design.md`. Establishes the design tokens, primitives, and dashboard layout that all future feature sub-projects (alerting, deploy logs, uptime, cost, ui-controls) build on top of.

**Architecture:** Bottom-up repaint. CSS custom property tokens → Tailwind config → fonts → UI primitives → dashboard atoms → dashboard cards → page composition → landing page → cleanup. Charts go from div-stacks to hand-rolled SVG with axis/gridlines/baseline/legend. SummaryBar is replaced by a thin top FactStrip; NeedsAttention is restructured into a HeroCard that always renders.

**Tech Stack:** Next.js 14 (App Router) · Tailwind CSS · `next/font/google` (Inter + JetBrains Mono) · Hand-rolled SVG charts (no library) · class-variance-authority for variants · clsx + tailwind-merge.

---

## Verification approach

This codebase has **no automated tests** — no `test` script in `package.json`, no test framework installed. Each task verifies via:

1. **`npm run typecheck`** — TypeScript compiles clean
2. **`npm run lint`** — ESLint clean
3. **Visual:** `npm run dev`, navigate to the relevant route, confirm it renders without console errors and matches the design intent

For tasks touching client components (`"use client"`), also confirm no hydration warnings appear in the browser console.

## Class migration reference

Use this mapping for mechanical class swaps in repaint tasks. When a step says "apply token migration," it means: walk the file and replace these.

| Old class / pattern | New class / pattern |
|---|---|
| `glass` | `bg-surface border border-border` |
| `glass-strong` | `bg-surface border border-border-strong shadow-none` |
| `bg-aurora` | `bg-brand` |
| `bg-aurora text-black` | `bg-brand text-white` |
| `text-blue-soft` | `text-brand` |
| `text-blue` | `text-brand` |
| `bg-blue` | `bg-brand` |
| `bg-blue/...` | `bg-brand/...` (preserve opacity) |
| `border-blue/40` | `border-brand/40` |
| `bg-mint` (status-dot ready/healthy) | `bg-success` |
| `bg-amber` | `bg-warning` |
| `bg-emerald` | `bg-success` |
| `text-emerald` | `text-success` |
| `bg-red`, `bg-danger` | `bg-danger` (token value updated, class name unchanged) |
| `text-violet` | `text-brand` |
| `border-violet/...` | `border-brand/...` |
| `focus:ring-violet/20` | `focus:ring-brand/20` |
| `bg-white/[0.02]`, `bg-white/[0.03]`, `bg-white/[0.04]`, `bg-white/[0.06]` | `bg-surface-alt` |
| `bg-white/5` | `bg-surface-alt` |
| `border-border-strong` (kept; token value updated) | `border-border-strong` |
| `rounded-2xl`, `rounded-3xl`, `rounded-xl` (on cards) | `rounded-none` (sharp corners per spec) |
| `rounded-xl` (on inputs, buttons) | `rounded-none` (sharp corners per spec) |
| `rounded-lg`, `rounded-md` (on inner badges/chips) | keep (small radius OK on inline elements) |
| `rounded-full` (status dots, badges) | keep |
| `backdrop-blur-md`, `backdrop-blur-sm` | remove (no glass) |
| `shadow-[0_0_10px_rgba(...)]` (status dot glows) | remove (no glows in light theme) |
| `shadow-[0_8px_30px...]` (button shadow) | remove |
| `text-[10px] uppercase tracking-widest mono` (label) | `text-[10px] uppercase tracking-[0.15em] font-medium` (use sans, not mono — see typography rule) |
| `text-[11px] mono text-muted` (data label) | keep `mono` only when it's a number/timestamp/id; otherwise drop `mono` |

**Typography rule:** the spec says mono is *selective* — only for numbers, timestamps, IDs, hashes, status codes. Plain prose labels like "Build minutes · this month" become **sans** (drop `mono`). Numeric values shown next to them stay **mono**.

## File-by-file notes

- **`StatusDot`:** drop the `glow` shadow entries — no glows in light theme. Pulse stays for "building".
- **`NeedsAttention`:** is renamed/restructured to `HeroCard.tsx`. It always renders (no early return on `issues.length === 0`). When issues exist, the left side shows the most severe one as a headline. When all clear, the left side shows an "all clear" message. The right side is new: deploys-7d KPI + 7-day chart, fed by the same Vercel + Netlify deploys data.
- **`SummaryBar`:** replaced by `FactStrip.tsx` — same data, different shape (thin row of cells with hairline separators, top + bottom rules).
- **`DeployBarChart`:** rewritten to use SVG with axis labels, gridlines, baseline, legend.
- **`UsageBars`:** add tick labels (current/limit displayed prominently above the bar in mono).
- **`ActivityFeed`:** restructured into a table-style row layout with mono timestamps and `--danger-soft` tint on alert rows.
- **`app/page.tsx` (landing):** repaint from glass-dark to cream-light. Drop `aurora-orb`, `grid-lines`, `animate-float`. Hero preview gets the new fact-strip + supporting-cards aesthetic.

---

## Tasks

### Task 1: Rewrite color tokens in `app/globals.css`

**Files:**
- Modify: `app/globals.css` (full rewrite)

- [ ] **Step 1: Replace `app/globals.css` with the new token block**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #fafaf7;
  --surface: #ffffff;
  --surface-alt: #f6f4ec;
  --border: #e6e4dd;
  --border-strong: #cbc8be;
  --rule: #0a0a0a;

  --fg: #0a0a0a;
  --muted: #5a5a55;
  --muted-soft: #8a8a85;

  --brand: #1452cc;
  --brand-soft: #e8eef9;

  --success: #16a34a;
  --warning: #ca8a04;
  --danger: #c2410c;
  --danger-soft: #fef7f2;

  --chart-bar-typical: #cbd5e1;
  --chart-grid: #f0eee7;
}

html,
body {
  background-color: var(--bg);
  color: var(--fg);
  min-height: 100vh;
}

body {
  font-family: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}

.mono {
  font-family: var(--font-jetbrains-mono), ui-monospace, monospace;
}

.tnum {
  font-feature-settings: "tnum";
}

::selection {
  background: rgba(20, 82, 204, 0.18);
  color: var(--fg);
}

::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--border-strong);
}
```

This deletes: `--bg-soft`, dark-theme `--surface*`, `--border*` rgba values, `--blue*`, `--emerald`, `--amber`, `--red`, `--accent`, `--green`, `--yellow`, `.glass`, `.glass-strong`, `.aurora-text`, `@keyframes glowDrift`, `.aurora-orb`, `.grid-lines`, the radial-gradient body background.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. (No app code references the deleted classes yet — they'll error in subsequent tasks until repainted, but the CSS file alone compiles.)

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "style: rewrite color tokens to cream/cobalt light theme"
```

---

### Task 2: Update `tailwind.config.ts`

**Files:**
- Modify: `tailwind.config.ts` (full rewrite)

- [ ] **Step 1: Replace `tailwind.config.ts` with the new config**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-alt": "var(--surface-alt)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        rule: "var(--rule)",
        fg: "var(--fg)",
        muted: "var(--muted)",
        "muted-soft": "var(--muted-soft)",
        brand: "var(--brand)",
        "brand-soft": "var(--brand-soft)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-dot": "pulseDot 1.4s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

This deletes: `darkMode: "class"`, all legacy alias colors (`accent`, `blue`, `blue-soft`, `info`, `violet`, `cyan`, `pink`, `mint`, `emerald`, `sky`, `blue-bright`), `bg-soft`, `surface-strong`, the `float` keyframe + animation, and the `aurora`/`aurora-soft` background images.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. App code still references deleted classes (e.g., `bg-blue`, `text-violet`) but those are class strings — Tailwind will simply not generate them. TypeScript and ESLint won't fail until JSX is broken. We accept this temporarily; subsequent tasks repaint the components.

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "style: simplify Tailwind config to new token set"
```

---

### Task 3: Swap fonts and remove aurora wrapper in `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevPulse",
  description: "A personal dashboard for Vercel, Netlify, and Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="relative overflow-x-hidden">{children}</body>
    </html>
  );
}
```

This removes: DM Sans + Space Mono imports, the `dark` class on `<html>`, the `aurora-orb` wrapper div, the `relative z-10` wrapper.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

```
npm run dev
```

Open `http://localhost:3000` (landing page will look broken — that's expected, it still uses old classes). Confirm: the page background is cream (`#fafaf7`) instead of black, fonts loaded in Inter (check Network tab for inter font request).

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "style: swap to Inter + JetBrains Mono, drop dark wrapper"
```

---

### Task 4: Repaint `Card` primitive

**Files:**
- Modify: `components/ui/card.tsx`

- [ ] **Step 1: Replace `components/ui/card.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative rounded-none border border-border bg-surface text-fg transition-colors",
        "hover:border-border-strong",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-5 pb-3", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-[13px] font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-xs text-muted", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";
```

Changes vs original: `glass` → `border border-border bg-surface`, `rounded-2xl` → `rounded-none`, CardTitle size `text-[15px]` → `text-[13px]`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ui/card.tsx
git commit -m "style: repaint Card to hairline + sharp corners"
```

---

### Task 5: Repaint `Button` primitive

**Files:**
- Modify: `components/ui/button.tsx`

- [ ] **Step 1: Replace `components/ui/button.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 rounded-none text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-brand text-white hover:bg-brand/90",
        outline:
          "border border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-alt",
        ghost:
          "text-fg hover:bg-surface-alt",
        destructive:
          "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3.5 text-xs",
        lg: "h-11 px-7 text-[15px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = "Button";
```

Changes: `rounded-xl` → `rounded-none`, `bg-aurora text-black + shadow` → `bg-brand text-white`, outline now uses surface bg + border, ghost uses surface-alt hover, destructive uses solid danger.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ui/button.tsx
git commit -m "style: repaint Button to solid cobalt + hairline outline"
```

---

### Task 6: Repaint `Badge` primitive

**Files:**
- Modify: `components/ui/badge.tsx`

- [ ] **Step 1: Replace `components/ui/badge.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-fg",
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger-soft text-danger",
        warning: "border-warning/30 bg-warning/10 text-warning",
        info: "border-brand/30 bg-brand-soft text-brand",
        muted: "border-border bg-transparent text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

Changes: drop `backdrop-blur-sm` and `border-border-strong bg-white/5`, drop `violet`/`cyan`/`pink` variants (collapsed into `info` using brand). `info` now uses brand-soft. `danger` uses danger-soft background.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. (Components that pass `variant="violet|cyan|pink"` will fail TypeScript — those are repainted in later tasks. If you see typecheck errors here, they're forward-references; ignore for now and note them; subsequent component tasks will resolve.)

If typecheck DOES fail on usages, do `git stash` of this change, complete the dependent component tasks, then redo this task.

- [ ] **Step 3: Commit**

```bash
git add components/ui/badge.tsx
git commit -m "style: repaint Badge variants to light tokens"
```

---

### Task 7: Repaint `Input` + `Progress` + `Skeleton` + `Separator`

**Files:**
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/progress.tsx`
- Modify: `components/ui/skeleton.tsx`
- Modify: `components/ui/separator.tsx`

- [ ] **Step 1: Replace `components/ui/input.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-none border border-border bg-surface px-4 py-2 text-sm text-fg",
        "placeholder:text-muted-soft",
        "transition-colors focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

- [ ] **Step 2: Replace `components/ui/progress.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  indicatorClassName?: string;
}

export function Progress({ value, className, indicatorClassName, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-border",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          indicatorClassName ?? "bg-brand",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

Note: Existing call sites pass `indicatorClassName="bg-blue"`, `bg-warning`, `bg-danger`. These get migrated to `bg-brand` in their respective component tasks. Keep this Progress component agnostic.

- [ ] **Step 3: Replace `components/ui/skeleton.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-none bg-surface-alt",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Replace `components/ui/separator.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("h-px w-full bg-border", className)} {...props} />;
}
```

(No change to logic — `bg-border` already maps to the new token.)

- [ ] **Step 5: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/ui/input.tsx components/ui/progress.tsx components/ui/skeleton.tsx components/ui/separator.tsx
git commit -m "style: repaint small UI primitives (Input, Progress, Skeleton, Separator)"
```

---

### Task 8: Repaint `Logo`

**Files:**
- Modify: `components/ui/logo.tsx`

- [ ] **Step 1: Replace `components/ui/logo.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

export function Logo({ size = 28, className, withWordmark = false }: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="DevPulse"
      >
        <rect x="2" y="2" width="28" height="28" rx="2" fill="#1452cc" />
        <path
          d="M6 16 L11 16 L13 11 L16 21 L19 13 L21 16 L26 16"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withWordmark && (
        <span className="text-base font-semibold tracking-tight text-fg">DevPulse</span>
      )}
    </div>
  );
}
```

Changes: corner radius `rx="8"` → `rx="2"` (sharper), removed the white stroke overlay (was for dark theme contrast).

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ui/logo.tsx
git commit -m "style: sharpen Logo corners, drop dark-theme stroke"
```

---

### Task 9: Repaint `StatusDot`

**Files:**
- Modify: `components/dashboard/StatusDot.tsx`

- [ ] **Step 1: Replace `components/dashboard/StatusDot.tsx`**

```tsx
import { cn } from "@/lib/utils";
import type { DeployStatus } from "@/types";

const MAP: Record<DeployStatus, { color: string; pulse: boolean; label: string }> = {
  ready: { color: "bg-success", pulse: false, label: "Ready" },
  building: { color: "bg-warning", pulse: true, label: "Building" },
  error: { color: "bg-danger", pulse: false, label: "Error" },
  cancelled: { color: "bg-muted-soft", pulse: false, label: "Cancelled" },
};

export function StatusDot({ status, className }: { status: DeployStatus; className?: string }) {
  const { color, pulse, label } = MAP[status];
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        color,
        pulse && "animate-pulse-dot",
        className,
      )}
      aria-label={label}
      title={label}
    />
  );
}
```

Changes: drop the `glow` shadow strings entirely; `bg-mint` → `bg-success`, `bg-amber` → `bg-warning`, `bg-muted` → `bg-muted-soft`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/StatusDot.tsx
git commit -m "style: repaint StatusDot, drop glow shadows"
```

---

### Task 10: Repaint `Header`

**Files:**
- Modify: `components/dashboard/Header.tsx`

- [ ] **Step 1: Replace `components/dashboard/Header.tsx`**

```tsx
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
      <div className="flex items-center gap-3">
        <Logo size={26} withWordmark />
        <span className="hidden text-xs text-muted sm:inline">· Live dev dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        {email && (
          <span className="hidden items-center gap-2 border border-border bg-surface px-3 py-1 text-xs text-muted mono md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {email}
          </span>
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
```

Changes: drop `glass`, `rounded-2xl`. Sticky now uses `top-0` + bottom border (newspaper-strip style). The email pill becomes a hairline rectangle (no rounding except on the dot).

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/Header.tsx
git commit -m "style: repaint Header to sticky hairline strip"
```

---

### Task 11: Replace `SummaryBar` with `FactStrip`

**Files:**
- Delete: `components/dashboard/SummaryBar.tsx`
- Create: `components/dashboard/FactStrip.tsx`

- [ ] **Step 1: Create `components/dashboard/FactStrip.tsx`**

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

function countErrors24h(deploys: DeploymentData[]): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return deploys.filter(
    (d) => d.status === "error" && new Date(d.createdAt).getTime() >= cutoff,
  ).length;
}

function countLast7Days(deploys: DeploymentData[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return deploys.filter((d) => new Date(d.createdAt).getTime() >= cutoff).length;
}

const NETLIFY_BUILD_LIMIT = 300;

export function FactStrip({ connected }: { connected: ConnectedServices }) {
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

  const failed24h = countErrors24h(allDeploys);
  const deploys7d = countLast7Days(allDeploys);
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
    {
      label: "Deploys 7d",
      value: deploys7d,
    },
    {
      label: "Failed 24h",
      value: failed24h,
      tone: failed24h > 0 ? "danger" : "default",
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

- [ ] **Step 2: Delete `components/dashboard/SummaryBar.tsx`**

```bash
rm components/dashboard/SummaryBar.tsx
```

(The dashboard page import is updated in Task 21.)

- [ ] **Step 3: Verify**

```
npm run typecheck
```

Expected: ONE error in `app/dashboard/page.tsx` referencing the deleted `SummaryBar`. That's expected — Task 21 fixes it. If you see other errors, they're real.

```
npm run lint
```

Expected: lint may also flag unused imports temporarily. Continue.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/FactStrip.tsx components/dashboard/SummaryBar.tsx
git commit -m "refactor(dashboard): replace SummaryBar with thin FactStrip (6 cells, hairlines)"
```

(Note: `git add` of a deleted file: the rm above stages it. If `git status` shows it untracked, do `git rm components/dashboard/SummaryBar.tsx` instead.)

---

### Task 12: Rewrite `DeployBarChart` with axis, gridlines, baseline, legend

**Files:**
- Modify: `components/dashboard/DeployBarChart.tsx` (full rewrite)

- [ ] **Step 1: Replace `components/dashboard/DeployBarChart.tsx`**

```tsx
import type { DeploymentData } from "@/types";

interface Day {
  label: string;
  dayKey: string;
  count: number;
  errors: number;
}

export function DeployBarChart({ deployments }: { deployments: DeploymentData[] }) {
  const days: Day[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
      dayKey: d.toISOString().slice(0, 10),
      count: 0,
      errors: 0,
    });
  }
  for (const dep of deployments) {
    const key = dep.createdAt.slice(0, 10);
    const day = days.find((x) => x.dayKey === key);
    if (!day) continue;
    day.count += 1;
    if (dep.status === "error") day.errors += 1;
  }

  const max = Math.max(1, ...days.map((d) => d.count));
  // niceMax: round up to a clean number for the y-axis
  const niceMax = max <= 4 ? 4 : max <= 8 ? 8 : max <= 12 ? 12 : Math.ceil(max / 5) * 5;
  const halfMax = Math.round(niceMax / 2);
  const peakIdx = days.findIndex((d) => d.count === max && d.count > 0);

  // SVG layout
  const W = 320;
  const H = 120;
  const padL = 22;
  const padR = 6;
  const padT = 8;
  const padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const baselineY = H - padB;
  const barGap = 6;
  const barW = (chartW - barGap * (days.length - 1)) / days.length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Deploys per day, last 7 days"
      >
        {/* gridlines */}
        <line
          x1={padL}
          y1={padT}
          x2={W - padR}
          y2={padT}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={padT + chartH / 2}
          x2={W - padR}
          y2={padT + chartH / 2}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        {/* baseline */}
        <line
          x1={padL}
          y1={baselineY}
          x2={W - padR}
          y2={baselineY}
          stroke="var(--rule)"
          strokeWidth={1}
        />

        {/* y-axis labels */}
        <text
          x={padL - 4}
          y={padT + 3}
          textAnchor="end"
          className="mono"
          fontSize={9}
          fill="var(--muted-soft)"
        >
          {niceMax}
        </text>
        <text
          x={padL - 4}
          y={padT + chartH / 2 + 3}
          textAnchor="end"
          className="mono"
          fontSize={9}
          fill="var(--muted-soft)"
        >
          {halfMax}
        </text>
        <text
          x={padL - 4}
          y={baselineY + 3}
          textAnchor="end"
          className="mono"
          fontSize={9}
          fill="var(--muted-soft)"
        >
          0
        </text>

        {/* bars */}
        {days.map((day, i) => {
          const h = day.count === 0 ? 0 : (day.count / niceMax) * chartH;
          const x = padL + i * (barW + barGap);
          const y = baselineY - h;
          let fill = "var(--chart-bar-typical)";
          if (day.errors > 0) fill = "var(--danger)";
          else if (i === peakIdx && day.count > 0) fill = "var(--brand)";
          return (
            <g key={day.dayKey}>
              {h > 0 && <rect x={x} y={y} width={barW} height={h} fill={fill} />}
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                className="mono"
                fontSize={9}
                fill="var(--muted-soft)"
              >
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-brand" />
          peak day
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

The key change: render via SVG with `padL/padR/padT/padB` margins so axis text fits, gridlines + baseline as `<line>` elements, bars as `<rect>` elements with theme-token colors, x-axis labels under each bar.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/DeployBarChart.tsx
git commit -m "feat(charts): rewrite DeployBarChart with axis, gridlines, baseline, legend"
```

---

### Task 13: Add tick labels to `UsageBars`

**Files:**
- Modify: `components/dashboard/UsageBars.tsx`

- [ ] **Step 1: Replace `components/dashboard/UsageBars.tsx`**

```tsx
"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ConnectedServices, DeploymentData, SupabaseResponse } from "@/types";
import { formatBytes } from "@/lib/utils";

interface NetlifyResponse {
  deploys: DeploymentData[];
  buildMinutes: number;
}

const NETLIFY_BUILD_LIMIT = 300;

function barColor(pct: number): string {
  if (pct >= 90) return "bg-danger";
  if (pct >= 70) return "bg-warning";
  return "bg-brand";
}

export function UsageBars({ connected }: { connected: ConnectedServices }) {
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

  type Row = { label: string; current: string; limit: string; pct: number };
  const rows: Row[] = [];

  if (netlify.data) {
    const pct = (netlify.data.buildMinutes / NETLIFY_BUILD_LIMIT) * 100;
    rows.push({
      label: "Netlify · build minutes",
      current: `${netlify.data.buildMinutes}`,
      limit: `${NETLIFY_BUILD_LIMIT} min`,
      pct,
    });
  }

  if (supabase.data) {
    const withUsage = supabase.data.usage.filter((u) => u.available);
    if (withUsage.length > 0) {
      const totalDb = withUsage.reduce((a, u) => a + (u.dbSizeBytes ?? 0), 0);
      const totalDbLimit = withUsage.reduce(
        (a, u) => a + (u.dbSizeLimitBytes ?? 500 * 1024 * 1024),
        0,
      );
      if (totalDbLimit > 0) {
        rows.push({
          label: "Supabase · db size (all projects)",
          current: formatBytes(totalDb),
          limit: formatBytes(totalDbLimit),
          pct: (totalDb / totalDbLimit) * 100,
        });
      }
      const totalApi = withUsage.reduce((a, u) => a + (u.apiRequests ?? 0), 0);
      const totalApiLimit = withUsage.reduce((a, u) => a + (u.apiRequestsLimit ?? 0), 0);
      if (totalApiLimit > 0) {
        rows.push({
          label: "Supabase · API requests",
          current: totalApi.toLocaleString(),
          limit: totalApiLimit.toLocaleString(),
          pct: (totalApi / totalApiLimit) * 100,
        });
      }
    }
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Usage</CardTitle>
        <span className="text-[11px] text-muted-soft">this month</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-[11px]">
              <span className="text-muted">{row.label}</span>
              <span className="mono tnum text-fg">
                <span className="font-semibold">{row.current}</span>
                <span className="text-muted-soft"> / {row.limit}</span>
              </span>
            </div>
            <Progress value={row.pct} indicatorClassName={barColor(row.pct)} />
            <div className="flex justify-between text-[9px] mono text-muted-soft">
              <span>0</span>
              <span>{Math.round(row.pct)}%</span>
              <span>{row.limit.replace(/^[\d.,]+\s*/, "")}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

Changes: removed the icon container in the header (cleaner). Split `current / limit` into two visually distinct strings. Added a 0/percent/limit tick row beneath the progress bar. `bg-blue` → `bg-brand`. Drop `mono` from label prose, keep on numerals.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/UsageBars.tsx
git commit -m "feat(charts): add tick labels to UsageBars"
```

---

### Task 14: Repaint `VercelCard`

**Files:**
- Modify: `components/dashboard/VercelCard.tsx`

This is a mechanical class migration plus a small structural cleanup of the header logo container.

- [ ] **Step 1: Apply class migration to `components/dashboard/VercelCard.tsx`**

In the file, make these replacements (whole-file find-replace):

| Find | Replace with |
|---|---|
| `bg-white/[0.06]` | `bg-surface-alt` |
| `bg-white/[0.02]` | `bg-surface-alt` |
| `text-blue-soft` | `text-brand` |
| `bg-blue` | `bg-brand` |
| `bg-blue/...` (any opacity) | `bg-brand/...` (same opacity) |
| `border-blue/40` | `border-brand/40` |
| `text-warning` (kept) | `text-warning` |
| `text-danger` (kept) | `text-danger` |
| `rounded-lg` (on the icon container) | `rounded-none` |

Also: the inline icon container `<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-fg">` becomes:

```tsx
<div className="flex h-7 w-7 items-center justify-center border border-border bg-surface-alt text-fg">
```

The `MiniStat` and `UsageRow` helpers below the main component need similar repaint:

```tsx
function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border bg-surface px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.15em] font-medium text-muted-soft">{label}</div>
      <div className="mt-0.5 mono tnum text-sm text-fg">{value}</div>
    </div>
  );
}

function UsageRow({ label, current, pct }: { label: string; current: string; pct: number }) {
  const ind = pct >= 90 ? "bg-danger" : pct >= 70 ? "bg-warning" : "bg-brand";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="mono tnum text-fg">{current}</span>
      </div>
      <Progress value={pct} indicatorClassName={ind} />
    </div>
  );
}
```

Also drop `mono` class from the inline label spans on lines that show "Domains" / "Bandwidth" / etc. labels — those are prose, not numbers. The current numeric values stay `mono`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

Confirm `/dashboard` renders the Vercel card without dark backgrounds. Numbers tabular, labels sans, sharp corners.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/VercelCard.tsx
git commit -m "style: repaint VercelCard to light tokens"
```

---

### Task 15: Repaint `NetlifyCard`

**Files:**
- Modify: `components/dashboard/NetlifyCard.tsx`

- [ ] **Step 1: Apply class migration**

Same find-replace pass as Task 14. In addition, the icon container `<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-fg">` becomes:

```tsx
<div className="flex h-7 w-7 items-center justify-center border border-border bg-surface-alt text-fg">
```

The `Progress` indicator color decisions: `bg-blue` → `bg-brand` (in both the build-minutes and bandwidth blocks).

The forms list `<li className="... hover:bg-white/[0.03]">` becomes `hover:bg-surface-alt`.

For all label spans (e.g., `<span>Build minutes · this month</span>`), drop `mono` if it's there; the numeric values next to them keep `mono` and add `tnum`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

Confirm `/dashboard` renders the Netlify card.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/NetlifyCard.tsx
git commit -m "style: repaint NetlifyCard to light tokens"
```

---

### Task 16: Repaint `SupabaseCard`

**Files:**
- Modify: `components/dashboard/SupabaseCard.tsx`

- [ ] **Step 1: Apply class migration**

Find-replace pass (same as Tasks 14–15). Specifically also:

The per-project container `<div className="space-y-2.5 rounded-xl border border-border bg-white/[0.02] p-3.5 transition-colors hover:border-border-strong">` becomes:

```tsx
<div className="space-y-2.5 border border-border bg-surface p-3.5 transition-colors hover:border-border-strong">
```

The health pills `border-success/25 bg-success/5 text-success` and `border-danger/30 bg-danger/10 text-danger` keep their structure but need to be visible on white. They already work — `bg-success/5` is fine on `bg-surface (#fff)`. Verify visually.

The `Chip` helper becomes:

```tsx
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-surface-alt px-2 py-0.5 text-[10px] mono text-muted">
      {label}
    </span>
  );
}
```

The `Metric` helper: drop `mono` from the label prose, keep `mono tnum` on the value:

```tsx
function Metric({ label, value, pct, hideBar }: { label: string; value: string; pct: number; hideBar?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted">{label}</span>
        <span className="mono tnum text-fg">{value}</span>
      </div>
      {!hideBar && <Progress value={pct} indicatorClassName={progressColor(pct)} />}
    </div>
  );
}
```

`progressColor`: `bg-blue` → `bg-brand`.

The icon container in CardHeader (same pattern as Tasks 14–15): `rounded-lg bg-white/[0.06]` → `border border-border bg-surface-alt`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

Confirm `/dashboard` Supabase card renders properly.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/SupabaseCard.tsx
git commit -m "style: repaint SupabaseCard to light tokens"
```

---

### Task 17: Restructure `NeedsAttention` into `HeroCard`

**Files:**
- Delete: `components/dashboard/NeedsAttention.tsx`
- Create: `components/dashboard/HeroCard.tsx`

The HeroCard always renders. Left side: the most severe issue when issues exist, otherwise an "all clear" message. Right side: deploys/7d KPI + chart.

- [ ] **Step 1: Create `components/dashboard/HeroCard.tsx`**

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
import { DeployBarChart } from "./DeployBarChart";

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
}): Issue[] {
  const issues: Issue[] = [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  const allDeploys = [...(args.vercelDeploys ?? []), ...(args.netlify?.deploys ?? [])];
  const failing = allDeploys.filter(
    (d) => d.status === "error" && new Date(d.createdAt).getTime() >= cutoff,
  );
  if (failing.length > 0) {
    issues.push({
      id: "failing",
      severity: "danger",
      label: `${failing.length} failed deploy${failing.length === 1 ? "" : "s"} in 24h`,
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

function countLast7Days(deploys: DeploymentData[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return deploys.filter((d) => new Date(d.createdAt).getTime() >= cutoff).length;
}

function countLast14To7Days(deploys: DeploymentData[]): number {
  const now = Date.now();
  const cutoffStart = now - 14 * 24 * 60 * 60 * 1000;
  const cutoffEnd = now - 7 * 24 * 60 * 60 * 1000;
  return deploys.filter((d) => {
    const t = new Date(d.createdAt).getTime();
    return t >= cutoffStart && t < cutoffEnd;
  }).length;
}

export function HeroCard({ connected }: { connected: ConnectedServices }) {
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
  });

  const allDeploys: DeploymentData[] = [
    ...(vercelDeploys.data ?? []),
    ...(netlify.data?.deploys ?? []),
  ];
  const deploys7d = countLast7Days(allDeploys);
  const deploysPrev7d = countLast14To7Days(allDeploys);
  const deltaPct =
    deploysPrev7d === 0
      ? null
      : Math.round(((deploys7d - deploysPrev7d) / deploysPrev7d) * 100);

  const topIssue = issues.find((i) => i.severity === "danger") ?? issues[0];

  return (
    <div className="border border-border bg-surface">
      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-8 md:gap-10">
        <div>
          <div
            className={cn(
              "mono text-[9px] uppercase tracking-[0.2em] font-medium",
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
              : `${deploys7d} deploys this week — all systems healthy.`}
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
            Deploys / 7d
          </div>
          <div className="mt-1 mono tnum text-[40px] font-semibold leading-none tracking-tight">
            {deploys7d}
          </div>
          {deltaPct !== null && (
            <div
              className={cn(
                "mt-1 mono tnum text-[11px]",
                deltaPct >= 0 ? "text-brand" : "text-danger",
              )}
            >
              {deltaPct >= 0 ? "+" : ""}
              {deltaPct}% vs previous 7d
            </div>
          )}
          <div className="mt-4">
            <DeployBarChart deployments={allDeploys} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Delete `components/dashboard/NeedsAttention.tsx`**

```bash
rm components/dashboard/NeedsAttention.tsx
```

- [ ] **Step 3: Verify**

```
npm run typecheck
```

Expected: ONE error in `app/dashboard/page.tsx` (uses deleted `NeedsAttention`). Task 21 fixes this.

```
npm run lint
```

Expected: same forward-reference. Continue.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/HeroCard.tsx components/dashboard/NeedsAttention.tsx
git commit -m "refactor(dashboard): replace NeedsAttention with always-rendered HeroCard"
```

---

### Task 18: Restructure `ActivityFeed` to table layout

**Files:**
- Modify: `components/dashboard/ActivityFeed.tsx`

- [ ] **Step 1: Replace `components/dashboard/ActivityFeed.tsx`**

```tsx
"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type { ActivityEvent, ConnectedServices, DeploymentData, NetlifyResponse, SupabaseResponse } from "@/types";
import { cn } from "@/lib/utils";

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

  const sorted = events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight">Recent activity</h3>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-soft">
          last {sorted.length} events
        </span>
      </div>
      <div className="border-t border-rule">
        {sorted.length === 0 ? (
          <p className="py-4 text-sm text-muted">No recent activity.</p>
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

Changes: drop the `Card` wrapper (this is now a top-rule section, not a card). Layout is a 4-column grid (time / message / service / dot). Failed-deploy rows tinted `--danger-soft`. Mono on times + service tags only. The icon container in the header is removed.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. (NetlifyResponse type is imported from `@/types` — confirm it's exported there. If not, declare it locally as before.)

If `NetlifyResponse` is not exported from `@/types`, replace the import line with:

```tsx
import type { ActivityEvent, ConnectedServices, DeploymentData, SupabaseResponse } from "@/types";

interface NetlifyResponse {
  deploys: DeploymentData[];
  buildMinutes: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/ActivityFeed.tsx
git commit -m "refactor(dashboard): convert ActivityFeed to table layout with mono timestamps"
```

---

### Task 19: Repaint `LinkedProjects` + `DeploymentList` + `ConnectCTA`

**Files:**
- Modify: `components/dashboard/LinkedProjects.tsx`
- Modify: `components/dashboard/DeploymentList.tsx`
- Modify: `components/dashboard/ConnectCTA.tsx`

- [ ] **Step 1: Apply class migration to `LinkedProjects.tsx`**

Find-replace pass:
- `bg-white/[0.06]`, `bg-white/[0.04]`, `bg-white/[0.03]`, `bg-white/[0.02]` → `bg-surface-alt`
- `rounded-lg`, `rounded-xl` (on inner containers, not status dots) → `rounded-none`
- `bg-blue/...`, `text-blue` → `bg-brand/...`, `text-brand`
- `border-border-strong` (on dashed border) → keep
- `bg-mint`, `bg-emerald` → `bg-success`
- `bg-amber` → `bg-warning`
- The `Select` helper's `<select>` element: `bg-white/[0.03]` → `bg-surface`, `rounded-xl` → `rounded-none`, `focus:border-blue/60` → `focus:border-brand`, `focus:ring-blue/20` → `focus:ring-brand/20`. Drop `backdrop-blur-md`.
- The icon container `<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-fg">` → `<div className="flex h-7 w-7 items-center justify-center border border-border bg-surface-alt text-fg">`.
- Drop `mono` from prose labels (e.g., the "Frontend project" / "Supabase project" labels).

- [ ] **Step 2: Apply class migration to `DeploymentList.tsx`**

```tsx
import type { DeploymentData } from "@/types";
import { StatusDot } from "./StatusDot";
import { formatDuration, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function DeploymentList({ deployments }: { deployments: DeploymentData[] }) {
  if (!deployments.length) {
    return <p className="text-sm text-muted">No deployments found.</p>;
  }
  return (
    <ul className="divide-y divide-border border-y border-border">
      {deployments.map((d) => (
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
                    "border px-1 py-0 text-[9px] mono uppercase tracking-widest",
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

Key changes: list now has top + bottom border + dividers (no rounding). Hover `bg-white/[0.03]` → `bg-surface-alt`. The `prod` chip gets `border-brand/40 bg-brand-soft text-brand`.

- [ ] **Step 3: Apply class migration to `ConnectCTA.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConnectCTA({ service }: { service: string }) {
  return (
    <div className="flex flex-col items-start gap-3 border border-dashed border-border-strong bg-surface-alt p-4">
      <p className="text-sm text-muted">
        <span className="text-fg">{service}</span> is not connected yet.
      </p>
      <Link href="/onboarding">
        <Button variant="outline" size="sm">
          Connect {service}
        </Button>
      </Link>
    </div>
  );
}
```

(Drop `rounded-xl` and `bg-white/[0.02]` → `bg-surface-alt`.)

- [ ] **Step 4: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/LinkedProjects.tsx components/dashboard/DeploymentList.tsx components/dashboard/ConnectCTA.tsx
git commit -m "style: repaint LinkedProjects, DeploymentList, ConnectCTA"
```

---

### Task 20: Repaint `TokenForm` + `StepIndicator`

**Files:**
- Modify: `components/onboarding/TokenForm.tsx`
- Modify: `components/onboarding/StepIndicator.tsx`

- [ ] **Step 1: Replace `components/onboarding/StepIndicator.tsx`**

```tsx
import { cn } from "@/lib/utils";

interface Props {
  step: number;
  total: number;
  labels: string[];
}

export function StepIndicator({ step, total, labels }: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      {labels.slice(0, total).map((label, idx) => {
        const n = idx + 1;
        const done = n < step;
        const current = n === step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center text-xs mono tnum font-semibold transition-colors",
                done && "bg-brand text-white",
                current && "border border-brand bg-brand-soft text-brand",
                !done && !current && "border border-border bg-surface text-muted-soft",
              )}
            >
              {done ? <Check /> : n}
            </div>
            <span
              className={cn(
                "text-[11px] uppercase tracking-[0.15em] font-medium",
                current ? "text-fg" : "text-muted",
              )}
            >
              {label}
            </span>
            {n < total && (
              <div
                className={cn(
                  "mx-1 h-px flex-1 transition-colors",
                  done ? "bg-brand" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
```

Key changes: drop the gradient connector and aurora glow shadows. Squares are sharp-cornered (no `rounded-full`). Use `bg-brand-soft` for current step background.

- [ ] **Step 2: Apply class migration to `components/onboarding/TokenForm.tsx`**

Replace the help link's `hover:text-violet` with `hover:text-brand`. The error block keeps its tokens (`border-danger/30 bg-danger/10 text-danger` is fine on light theme; alternatively, swap to `bg-danger-soft`):

```tsx
<div className="border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
  {error}
</div>
```

(Drop `rounded-lg`.)

- [ ] **Step 3: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/TokenForm.tsx components/onboarding/StepIndicator.tsx
git commit -m "style: repaint onboarding TokenForm + StepIndicator"
```

---

### Task 21: Compose new dashboard layout in `app/dashboard/page.tsx`

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Replace `app/dashboard/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTokensRow, initSchema } from "@/lib/db";
import type { ConnectedServices } from "@/types";
import { Header } from "@/components/dashboard/Header";
import { FactStrip } from "@/components/dashboard/FactStrip";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { VercelCard } from "@/components/dashboard/VercelCard";
import { NetlifyCard } from "@/components/dashboard/NetlifyCard";
import { SupabaseCard } from "@/components/dashboard/SupabaseCard";
import { LinkedProjects } from "@/components/dashboard/LinkedProjects";
import { UsageBars } from "@/components/dashboard/UsageBars";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <Header email={session.user.email} />
      <FactStrip connected={connected} />
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
    </main>
  );
}
```

Key changes: import `FactStrip` (replaces `SummaryBar`) and `HeroCard` (replaces `NeedsAttention`). The page uses `px-*` (no top/bottom padding on `<main>`) so `Header` and `FactStrip` can hug the top. `HeroCard` always renders. Removed gap on outer `<main>`; use inner wrapper for content gaps.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS. This resolves the forward-references from Tasks 11 and 17.

- [ ] **Step 3: Visual smoke**

```
npm run dev
```

Open `http://localhost:3000/dashboard`. Sign in if needed (use existing test creds). Confirm:
- Cream background
- Header strip with logo + sign out
- Thin fact strip below header (6 cells with hairline separators)
- Hero card with status headline + deploys/7d KPI + 7-day bar chart with axis
- 3-column service cards
- Activity table at bottom with mono timestamps

If anything breaks visually, note the URL of the failing route and the console error.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): compose hero + fact strip + tabular activity layout"
```

---

### Task 22: Repaint `app/login/page.tsx`

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Replace `app/login/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { getTokensRow, initSchema } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    try {
      await initSchema();
      const row = await getTokensRow(session.user.id);
      const hasAny = row?.vercel_token || row?.netlify_token || row?.supabase_token;
      redirect(hasAny ? "/dashboard" : "/onboarding");
    } catch {
      redirect("/onboarding");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-soft transition-colors hover:text-fg"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L3 5L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </Link>
        <div className="flex flex-col items-center gap-7 border border-border bg-surface p-10 text-center">
          <Logo size={56} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to <span className="text-brand">DevPulse</span>
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Sign in to connect Vercel, Netlify, and Supabase in one place.
            </p>
          </div>
          <form
            className="w-full"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" size="lg" className="w-full">
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
          <p className="text-[11px] text-muted-soft mono">
            Tokens you provide later are encrypted at rest and used read-only.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.8 12.23c0-.74-.07-1.45-.2-2.13H12v4.03h5.5c-.24 1.27-.96 2.34-2.04 3.06v2.54h3.3c1.93-1.78 3.04-4.4 3.04-7.5z" fill="#4285F4"/>
      <path d="M12 22c2.75 0 5.05-.91 6.73-2.46l-3.3-2.54c-.91.61-2.07.97-3.43.97-2.64 0-4.88-1.78-5.68-4.18H3v2.62A10 10 0 0 0 12 22z" fill="#34A853"/>
      <path d="M6.32 13.79A6 6 0 0 1 6 12c0-.62.11-1.22.32-1.79V7.59H3A10 10 0 0 0 2 12c0 1.61.38 3.14 1 4.41l3.32-2.62z" fill="#FBBC05"/>
      <path d="M12 5.82c1.49 0 2.83.51 3.89 1.52l2.92-2.92C17.04 2.88 14.74 2 12 2 7.67 2 3.97 4.48 3 7.59l3.32 2.62C7.12 7.6 9.36 5.82 12 5.82z" fill="#EA4335"/>
    </svg>
  );
}
```

Changes: drop `glass-strong rounded-3xl`. Use plain `border border-border bg-surface`. `text-muted` → `text-muted-soft` on tertiary text. `text-blue-soft` → `text-brand`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

Sign out, then visit `/login`. Confirm cream background, hairline modal, single brand accent on "DevPulse" word, sharp corners.

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx
git commit -m "style: repaint login page to light tokens"
```

---

### Task 23: Repaint `app/onboarding/page.tsx`

**Files:**
- Modify: `app/onboarding/page.tsx`

- [ ] **Step 1: Replace `app/onboarding/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { TokenForm } from "@/components/onboarding/TokenForm";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getTokensRow, initSchema } from "@/lib/db";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-6 border border-border bg-surface p-10 text-center">
          <Logo size={48} />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to <span className="text-brand">DevPulse</span>
            </h1>
            <p className="text-sm text-muted">Connect your services after signing in.</p>
          </div>
          <form
            className="w-full"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/onboarding" });
            }}
          >
            <Button type="submit" size="lg" className="w-full">Continue with Google</Button>
          </form>
          <Link href="/" className="text-[11px] text-muted-soft underline decoration-dotted underline-offset-4 hover:text-fg">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  try {
    await initSchema();
    const row = await getTokensRow(session.user.id);
    if (row?.vercel_token && row?.netlify_token && row?.supabase_token) {
      redirect("/dashboard");
    }
  } catch {
    // DB unreachable locally — allow user to continue, tokens just won't save
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo size={28} withWordmark />
          <span className="text-xs text-muted-soft uppercase tracking-[0.15em]">Setup</span>
        </div>
        <TokenForm />
      </div>
    </main>
  );
}
```

Changes: drop `glass-strong rounded-3xl`. `text-blue-soft` → `text-brand`. Drop `mono` from "Setup" caption (it's prose).

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

Visit `/onboarding`. Confirm cream + hairline form, step indicator looks clean.

- [ ] **Step 4: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "style: repaint onboarding page to light tokens"
```

---

### Task 24: Repaint landing page `app/page.tsx`

**Files:**
- Modify: `app/page.tsx` (significant repaint)

This is the largest single file in this plan. Replace it wholesale.

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { NetlifyLogo, SupabaseLogo, VercelLogo } from "@/components/ui/service-logos";

export default async function HomePage() {
  const session = await auth();
  const isAuthed = Boolean(session?.user?.id);

  return (
    <div>
      <MarketingNav isAuthed={isAuthed} />
      <Hero isAuthed={isAuthed} />
      <Features />
      <Services />
      <PrivacyStrip />
      <FooterCTA isAuthed={isAuthed} />
      <Footer />
    </div>
  );
}

function MarketingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center">
          <Logo size={26} withWordmark />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <a href="#features" className="transition-colors hover:text-fg">Features</a>
          <a href="#services" className="transition-colors hover:text-fg">Services</a>
          <a href="#privacy" className="transition-colors hover:text-fg">Privacy</a>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthed ? (
            <Link href="/dashboard">
              <Button size="sm">Open dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center md:pt-28">
        <div className="inline-flex items-center gap-2 border border-border bg-surface px-3 py-1 text-[11px] mono uppercase tracking-[0.15em] text-muted">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          Now live — self-hosted
        </div>
        <h1 className="mt-8 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          All your deploys.<br />
          <span className="text-brand">One pulse.</span>
        </h1>
        <p className="mt-6 max-w-xl text-balance text-base text-muted md:text-lg">
          A single dashboard for Vercel, Netlify, and Supabase. See deploys, usage, and
          status across your stack — without tab-switching.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          {isAuthed ? (
            <Link href="/dashboard">
              <Button size="lg">Open dashboard →</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button size="lg">Get started free →</Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">See features</Button>
              </a>
            </>
          )}
        </div>
        <div className="mt-6 flex items-center gap-6 text-[11px] mono uppercase tracking-[0.15em] text-muted-soft">
          <span>Bring your own tokens</span>
          <span className="h-3 w-px bg-border" />
          <span>Read-only</span>
          <span className="h-3 w-px bg-border" />
          <span>No vendor lock-in</span>
        </div>
        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="mt-12 w-full max-w-4xl">
      <div className="border border-border bg-surface p-4 md:p-6">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          <span className="ml-3 text-[10px] mono uppercase tracking-[0.15em] text-muted-soft">
            devpulse.app / dashboard
          </span>
        </div>
        <div className="grid grid-cols-2 border border-border md:grid-cols-4">
          <PreviewMetric label="Projects" value="18" border />
          <PreviewMetric label="Deploys today" value="12" border />
          <PreviewMetric label="Errors 24h" value="0" border />
          <PreviewMetric label="Services" value="3/3" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <PreviewCard name="Vercel" count="12" logo={<VercelLogo size={12} />} />
          <PreviewCard name="Netlify" count="4" logo={<NetlifyLogo size={12} />} />
          <PreviewCard name="Supabase" count="2" logo={<SupabaseLogo size={12} />} />
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value, border }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`p-3 text-left ${border ? "border-r border-border" : ""}`}>
      <div className="text-[9px] uppercase tracking-[0.15em] font-medium text-muted-soft">{label}</div>
      <div className="mt-1 mono tnum text-2xl font-semibold">{value}</div>
      <div className="text-[10px] mono text-muted-soft">healthy</div>
    </div>
  );
}

function PreviewCard({ name, count, logo }: { name: string; count: string; logo: React.ReactNode }) {
  return (
    <div className="border border-border bg-surface p-3 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-fg">
          {logo}
          <span className="text-sm font-medium">{name}</span>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-1">
        {[28, 36, 20, 44, 32, 48, 40].map((h, i) => (
          <div key={i} className="flex-1 bg-brand" style={{ height: `${h}px` }} />
        ))}
      </div>
      <div className="mt-2 text-[11px] mono text-muted-soft">{count} recent</div>
    </div>
  );
}

function Features() {
  const items = [
    { title: "Unified activity", body: "One feed for every deploy, failure, and paused service — across all your accounts.", icon: <FeatureIcon1 /> },
    { title: "Usage & limits", body: "Track build minutes, DB size, and API calls before you hit a wall. Color-coded thresholds.", icon: <FeatureIcon2 /> },
    { title: "Status at a glance", body: "A six-cell fact strip tells you if anything needs attention — no digging through tabs.", icon: <FeatureIcon3 /> },
  ];
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 flex flex-col items-center text-center">
          <span className="text-[11px] mono uppercase tracking-[0.15em] text-muted">Features</span>
          <h2 className="mt-2 max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Everything you need, nothing you don&apos;t.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
          {items.map((f) => (
            <div key={f.title} className="bg-bg p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center border border-border bg-surface text-fg">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services() {
  const services = [
    { name: "Vercel", blurb: "Deployments, build status, branches.", logo: <VercelLogo size={22} /> },
    { name: "Netlify", blurb: "Deploys & build-minute usage.", logo: <NetlifyLogo size={22} /> },
    { name: "Supabase", blurb: "DB size, connections, API calls.", logo: <SupabaseLogo size={22} /> },
  ];
  return (
    <section id="services" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 flex flex-col items-center text-center">
          <span className="text-[11px] mono uppercase tracking-[0.15em] text-muted">Integrations</span>
          <h2 className="mt-2 max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Works with your indie stack.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Paste a read-only token for each service during setup. More integrations coming soon.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-3">
          {services.map((s) => (
            <div key={s.name} className="bg-bg p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center border border-border bg-surface text-fg">
                {s.logo}
              </div>
              <div className="text-lg font-semibold tracking-tight">{s.name}</div>
              <p className="mt-1.5 text-sm text-muted leading-relaxed">{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PrivacyStrip() {
  const items = [
    { icon: <LockIcon />, title: "Encrypted at rest", body: "Tokens are AES-256 encrypted before they touch the database. The key never leaves your server." },
    { icon: <EyeIcon />, title: "Read-only by design", body: "Scoped tokens with read access only. DevPulse can never deploy, delete, or modify anything in your accounts." },
    { icon: <ServerIcon />, title: "Self-hostable", body: "Open the repo, point it at your Postgres, and run it anywhere. No SaaS lock-in." },
  ];
  return (
    <section id="privacy" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="border border-border bg-surface p-8 md:p-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {items.map((it) => (
              <div key={it.title}>
                <div className="inline-flex h-10 w-10 items-center justify-center border border-border bg-surface-alt text-fg">
                  {it.icon}
                </div>
                <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterCTA({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
          Ready to feel the <span className="text-brand">pulse</span>?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm text-muted md:text-base">
          Takes about 90 seconds to connect your first service.
        </p>
        <div className="mt-8">
          {isAuthed ? (
            <Link href="/dashboard">
              <Button size="lg">Open dashboard →</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg">Get started free →</Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
        <div className="flex items-center gap-3">
          <Logo size={20} withWordmark />
        </div>
        <div className="flex items-center gap-5 text-xs text-muted">
          <a href="#features" className="transition-colors hover:text-fg">Features</a>
          <a href="#services" className="transition-colors hover:text-fg">Services</a>
          <a href="#privacy" className="transition-colors hover:text-fg">Privacy</a>
        </div>
        <div className="text-[11px] mono text-muted-soft">© 2026 DevPulse</div>
      </div>
    </footer>
  );
}

function FeatureIcon1() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 9H5L7 4L11 14L13 9H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function FeatureIcon2() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 15V12M8 15V8M13 15V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function FeatureIcon3() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="9" cy="9" r="2" fill="currentColor"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="8" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M6 8V5.5a3 3 0 1 1 6 0V8" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 9S4 3.5 9 3.5 16.5 9 16.5 9 14 14.5 9 14.5 1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}
function ServerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3" width="13" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="2.5" y="10" width="13" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5" cy="5.5" r="0.7" fill="currentColor"/>
      <circle cx="5" cy="12.5" r="0.7" fill="currentColor"/>
    </svg>
  );
}
```

Major changes:
- Removed `glass`, `glass-strong`, `aurora-orb`, `grid-lines`, `animate-float` — all dark-theme decoration.
- Sections separated by hairline `border-b border-border` instead of large vertical padding alone.
- Feature/Services grids use `gap-px bg-border` trick (Tailwind hairline grid) instead of card-per-item.
- HeroPreview KPIs sit in a single bordered grid (no inner card chrome).
- All `text-blue-soft` → `text-brand`. `bg-blue/60` → `bg-brand`.

- [ ] **Step 2: Verify**

```
npm run typecheck && npm run lint
```

Expected: PASS.

- [ ] **Step 3: Visual smoke**

```
npm run dev
```

Open `http://localhost:3000`. Confirm: cream landing page, hairline borders between sections, hero preview shows the new fact-grid + supporting cards aesthetic. No floating orbs, no grid backdrop.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "style: repaint landing page to cream/cobalt with hairline structure"
```

---

### Task 25: Cleanup — drop unused service-logos prop default and final smoke

**Files:**
- (No mandatory file changes — verification + cleanup task)

- [ ] **Step 1: Search for stale class references**

```bash
grep -rE "(glass|aurora|bg-blue|text-blue-soft|bg-mint|bg-amber|bg-emerald|text-violet|bg-violet|backdrop-blur|grid-lines)" app components 2>/dev/null
```

Expected: empty output. If anything matches, repaint that file (use the class migration map at the top of this plan).

- [ ] **Step 2: Search for stale font references**

```bash
grep -rE "(font-dm-sans|font-space-mono|DM_Sans|Space_Mono)" app components 2>/dev/null
```

Expected: empty output.

- [ ] **Step 3: Run full verification**

```
npm run typecheck && npm run lint && npm run build
```

Expected: all three PASS.

- [ ] **Step 4: Visual smoke — every route**

```
npm run dev
```

Walk every route and confirm cream/cobalt rendering, no dark leaks, no console errors:
- `/` (landing)
- `/login`
- `/onboarding`
- `/dashboard`

For each:
- Page background is cream (`#fafaf7`)
- Text is black-on-cream
- Cards have hairline borders, no shadows, sharp corners
- Headings use Inter, numerals/timestamps use JetBrains Mono
- No `glass` or `aurora-orb` remnants
- Bar chart on `/dashboard` shows axis ticks (12, 6, 0), bars over a black baseline, day letters below, legend underneath

- [ ] **Step 5: Commit (if any cleanup edits made)**

```bash
git status
# if changes:
git add -A
git commit -m "chore: drop final stale token references"
```

---

## Self-review

(Self-review pass against the spec — done after writing the plan above.)

**1. Spec coverage:** Every numbered token in the spec's color table is set in Task 1. Typography: Task 3 (fonts) + utility class `.tnum` in Task 1. Layout 6 sections: Header (T10), FactStrip (T11), HeroCard (T17), supporting cards (T14–16), ActivityFeed (T18), LinkedProjects + UsageBars (T13, T19) — all present in Task 21's composition. Charts anatomy (axis, gridlines, baseline, legend, sparkline color rules) covered in Task 12; UsageBars ticks in T13. All component-mapping rows in spec covered (Card T4, Button T5, Badge T6, Input/Progress/Skeleton/Separator T7, Logo T8, StatusDot T9, Header T10, FactStrip T11, DeployBarChart T12, UsageBars T13, VercelCard T14, NetlifyCard T15, SupabaseCard T16, NeedsAttention→HeroCard T17, ActivityFeed T18, LinkedProjects T19, DeploymentList T19, ConnectCTA T19, TokenForm T20, StepIndicator T20, Dashboard T21, Login T22, Onboarding T23, Landing T24). Iconography note (`lucide-react` available going forward) is documented in the spec — no task added because no current icon needs replacement; lucide adoption happens organically in feature sub-projects.

**2. Placeholder scan:** No "TBD" / "TODO" / "implement later" in the plan. All steps have concrete commands and code.

**3. Type consistency:** `FactStrip` and `HeroCard` use `ConnectedServices`, `DeploymentData`, `DomainData`, `NetlifyResponse`, `NetlifyBandwidthData`, `SupabaseResponse`, `VercelUsageData`, `ActivityEvent` — all exported from `@/types` per existing component imports. The `NetlifyResponse` import in Task 18 is conditionally fallback-defined because the existing `ActivityFeed` defined it locally (the plan handles both cases).

**4. Single plan scope:** This plan is the design-system foundation for one repaint pass. It does not include the feature sub-projects (alerting, deploy logs, uptime, cost, ui-controls). Each of those gets its own brainstorm → spec → plan cycle and builds on the tokens established here.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-29-ui-foundation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
