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
