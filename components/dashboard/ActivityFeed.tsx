"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type { ActivityEvent, ConnectedServices, DeploymentData, SupabaseResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NetlifyResponse {
  deploys: DeploymentData[];
  buildMinutes: number;
}

const EVENT_STYLE: Record<ActivityEvent["type"], { dot: string; glow: string }> = {
  deploy_success: { dot: "bg-mint", glow: "shadow-[0_0_10px_rgba(74,222,128,0.6)]" },
  deploy_fail: { dot: "bg-danger", glow: "shadow-[0_0_10px_rgba(251,113,133,0.6)]" },
  deploy_building: { dot: "bg-amber", glow: "shadow-[0_0_10px_rgba(251,191,36,0.6)]" },
  user_signup: { dot: "bg-info", glow: "shadow-[0_0_10px_rgba(96,165,250,0.6)]" },
  error: { dot: "bg-danger", glow: "shadow-[0_0_10px_rgba(251,113,133,0.6)]" },
};

const SERVICE_STYLE: Record<string, string> = {
  vercel: "text-muted",
  netlify: "text-muted",
  supabase: "text-muted",
};

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
    message: `${d.project} ${verb}${d.branch ? ` (${d.branch})` : ""}`,
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.06] text-fg">
            <ActivityIcon />
          </div>
          <CardTitle>Activity</CardTitle>
        </div>
        <span className="text-[11px] text-muted mono">last 20 events</span>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No recent activity.</p>
        ) : (
          <ul className="space-y-0.5">
            {sorted.map((e) => {
              const s = EVENT_STYLE[e.type];
              return (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.dot, s.glow)} />
                  <span
                    className={cn(
                      "w-16 shrink-0 text-[10px] uppercase tracking-widest mono font-semibold",
                      SERVICE_STYLE[e.service] ?? "text-muted",
                    )}
                  >
                    {e.service}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{e.message}</span>
                  <span className="mono shrink-0 text-[10px] text-muted">{timeAgo(e.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ActivityIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 7H3.5L5.5 2L8.5 12L10.5 7H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
