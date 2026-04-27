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
  return "bg-blue";
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

  type Row = { label: string; current: string; pct: number };
  const rows: Row[] = [];

  if (netlify.data) {
    const pct = (netlify.data.buildMinutes / NETLIFY_BUILD_LIMIT) * 100;
    rows.push({
      label: "Netlify · build minutes",
      current: `${netlify.data.buildMinutes} / ${NETLIFY_BUILD_LIMIT} min`,
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
          current: `${formatBytes(totalDb)} / ${formatBytes(totalDbLimit)}`,
          pct: (totalDb / totalDbLimit) * 100,
        });
      }
      const totalApi = withUsage.reduce((a, u) => a + (u.apiRequests ?? 0), 0);
      const totalApiLimit = withUsage.reduce((a, u) => a + (u.apiRequestsLimit ?? 0), 0);
      if (totalApiLimit > 0) {
        rows.push({
          label: "Supabase · API requests",
          current: `${totalApi.toLocaleString()} / ${totalApiLimit.toLocaleString()}`,
          pct: (totalApi / totalApiLimit) * 100,
        });
      }
    }
  }

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-fg">
            <UsageIcon />
          </div>
          <CardTitle>Usage</CardTitle>
        </div>
        <span className="text-[11px] text-muted mono">this month</span>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((row) => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] mono text-muted">
              <span>{row.label}</span>
              <span className="text-fg">{row.current}</span>
            </div>
            <Progress value={row.pct} indicatorClassName={barColor(row.pct)} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UsageIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 10V12M6 6V12M10 2V12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
