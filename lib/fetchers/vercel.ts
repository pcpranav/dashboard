import type {
  DeployContext,
  DeploymentData,
  DeployStatus,
  DomainData,
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

export async function fetchVercelProjects(token: string): Promise<ProjectData[]> {
  const res = await fetch(`${BASE}/v9/projects?limit=100`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vercel projects ${res.status}`);
  const json = (await res.json()) as { projects: VercelProject[] };
  return json.projects.map((p) => ({
    id: p.id,
    name: p.name,
    domain: p.targets?.production?.alias?.[0] ?? "",
    provider: "vercel" as const,
    status: "active" as const,
  }));
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
  const res = await fetch(`${BASE}/v6/deployments?limit=${limit}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`vercel deployments ${res.status}`);
  const json = (await res.json()) as { deployments: VercelDeployment[] };
  return json.deployments.map(mapVercelDeployment);
}

interface VercelDomain {
  name: string;
  expiresAt?: number | null;
  boughtAt?: number | null;
  verified?: boolean;
}

export async function fetchVercelDomains(token: string): Promise<DomainData[]> {
  const res = await fetch(`${BASE}/v5/domains?limit=100`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { domains: VercelDomain[] };
  return json.domains.map((d) => ({
    name: d.name,
    expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
    boughtAt: d.boughtAt ? new Date(d.boughtAt).toISOString() : null,
    verified: Boolean(d.verified),
    provider: "vercel" as const,
  }));
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
