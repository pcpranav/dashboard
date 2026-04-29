"use client";

import useSWR from "swr";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type {
  ConnectedServices,
  DeploymentData,
  DomainData,
  NetlifyResponse,
  SupabaseResponse,
} from "@/types";
import { cn } from "@/lib/utils";

function countErrors24h(deploys: DeploymentData[]): number {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return deploys.filter(
    (d) => d.status === "error" && new Date(d.createdAt).getTime() >= cutoff,
  ).length;
}

function countLast7Days(deploys: DeploymentData[]): number {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return deploys.filter((d) => new Date(d.createdAt).getTime() >= cutoff).length;
}

const NETLIFY_BUILD_LIMIT = 300;

export function FactStrip({ connected }: { connected: ConnectedServices }) {
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
  const domains = useSWR<DomainData[]>(
    connected.vercel ? "/api/vercel/domains" : null,
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

  const failed24h = countErrors24h(allDeploys);
  const deploys7d = countLast7Days(allDeploys);
  const buildMin = netlify.data?.buildMinutes ?? 0;
  const domainsCount = domains.data?.length ?? 0;

  const supabaseHealth = supabase.data?.health ?? [];
  const allHealthy = supabaseHealth.length === 0
    ? null
    : supabaseHealth.every((h) =>
        h.available === false ? true : h.services.every((s) => s.healthy),
      );

  const cells: { label: string; value: React.ReactNode; tone?: "default" | "danger" | "success" }[] = [
    { label: "Projects", value: totalProjects },
    {
      label: "Deploys 7d",
      value: deploys7d,
    },
    {
      label: "Failed 24h",
      value: failed24h,
      tone: failed24h > 0 ? "danger" : "default",
    },
    {
      label: "Build min",
      value: connected.netlify ? `${buildMin} / ${NETLIFY_BUILD_LIMIT}` : "—",
    },
    {
      label: "Domains",
      value: connected.vercel ? domainsCount : "—",
    },
    {
      label: "Health",
      value: allHealthy === null ? "—" : allHealthy ? "all up" : "issues",
      tone: allHealthy === false ? "danger" : allHealthy ? "success" : "default",
    },
  ];

  return (
    <div className="border-y border-border" style={{ borderTopColor: "var(--rule)", borderTopWidth: 1 }}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={cn(
              "px-4 py-2.5",
              i < cells.length - 1 && "border-r border-border",
              "last:border-r-0",
              "lg:[&:nth-child(6n)]:border-r-0",
            )}
          >
            <div className="text-[9px] uppercase tracking-[0.15em] font-medium text-muted-soft">
              {c.label}
            </div>
            <div
              className={cn(
                "mono tnum text-base font-semibold leading-tight",
                c.tone === "danger" && "text-danger",
                c.tone === "success" && "text-success",
              )}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
