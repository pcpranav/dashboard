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

export function NeedsAttention({ connected }: { connected: ConnectedServices }) {
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

  const issues: Issue[] = [];
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;

  // Failing deploys in last 24h
  const allDeploys = [
    ...(vercelDeploys.data ?? []),
    ...(netlify.data?.deploys ?? []),
  ];
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

  // Expiring Vercel domains (≤30d)
  const expiring = (vercelDomains.data ?? []).filter((d) => {
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

  // Netlify build minutes near cap
  if (netlify.data) {
    const pct = (netlify.data.buildMinutes / NETLIFY_BUILD_LIMIT) * 100;
    if (pct >= 90) {
      issues.push({
        id: "netlify-build",
        severity: "danger",
        label: `Netlify build minutes ${Math.round(pct)}% of limit`,
      });
    } else if (pct >= 70) {
      issues.push({
        id: "netlify-build",
        severity: "warning",
        label: `Netlify build minutes ${Math.round(pct)}% of limit`,
      });
    } else {
      const projected = projectedEndOfMonth(pct);
      if (projected >= 100) {
        issues.push({
          id: "netlify-build-proj",
          severity: "warning",
          label: `Netlify build mins projected ${Math.round(projected)}% by EOM`,
        });
      }
    }
  }

  // Netlify bandwidth near cap
  if (netlifyBw.data?.available && netlifyBw.data.included) {
    const pct = ((netlifyBw.data.used ?? 0) / netlifyBw.data.included) * 100;
    if (pct >= 90) issues.push({ id: "netlify-bw", severity: "danger", label: `Netlify bandwidth ${Math.round(pct)}%` });
    else if (pct >= 70) issues.push({ id: "netlify-bw", severity: "warning", label: `Netlify bandwidth ${Math.round(pct)}%` });
    else {
      const projected = projectedEndOfMonth(pct);
      if (projected >= 100) {
        issues.push({ id: "netlify-bw-proj", severity: "warning", label: `Netlify bandwidth projected ${Math.round(projected)}% by EOM` });
      }
    }
  }

  // Vercel usage near cap
  if (vercelUsage.data?.available) {
    const u = vercelUsage.data;
    if (u.bandwidthLimitBytes && u.bandwidthBytes) {
      const pct = (u.bandwidthBytes / u.bandwidthLimitBytes) * 100;
      if (pct >= 90) issues.push({ id: "vercel-bw", severity: "danger", label: `Vercel bandwidth ${Math.round(pct)}%` });
      else if (pct >= 70) issues.push({ id: "vercel-bw", severity: "warning", label: `Vercel bandwidth ${Math.round(pct)}%` });
      else {
        const projected = projectedEndOfMonth(pct);
        if (projected >= 100) {
          issues.push({ id: "vercel-bw-proj", severity: "warning", label: `Vercel bandwidth projected ${Math.round(projected)}% by EOM` });
        }
      }
    }
    if (u.functionInvocationsLimit && u.functionInvocations) {
      const pct = (u.functionInvocations / u.functionInvocationsLimit) * 100;
      if (pct >= 90) issues.push({ id: "vercel-fn", severity: "danger", label: `Vercel invocations ${Math.round(pct)}%` });
      else if (pct >= 70) issues.push({ id: "vercel-fn", severity: "warning", label: `Vercel invocations ${Math.round(pct)}%` });
      else {
        const projected = projectedEndOfMonth(pct);
        if (projected >= 100) {
          issues.push({ id: "vercel-fn-proj", severity: "warning", label: `Vercel invocations projected ${Math.round(projected)}% by EOM` });
        }
      }
    }
  }

  // Supabase: paused + unhealthy services + db size near cap
  if (supabase.data) {
    const paused = supabase.data.projects.filter((p) => p.status === "paused");
    if (paused.length > 0) {
      issues.push({
        id: "supabase-paused",
        severity: "warning",
        label: `${paused.length} Supabase project${paused.length === 1 ? "" : "s"} paused`,
      });
    }
    for (const h of supabase.data.health) {
      const unhealthy = h.services.filter((s) => !s.healthy);
      if (unhealthy.length > 0) {
        issues.push({
          id: `supabase-health-${h.projectRef}`,
          severity: "danger",
          label: `${unhealthy.length} Supabase service${unhealthy.length === 1 ? "" : "s"} unhealthy`,
        });
      }
    }
    for (const u of supabase.data.usage) {
      if (!u.available || !u.dbSizeBytes || !u.dbSizeLimitBytes) continue;
      const pct = (u.dbSizeBytes / u.dbSizeLimitBytes) * 100;
      if (pct >= 90) {
        issues.push({
          id: `supabase-db-${u.projectRef}`,
          severity: "danger",
          label: `${u.projectName} DB ${Math.round(pct)}% full`,
        });
      } else if (pct >= 70) {
        issues.push({
          id: `supabase-db-${u.projectRef}`,
          severity: "warning",
          label: `${u.projectName} DB ${Math.round(pct)}% full`,
        });
      }
      if (u.apiRequests && u.apiRequestsLimit) {
        const apiPct = (u.apiRequests / u.apiRequestsLimit) * 100;
        if (apiPct >= 90) {
          issues.push({ id: `supabase-api-${u.projectRef}`, severity: "danger", label: `${u.projectName} API requests ${Math.round(apiPct)}%` });
        } else if (apiPct >= 70) {
          issues.push({ id: `supabase-api-${u.projectRef}`, severity: "warning", label: `${u.projectName} API requests ${Math.round(apiPct)}%` });
        } else {
          const projected = projectedEndOfMonth(apiPct);
          if (projected >= 100) {
            issues.push({ id: `supabase-api-proj-${u.projectRef}`, severity: "warning", label: `${u.projectName} API projected ${Math.round(projected)}% by EOM` });
          }
        }
      }
    }
  }

  if (issues.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-warning/15 text-warning">
          <AlertIcon />
        </div>
        <span className="text-[11px] mono uppercase tracking-widest text-muted">
          Needs attention
        </span>
        <span className="ml-auto text-[11px] mono text-muted">{issues.length}</span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {issues.map((i) => (
          <li
            key={i.id}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              i.severity === "danger"
                ? "border-danger/30 bg-danger/10 text-danger"
                : "border-warning/30 bg-warning/10 text-warning",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i.severity === "danger" ? "bg-danger" : "bg-warning",
              )}
            />
            {i.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlertIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 2V7M6 9V9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}
