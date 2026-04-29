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
