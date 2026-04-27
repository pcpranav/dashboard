"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type { SupabaseResponse } from "@/types";
import { ConnectCTA } from "./ConnectCTA";
import { formatBytes, timeAgo, cn } from "@/lib/utils";

const DB_LIMIT = 500 * 1024 * 1024;

function progressColor(pct: number): string {
  if (pct >= 90) return "bg-danger";
  if (pct >= 70) return "bg-warning";
  return "bg-blue";
}

function formatStatus(raw?: string): string {
  if (!raw) return "Unknown";
  return raw
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const SERVICE_LABEL: Record<string, string> = {
  auth: "Auth",
  db: "DB",
  pooler: "Pooler",
  realtime: "Realtime",
  rest: "REST",
  storage: "Storage",
};

export function SupabaseCard({ connected }: { connected: boolean }) {
  const { data, error, isLoading } = useSWR<SupabaseResponse>(
    connected ? "/api/supabase/projects" : null,
    fetcher,
    SWR_CONFIG,
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-fg">
            <SupabaseLogo />
          </div>
          <CardTitle>Supabase</CardTitle>
        </div>
        {data && <Badge variant="muted">{data.projects.length} projects</Badge>}
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected && <ConnectCTA service="Supabase" />}
        {connected && isLoading && (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        )}
        {connected && error && <p className="text-sm text-danger">Failed to load projects.</p>}
        {connected && data && data.projects.length === 0 && (
          <p className="text-sm text-muted">No Supabase projects found.</p>
        )}
        {connected && data &&
          data.projects.map((project) => {
            const usage = data.usage.find((u) => u.projectName === project.name);
            const health = data.health.find((h) => h.projectRef === usage?.projectRef);
            const functions = data.functions.filter((f) => f.projectRef === usage?.projectRef);
            const buckets = data.buckets.filter((b) => b.projectRef === usage?.projectRef);
            const branches = data.branches.filter((b) => b.projectRef === usage?.projectRef);
            const extras = data.extras.find((e) => e.projectRef === usage?.projectRef);
            const paused = project.status === "paused" || usage?.paused;
            const healthy = (project.rawStatus ?? "").toUpperCase().includes("HEALTHY");
            const hasUsage = Boolean(usage?.available);
            const dbLimit = usage?.dbSizeLimitBytes ?? DB_LIMIT;
            const dbPct = usage?.dbSizeBytes ? (usage.dbSizeBytes / dbLimit) * 100 : 0;

            return (
              <div
                key={project.id}
                className="space-y-2.5 rounded-xl border border-border bg-white/[0.02] p-3.5 transition-colors hover:border-border-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{project.name}</span>
                    <div className="flex items-center gap-2 text-[10px] mono text-muted">
                      {project.region && <span>{project.region}</span>}
                      {project.createdAt && (
                        <>
                          <span>·</span>
                          <span>created {timeAgo(project.createdAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {paused ? (
                    <Badge variant="muted">Paused</Badge>
                  ) : healthy ? (
                    <Badge variant="success">{formatStatus(project.rawStatus)}</Badge>
                  ) : (
                    <Badge variant="warning">{formatStatus(project.rawStatus)}</Badge>
                  )}
                </div>

                {!paused && health?.available && health.services.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {health.services.map((s) => (
                      <span
                        key={s.name}
                        title={`${s.name}: ${s.status ?? (s.healthy ? "healthy" : "unhealthy")}`}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] mono",
                          s.healthy
                            ? "border-success/25 bg-success/5 text-success"
                            : "border-danger/30 bg-danger/10 text-danger",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1 w-1 rounded-full",
                            s.healthy ? "bg-success" : "bg-danger",
                          )}
                        />
                        {SERVICE_LABEL[s.name] ?? s.name}
                      </span>
                    ))}
                  </div>
                )}

                {!paused && hasUsage && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Metric
                      label="DB size"
                      value={`${formatBytes(usage?.dbSizeBytes)} / ${formatBytes(dbLimit)}`}
                      pct={dbPct}
                    />
                    {usage?.connections !== undefined && (
                      <Metric
                        label="Connections"
                        value={`${usage.connections}${usage.connectionsLimit ? ` / ${usage.connectionsLimit}` : ""}`}
                        pct={usage.connectionsLimit ? (usage.connections / usage.connectionsLimit) * 100 : 0}
                      />
                    )}
                    {usage?.apiRequests !== undefined && (
                      <Metric
                        label="API requests"
                        value={`${usage.apiRequests.toLocaleString()}${usage.apiRequestsLimit ? ` / ${usage.apiRequestsLimit.toLocaleString()}` : ""}`}
                        pct={usage.apiRequestsLimit ? (usage.apiRequests / usage.apiRequestsLimit) * 100 : 0}
                      />
                    )}
                    {usage?.authUsers !== undefined && (
                      <Metric label="Auth users" value={usage.authUsers.toLocaleString()} pct={0} hideBar />
                    )}
                  </div>
                )}

                {!paused && (functions.length > 0 || buckets.length > 0 || branches.length > 0) && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {functions.length > 0 && (
                      <Chip label={`${functions.length} function${functions.length === 1 ? "" : "s"}`} />
                    )}
                    {buckets.length > 0 && (
                      <Chip
                        label={`${buckets.length} bucket${buckets.length === 1 ? "" : "s"}${
                          buckets.some((b) => b.public) ? " · public" : ""
                        }`}
                      />
                    )}
                    {branches.length > 0 && (
                      <Chip label={`${branches.length} branch${branches.length === 1 ? "" : "es"}`} />
                    )}
                  </div>
                )}

                {!paused && extras && (extras.postgresVersion || extras.pitrEnabled !== undefined || extras.networkRestrictionsEnabled !== undefined || extras.readReplicas) && (
                  <div className="flex flex-wrap gap-1.5">
                    {extras.postgresVersion && (
                      <Chip label={`pg ${extras.postgresVersion}`} />
                    )}
                    {extras.pitrEnabled !== undefined && (
                      <Chip
                        label={
                          extras.pitrEnabled
                            ? `PITR ${extras.pitrRetentionDays ? `${extras.pitrRetentionDays}d` : "on"}`
                            : "PITR off"
                        }
                      />
                    )}
                    {extras.networkRestrictionsEnabled !== undefined && (
                      <Chip
                        label={extras.networkRestrictionsEnabled ? "IP allowlist" : "DB open"}
                      />
                    )}
                    {extras.readReplicas !== undefined && extras.readReplicas > 0 && (
                      <Chip label={`${extras.readReplicas} replica${extras.readReplicas === 1 ? "" : "s"}`} />
                    )}
                  </div>
                )}

                {!paused && !hasUsage && (
                  <p className="pt-1 text-[11px] text-muted">
                    Usage metrics unavailable (free plan).
                  </p>
                )}
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  pct,
  hideBar,
}: {
  label: string;
  value: string;
  pct: number;
  hideBar?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] mono text-muted">
        <span>{label}</span>
        <span className="text-fg">{value}</span>
      </div>
      {!hideBar && <Progress value={pct} indicatorClassName={progressColor(pct)} />}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-white/[0.03] px-2 py-0.5 text-[10px] mono text-muted">
      {label}
    </span>
  );
}

function SupabaseLogo() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 1L2 7.5H7L6.5 13L12 6.5H7L7.5 1Z" fill="currentColor"/>
    </svg>
  );
}
