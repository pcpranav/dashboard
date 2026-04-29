"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type { DeploymentData, DomainData, VercelTeam, VercelUsageData } from "@/types";
import { DeploymentList } from "./DeploymentList";
import { DeployBarChart } from "./DeployBarChart";
import { ConnectCTA } from "./ConnectCTA";
import { formatBytes } from "@/lib/utils";

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function buildDurationStats(deploys: DeploymentData[]): { avg: number; p95: number } | null {
  const durations = deploys
    .filter((d) => d.status === "ready" && d.duration > 0)
    .map((d) => d.duration)
    .sort((a, b) => a - b);
  if (durations.length === 0) return null;
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const p95 = durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))];
  return { avg, p95 };
}

export function VercelCard({ connected }: { connected: boolean }) {
  const deploys = useSWR<DeploymentData[]>(
    connected ? "/api/vercel/deployments" : null,
    fetcher,
    SWR_CONFIG,
  );
  const domains = useSWR<DomainData[]>(
    connected ? "/api/vercel/domains" : null,
    fetcher,
    SWR_CONFIG,
  );
  const usage = useSWR<VercelUsageData>(
    connected ? "/api/vercel/usage" : null,
    fetcher,
    SWR_CONFIG,
  );
  const teams = useSWR<VercelTeam[]>(
    connected ? "/api/vercel/teams" : null,
    fetcher,
    SWR_CONFIG,
  );

  const stats = deploys.data ? buildDurationStats(deploys.data) : null;
  const expiring = (domains.data ?? []).filter((d) => {
    const dd = daysUntil(d.expiresAt);
    return dd !== null && dd <= 30 && dd >= 0;
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center border border-border bg-surface-alt text-fg">
            <VercelLogo />
          </div>
          <CardTitle>Vercel</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          {teams.data && teams.data.length > 0 && (
            <Badge variant="muted">{teams.data.length} team{teams.data.length === 1 ? "" : "s"}</Badge>
          )}
          {deploys.data && <Badge variant="muted">{deploys.data.length} recent</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected && <ConnectCTA service="Vercel" />}
        {connected && deploys.isLoading && (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {connected && deploys.error && <p className="text-sm text-danger">Failed to load deployments.</p>}
        {connected && deploys.data && (
          <>
            <DeploymentList deployments={deploys.data} />
            <DeployBarChart deployments={deploys.data} />

            {stats && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <MiniStat label="Avg build" value={`${stats.avg}s`} />
                <MiniStat label="p95 build" value={`${stats.p95}s`} />
              </div>
            )}

            {domains.data && domains.data.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>Domains</span>
                  <span className="text-fg">
                    {domains.data.length} total
                    {expiring.length > 0 && (
                      <span className="ml-2 text-warning">· {expiring.length} expiring ≤30d</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {usage.data?.available && (
              <div className="space-y-2 pt-1">
                {usage.data.bandwidthLimitBytes && (
                  <UsageRow
                    label="Bandwidth"
                    current={`${formatBytes(usage.data.bandwidthBytes)} / ${formatBytes(usage.data.bandwidthLimitBytes)}`}
                    pct={
                      ((usage.data.bandwidthBytes ?? 0) / usage.data.bandwidthLimitBytes) * 100
                    }
                  />
                )}
                {usage.data.functionInvocationsLimit && (
                  <UsageRow
                    label="Fn invocations"
                    current={`${(usage.data.functionInvocations ?? 0).toLocaleString()} / ${usage.data.functionInvocationsLimit.toLocaleString()}`}
                    pct={
                      ((usage.data.functionInvocations ?? 0) /
                        usage.data.functionInvocationsLimit) *
                      100
                    }
                  />
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

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

function VercelLogo() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 0L14 12H0L7 0Z" fill="currentColor"/>
    </svg>
  );
}
