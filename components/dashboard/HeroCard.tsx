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
import { buildIssues } from "@/lib/alerts/rules";

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
