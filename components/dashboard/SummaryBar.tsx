"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type { DeploymentData, SupabaseResponse } from "@/types";
import type { ConnectedServices } from "@/types";
import { cn } from "@/lib/utils";

interface NetlifyResponse {
  deploys: DeploymentData[];
  buildMinutes: number;
}

function countToday(deploys: DeploymentData[]): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return deploys.filter((d) => new Date(d.createdAt) >= start).length;
}

function countErrors24h(deploys: DeploymentData[]): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return deploys.filter((d) => d.status === "error" && new Date(d.createdAt).getTime() >= cutoff).length;
}

export function SummaryBar({ connected }: { connected: ConnectedServices }) {
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

  const allDeploys: DeploymentData[] = [
    ...(vercel.data ?? []),
    ...(netlify.data?.deploys ?? []),
  ];

  const totalProjects =
    (vercel.data?.length ? new Set(vercel.data.map((d) => d.project)).size : 0) +
    (netlify.data?.deploys.length ? new Set(netlify.data.deploys.map((d) => d.project)).size : 0) +
    (supabase.data?.projects.length ?? 0);

  const errors = countErrors24h(allDeploys);
  const connectedCount = Number(connected.vercel) + Number(connected.netlify) + Number(connected.supabase);

  const cells = [
    { label: "Projects", value: totalProjects, hint: "across services", accent: "text-muted" },
    { label: "Deploys today", value: countToday(allDeploys), hint: "last 24h", accent: "text-muted" },
    { label: "Errors 24h", value: errors, hint: errors > 0 ? "needs attention" : "all clear", danger: errors > 0, accent: errors > 0 ? "text-danger" : "text-muted" },
    { label: "Services", value: `${connectedCount}/3`, hint: "connected", accent: "text-muted" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cells.map((c) => (
        <div
          key={c.label}
          className="glass group relative overflow-hidden rounded-2xl p-4 transition-all hover:border-border-strong"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-widest text-muted mono">{c.label}</span>
            <span className={cn("text-3xl font-semibold leading-none tracking-tight", c.danger ? "text-danger" : "text-fg")}>
              {c.value}
            </span>
            <span className={cn("text-[11px] mono", c.accent)}>{c.hint}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
