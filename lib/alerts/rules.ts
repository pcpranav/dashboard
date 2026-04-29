import type {
  DeploymentData,
  DomainData,
  NetlifyBandwidthData,
  NetlifyResponse,
  SupabaseResponse,
  VercelUsageData,
} from "@/types";

export type AlertCategory =
  | "failed_deploys"
  | "expiring_domains"
  | "quota_warning"
  | "supabase_paused"
  | "supabase_unhealthy"
  | "supabase_db_full";

export const ALERT_CATEGORIES: readonly AlertCategory[] = [
  "failed_deploys",
  "expiring_domains",
  "quota_warning",
  "supabase_paused",
  "supabase_unhealthy",
  "supabase_db_full",
] as const;

export const ALERT_CATEGORY_LABELS: Record<AlertCategory, string> = {
  failed_deploys: "Failed deploys (24h)",
  expiring_domains: "Expiring domains",
  quota_warning: "Quota near cap",
  supabase_paused: "Supabase: paused projects",
  supabase_unhealthy: "Supabase: service unhealthy",
  supabase_db_full: "Supabase: DB near cap",
};

export function isAlertCategory(v: unknown): v is AlertCategory {
  return typeof v === "string" && (ALERT_CATEGORIES as readonly string[]).includes(v);
}

export interface Issue {
  id: string;
  severity: "warning" | "danger";
  label: string;
  category: AlertCategory;
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

export function buildIssues(args: {
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
      label: `${failing.length} failed deploy${failing.length === 1 ? "" : "s"} in window`,
      category: "failed_deploys",
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
      category: "expiring_domains",
    });
  }

  if (args.netlify) {
    const pct = (args.netlify.buildMinutes / NETLIFY_BUILD_LIMIT) * 100;
    if (pct >= 90) {
      issues.push({ id: "netlify-build", severity: "danger", label: `Netlify build minutes ${Math.round(pct)}% of limit`, category: "quota_warning" });
    } else if (pct >= 70) {
      issues.push({ id: "netlify-build", severity: "warning", label: `Netlify build minutes ${Math.round(pct)}% of limit`, category: "quota_warning" });
    } else {
      const projected = projectedEndOfMonth(pct);
      if (projected >= 100) {
        issues.push({ id: "netlify-build-proj", severity: "warning", label: `Netlify build mins projected ${Math.round(projected)}% by EOM`, category: "quota_warning" });
      }
    }
  }

  if (args.netlifyBw?.available && args.netlifyBw.included) {
    const pct = ((args.netlifyBw.used ?? 0) / args.netlifyBw.included) * 100;
    if (pct >= 90) issues.push({ id: "netlify-bw", severity: "danger", label: `Netlify bandwidth ${Math.round(pct)}%`, category: "quota_warning" });
    else if (pct >= 70) issues.push({ id: "netlify-bw", severity: "warning", label: `Netlify bandwidth ${Math.round(pct)}%`, category: "quota_warning" });
    else {
      const projected = projectedEndOfMonth(pct);
      if (projected >= 100) issues.push({ id: "netlify-bw-proj", severity: "warning", label: `Netlify bandwidth projected ${Math.round(projected)}% by EOM`, category: "quota_warning" });
    }
  }

  if (args.vercelUsage?.available) {
    const u = args.vercelUsage;
    if (u.bandwidthLimitBytes && u.bandwidthBytes) {
      const pct = (u.bandwidthBytes / u.bandwidthLimitBytes) * 100;
      if (pct >= 90) issues.push({ id: "vercel-bw", severity: "danger", label: `Vercel bandwidth ${Math.round(pct)}%`, category: "quota_warning" });
      else if (pct >= 70) issues.push({ id: "vercel-bw", severity: "warning", label: `Vercel bandwidth ${Math.round(pct)}%`, category: "quota_warning" });
      else {
        const projected = projectedEndOfMonth(pct);
        if (projected >= 100) issues.push({ id: "vercel-bw-proj", severity: "warning", label: `Vercel bandwidth projected ${Math.round(projected)}% by EOM`, category: "quota_warning" });
      }
    }
    if (u.functionInvocationsLimit && u.functionInvocations) {
      const pct = (u.functionInvocations / u.functionInvocationsLimit) * 100;
      if (pct >= 90) issues.push({ id: "vercel-fn", severity: "danger", label: `Vercel invocations ${Math.round(pct)}%`, category: "quota_warning" });
      else if (pct >= 70) issues.push({ id: "vercel-fn", severity: "warning", label: `Vercel invocations ${Math.round(pct)}%`, category: "quota_warning" });
      else {
        const projected = projectedEndOfMonth(pct);
        if (projected >= 100) issues.push({ id: "vercel-fn-proj", severity: "warning", label: `Vercel invocations projected ${Math.round(projected)}% by EOM`, category: "quota_warning" });
      }
    }
  }

  if (args.supabase) {
    const paused = args.supabase.projects.filter((p) => p.status === "paused");
    if (paused.length > 0) {
      issues.push({ id: "supabase-paused", severity: "warning", label: `${paused.length} Supabase project${paused.length === 1 ? "" : "s"} paused`, category: "supabase_paused" });
    }
    for (const h of args.supabase.health) {
      const unhealthy = h.services.filter((s) => !s.healthy);
      if (unhealthy.length > 0) {
        issues.push({
          id: `supabase-health-${h.projectRef}`,
          severity: "danger",
          label: `${unhealthy.length} Supabase service${unhealthy.length === 1 ? "" : "s"} unhealthy`,
          category: "supabase_unhealthy",
        });
      }
    }
    for (const u of args.supabase.usage) {
      if (!u.available || !u.dbSizeBytes || !u.dbSizeLimitBytes) continue;
      const pct = (u.dbSizeBytes / u.dbSizeLimitBytes) * 100;
      if (pct >= 90) issues.push({ id: `supabase-db-${u.projectRef}`, severity: "danger", label: `${u.projectName} DB ${Math.round(pct)}% full`, category: "supabase_db_full" });
      else if (pct >= 70) issues.push({ id: `supabase-db-${u.projectRef}`, severity: "warning", label: `${u.projectName} DB ${Math.round(pct)}% full`, category: "supabase_db_full" });
    }
  }

  return issues;
}
