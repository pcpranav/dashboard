"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetcher, SWR_CONFIG } from "@/lib/swr";
import type {
  ConnectedServices,
  DeploymentData,
  ProjectData,
  SupabaseResponse,
} from "@/types";
import { cn } from "@/lib/utils";

interface Link {
  id: number;
  frontendProvider: "vercel" | "netlify";
  frontendProjectName: string;
  supabaseProjectRef: string;
}

interface NetlifyResponse {
  deploys: DeploymentData[];
  buildMinutes: number;
}

function latestStatus(deploys: DeploymentData[] | undefined, project: string) {
  if (!deploys) return null;
  const match = deploys
    .filter((d) => d.project === project)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return match ?? null;
}

export function LinkedProjects({ connected }: { connected: ConnectedServices }) {
  const canLink = connected.supabase && (connected.vercel || connected.netlify);

  const links = useSWR<Link[]>(canLink ? "/api/links" : null, fetcher, SWR_CONFIG);
  const vercelDeploys = useSWR<DeploymentData[]>(
    connected.vercel ? "/api/vercel/deployments" : null,
    fetcher,
    SWR_CONFIG,
  );
  const vercelProjects = useSWR<ProjectData[]>(
    connected.vercel ? "/api/vercel/projects" : null,
    fetcher,
    SWR_CONFIG,
  );
  const netlify = useSWR<NetlifyResponse>(
    connected.netlify ? "/api/netlify/deploys" : null,
    fetcher,
    SWR_CONFIG,
  );
  const netlifySites = useSWR<ProjectData[]>(
    connected.netlify ? "/api/netlify/sites" : null,
    fetcher,
    SWR_CONFIG,
  );
  const supabase = useSWR<SupabaseResponse>(
    connected.supabase ? "/api/supabase/projects" : null,
    fetcher,
    SWR_CONFIG,
  );

  const [adding, setAdding] = useState(false);
  const [frontend, setFrontend] = useState<string>("");
  const [supaRef, setSupaRef] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frontendOptions = useMemo(() => {
    const set = new Map<string, { provider: "vercel" | "netlify"; name: string }>();
    for (const p of vercelProjects.data ?? []) {
      if (p.name) set.set(`vercel:${p.name}`, { provider: "vercel", name: p.name });
    }
    for (const s of netlifySites.data ?? []) {
      if (s.name) set.set(`netlify:${s.name}`, { provider: "netlify", name: s.name });
    }
    return Array.from(set.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [vercelProjects.data, netlifySites.data]);

  const supabaseOptions = supabase.data?.projects ?? [];

  if (!canLink) return null;

  async function onSubmit() {
    if (!frontend || !supaRef) return;
    const [provider, ...rest] = frontend.split(":");
    const name = rest.join(":");
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontendProvider: provider,
          frontendProjectName: name,
          supabaseProjectRef: supaRef,
        }),
      });
      if (!res.ok) {
        setError("Failed to save link.");
        return;
      }
      setFrontend("");
      setSupaRef("");
      setAdding(false);
      await links.mutate();
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: number) {
    const res = await fetch(`/api/links?id=${id}`, { method: "DELETE" });
    if (res.ok) await links.mutate();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center border border-border bg-surface-alt text-fg">
            <LinkIcon />
          </div>
          <CardTitle>Linked projects</CardTitle>
        </div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            + Link
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {adding && (
          <div className="space-y-2.5 border border-border bg-surface-alt p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Select
                label="Frontend project"
                value={frontend}
                onChange={setFrontend}
                options={[
                  { value: "", label: "Select frontend…" },
                  ...frontendOptions.map((o) => ({
                    value: `${o.provider}:${o.name}`,
                    label: `${o.name} · ${o.provider}`,
                  })),
                ]}
              />
              <Select
                label="Supabase project"
                value={supaRef}
                onChange={setSupaRef}
                options={[
                  { value: "", label: "Select Supabase…" },
                  ...supabaseOptions.map((p) => ({
                    value: p.domain.split(".")[0],
                    label: p.name,
                  })),
                ]}
              />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onSubmit} disabled={submitting || !frontend || !supaRef}>
                {submitting ? "Saving…" : "Link"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAdding(false);
                  setFrontend("");
                  setSupaRef("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {links.data && links.data.length === 0 && !adding && (
          <p className="text-sm text-muted">
            Pair a frontend project with a Supabase project to see deploy + DB state side-by-side.
          </p>
        )}

        {links.data && links.data.length > 0 && (
          <ul className="space-y-1">
            {links.data.map((l) => {
              const deployList =
                l.frontendProvider === "vercel"
                  ? vercelDeploys.data
                  : netlify.data?.deploys;
              const latest = latestStatus(deployList, l.frontendProjectName);
              const health = supabase.data?.health.find((h) => h.projectRef === l.supabaseProjectRef);
              const supProject = supabase.data?.projects.find(
                (p) => p.domain.startsWith(`${l.supabaseProjectRef}.`),
              );
              const unhealthyCount = health?.services.filter((s) => !s.healthy).length ?? 0;

              return (
                <li
                  key={l.id}
                  className="flex items-center gap-3 border border-border bg-surface-alt p-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        latest?.status === "error"
                          ? "bg-danger"
                          : latest?.status === "building"
                            ? "bg-warning"
                            : latest?.status === "ready"
                              ? "bg-success"
                              : "bg-muted",
                      )}
                    />
                    <span className="truncate text-sm font-medium">{l.frontendProjectName}</span>
                    <Badge variant="muted">{l.frontendProvider}</Badge>
                  </div>
                  <span className="text-xs text-muted">↔</span>
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        health?.available === false
                          ? "bg-muted"
                          : unhealthyCount > 0
                            ? "bg-danger"
                            : "bg-success",
                      )}
                    />
                    <span className="truncate text-sm font-medium">
                      {supProject?.name ?? l.supabaseProjectRef}
                    </span>
                    {unhealthyCount > 0 && (
                      <Badge variant="danger">{unhealthyCount} down</Badge>
                    )}
                  </div>
                  <button
                    onClick={() => onDelete(l.id)}
                    className="text-muted transition-colors hover:text-danger"
                    aria-label="Remove link"
                  >
                    <CloseIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-none border border-border bg-surface px-3 text-sm text-fg transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg text-fg">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 9a3 3 0 0 0 4 0l2-2a3 3 0 1 0-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 5a3 3 0 0 0-4 0L3 7a3 3 0 1 0 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
