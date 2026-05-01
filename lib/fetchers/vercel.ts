import type {
  DeployContext,
  DeploymentData,
  DeployStatus,
  DomainData,
  LogLine,
  ProjectData,
  VercelTeam,
  VercelUsageData,
} from "@/types";

const BASE = "https://api.vercel.com";

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function validateVercelToken(token: string): Promise<boolean> {
  const res = await fetch(`${BASE}/v2/user`, { headers: headers(token), cache: "no-store" });
  return res.ok;
}

interface VercelProject {
  id: string;
  name: string;
  framework?: string | null;
  targets?: { production?: { alias?: string[] } };
}

async function fetchScopeIds(token: string): Promise<Array<string | null>> {
  const teams = await fetchVercelTeams(token);
  return [null, ...teams.map((t) => t.id)];
}

function withTeam(url: string, teamId: string | null): string {
  if (!teamId) return url;
  return url + (url.includes("?") ? "&" : "?") + `teamId=${encodeURIComponent(teamId)}`;
}

export async function fetchVercelProjects(token: string): Promise<ProjectData[]> {
  const scopes = await fetchScopeIds(token);
  const results = await Promise.allSettled(
    scopes.map(async (teamId) => {
      const res = await fetch(withTeam(`${BASE}/v9/projects?limit=100`, teamId), {
        headers: headers(token),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`vercel projects ${res.status}`);
      const json = (await res.json()) as { projects: VercelProject[] };
      return json.projects;
    }),
  );
  const seen = new Set<string>();
  const merged: ProjectData[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const p of r.value) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push({
        id: p.id,
        name: p.name,
        domain: p.targets?.production?.alias?.[0] ?? "",
        provider: "vercel" as const,
        status: "active" as const,
      });
    }
  }
  return merged;
}

interface VercelDeployment {
  uid: string;
  name: string;
  state?: string;
  readyState?: string;
  meta?: { githubCommitRef?: string; githubCommitMessage?: string };
  target?: string | null;
  created: number;
  ready?: number;
  buildingAt?: number;
  url: string;
}

function mapVercelState(state: string | undefined): DeployStatus {
  switch ((state ?? "").toUpperCase()) {
    case "READY":
      return "ready";
    case "BUILDING":
    case "QUEUED":
    case "INITIALIZING":
      return "building";
    case "ERROR":
    case "FAILED":
      return "error";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    default:
      return "building";
  }
}

function mapVercelContext(target: string | null | undefined): DeployContext {
  if (target === "production") return "production";
  if (target === "staging") return "preview";
  return "preview";
}

function mapVercelDeployment(d: VercelDeployment): DeploymentData {
  const startedAt = d.buildingAt ?? d.created;
  const duration = d.ready && startedAt ? Math.round((d.ready - startedAt) / 1000) : 0;
  return {
    id: d.uid,
    project: d.name,
    status: mapVercelState(d.readyState ?? d.state),
    branch: d.meta?.githubCommitRef ?? "",
    commitMessage: d.meta?.githubCommitMessage ?? "",
    duration,
    createdAt: new Date(d.created).toISOString(),
    url: d.url.startsWith("http") ? d.url : `https://${d.url}`,
    provider: "vercel" as const,
    context: mapVercelContext(d.target),
  };
}

export async function fetchVercelDeployments(token: string, limit = 10): Promise<DeploymentData[]> {
  const scopes = await fetchScopeIds(token);
  const results = await Promise.allSettled(
    scopes.map(async (teamId) => {
      const res = await fetch(withTeam(`${BASE}/v6/deployments?limit=${limit}`, teamId), {
        headers: headers(token),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`vercel deployments ${res.status}`);
      const json = (await res.json()) as { deployments: VercelDeployment[] };
      return json.deployments;
    }),
  );
  const seen = new Set<string>();
  const merged: VercelDeployment[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const d of r.value) {
      if (seen.has(d.uid)) continue;
      seen.add(d.uid);
      merged.push(d);
    }
  }
  merged.sort((a, b) => b.created - a.created);
  return merged.slice(0, limit).map(mapVercelDeployment);
}

async function fetchOnSomeScope<T>(
  token: string,
  build: (teamId: string | null) => string,
): Promise<T> {
  const scopes = await fetchScopeIds(token);
  let lastStatus = 0;
  for (const teamId of scopes) {
    const res = await fetch(build(teamId), { headers: headers(token), cache: "no-store" });
    if (res.ok) return (await res.json()) as T;
    lastStatus = res.status;
    if (res.status !== 403 && res.status !== 404) {
      throw new Error(`vercel request ${res.status}`);
    }
  }
  throw new Error(`vercel request ${lastStatus || 404}`);
}

export async function fetchVercelDeployment(token: string, id: string): Promise<DeploymentData> {
  const raw = await fetchOnSomeScope<VercelDeployment>(token, (teamId) =>
    withTeam(`${BASE}/v13/deployments/${encodeURIComponent(id)}`, teamId),
  );
  return mapVercelDeployment(raw);
}

interface VercelEvent {
  type?: string;
  created?: number;
  payload?: { text?: string };
  text?: string;
}

function inferLevel(text: string, type?: string): LogLine["level"] {
  if (type === "stderr") return "error";
  if (/error|✗|failed/i.test(text)) return "error";
  if (/warn/i.test(text)) return "warn";
  return "info";
}

export async function fetchVercelDeployLogs(token: string, id: string): Promise<LogLine[]> {
  const events = await fetchOnSomeScope<VercelEvent[]>(token, (teamId) =>
    withTeam(`${BASE}/v3/deployments/${encodeURIComponent(id)}/events?limit=1000`, teamId),
  );
  const lines: LogLine[] = [];
  for (const e of events) {
    const text = e.payload?.text ?? e.text ?? "";
    if (!text.trim()) continue;
    lines.push({
      ts: typeof e.created === "number" ? e.created : null,
      level: inferLevel(text, e.type),
      text,
    });
  }
  return lines;
}

interface VercelDomain {
  name: string;
  expiresAt?: number | null;
  boughtAt?: number | null;
  verified?: boolean;
}

export async function fetchVercelDomains(token: string): Promise<DomainData[]> {
  const scopes = await fetchScopeIds(token);
  const results = await Promise.allSettled(
    scopes.map(async (teamId) => {
      const res = await fetch(withTeam(`${BASE}/v5/domains?limit=100`, teamId), {
        headers: headers(token),
        cache: "no-store",
      });
      if (!res.ok) return [] as VercelDomain[];
      const json = (await res.json()) as { domains: VercelDomain[] };
      return json.domains;
    }),
  );
  const seen = new Set<string>();
  const merged: DomainData[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const d of r.value) {
      if (seen.has(d.name)) continue;
      seen.add(d.name);
      merged.push({
        name: d.name,
        expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
        boughtAt: d.boughtAt ? new Date(d.boughtAt).toISOString() : null,
        verified: Boolean(d.verified),
        provider: "vercel" as const,
      });
    }
  }
  return merged;
}

interface VercelUsageResponse {
  total?: {
    bandwidth?: { used?: number; included?: number };
    build_execution?: { used?: number; included?: number };
    invocations?: { used?: number; included?: number };
  };
}

interface VercelTeamRaw {
  id: string;
  name: string;
  slug: string;
}

export async function fetchVercelTeams(token: string): Promise<VercelTeam[]> {
  const res = await fetch(`${BASE}/v2/teams`, { headers: headers(token), cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as { teams: VercelTeamRaw[] };
  return (json.teams ?? []).map((t) => ({ id: t.id, name: t.name, slug: t.slug }));
}

export async function fetchVercelUsage(token: string): Promise<VercelUsageData> {
  const res = await fetch(`${BASE}/v1/usage`, { headers: headers(token), cache: "no-store" });
  if (!res.ok) {
    return { available: false };
  }
  const json = (await res.json()) as VercelUsageResponse;
  const bandwidth = json.total?.bandwidth;
  const build = json.total?.build_execution;
  const inv = json.total?.invocations;
  return {
    available: true,
    bandwidthBytes: bandwidth?.used,
    bandwidthLimitBytes: bandwidth?.included,
    buildMinutes: build?.used,
    buildMinutesLimit: build?.included,
    functionInvocations: inv?.used,
    functionInvocationsLimit: inv?.included,
  };
}
