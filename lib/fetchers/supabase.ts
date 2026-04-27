import type {
  ProjectData,
  SupabaseBranchData,
  SupabaseBucketData,
  SupabaseFunctionData,
  SupabaseProjectExtras,
  SupabaseProjectHealth,
  SupabaseProjectUsage,
  SupabaseResponse,
  SupabaseServiceHealth,
} from "@/types";

const BASE = "https://api.supabase.com";

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

interface SupabaseProject {
  id: string;
  ref: string;
  name: string;
  region: string;
  status: string;
  created_at?: string;
  inserted_at?: string;
}

export async function validateSupabaseToken(token: string): Promise<boolean> {
  const res = await fetch(`${BASE}/v1/projects`, { headers: headers(token), cache: "no-store" });
  return res.ok;
}

export async function fetchSupabaseProjects(token: string): Promise<SupabaseProject[]> {
  const res = await fetch(`${BASE}/v1/projects`, { headers: headers(token), cache: "no-store" });
  if (!res.ok) throw new Error(`supabase projects ${res.status}`);
  return (await res.json()) as SupabaseProject[];
}

interface UsageResponse {
  db_size?: number;
  db_size_limit?: number;
  connections?: number;
  connections_limit?: number;
  api_requests?: number;
  api_requests_limit?: number;
  auth_users?: number;
}

async function fetchProjectUsage(
  token: string,
  project: SupabaseProject,
): Promise<SupabaseProjectUsage> {
  const paused = project.status?.toLowerCase().includes("pause");
  if (paused) {
    return { projectRef: project.ref, projectName: project.name, available: false, paused: true };
  }
  const res = await fetch(`${BASE}/v1/projects/${project.ref}/usage`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (res.status === 404 || !res.ok) {
    return { projectRef: project.ref, projectName: project.name, available: false };
  }
  const u = (await res.json()) as UsageResponse;
  return {
    projectRef: project.ref,
    projectName: project.name,
    available: true,
    dbSizeBytes: u.db_size,
    dbSizeLimitBytes: u.db_size_limit ?? 500 * 1024 * 1024,
    connections: u.connections,
    connectionsLimit: u.connections_limit,
    apiRequests: u.api_requests,
    apiRequestsLimit: u.api_requests_limit,
    authUsers: u.auth_users,
  };
}

interface HealthEntry {
  name: string;
  healthy?: boolean;
  status?: string;
}

async function fetchProjectHealth(
  token: string,
  project: SupabaseProject,
): Promise<SupabaseProjectHealth> {
  if (project.status?.toLowerCase().includes("pause")) {
    return { projectRef: project.ref, available: false, services: [] };
  }
  const services = ["auth", "db", "pooler", "realtime", "rest", "storage"];
  const qs = services.map((s) => `services=${s}`).join("&");
  try {
    const res = await fetch(`${BASE}/v1/projects/${project.ref}/health?${qs}`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!res.ok) {
      return { projectRef: project.ref, available: false, services: [] };
    }
    const json = (await res.json()) as HealthEntry[];
    const mapped: SupabaseServiceHealth[] = json.map((s) => ({
      name: s.name,
      healthy: s.healthy === true || (s.status ?? "").toUpperCase() === "ACTIVE_HEALTHY",
      status: s.status,
    }));
    return { projectRef: project.ref, available: true, services: mapped };
  } catch {
    return { projectRef: project.ref, available: false, services: [] };
  }
}

interface EdgeFunction {
  slug: string;
  name: string;
  status?: string;
  updated_at?: number | string;
}

async function fetchProjectFunctions(
  token: string,
  project: SupabaseProject,
): Promise<SupabaseFunctionData[]> {
  if (project.status?.toLowerCase().includes("pause")) return [];
  try {
    const res = await fetch(`${BASE}/v1/projects/${project.ref}/functions`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as EdgeFunction[];
    return json.map((f) => ({
      projectRef: project.ref,
      slug: f.slug,
      name: f.name,
      status: f.status,
      updatedAt:
        typeof f.updated_at === "number"
          ? new Date(f.updated_at).toISOString()
          : f.updated_at,
    }));
  } catch {
    return [];
  }
}

interface StorageBucket {
  id: string;
  name: string;
  public?: boolean;
  created_at?: string;
}

async function fetchProjectBuckets(
  token: string,
  project: SupabaseProject,
): Promise<SupabaseBucketData[]> {
  if (project.status?.toLowerCase().includes("pause")) return [];
  try {
    const res = await fetch(`${BASE}/v1/projects/${project.ref}/storage/buckets`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as StorageBucket[];
    return json.map((b) => ({
      projectRef: project.ref,
      name: b.name,
      public: Boolean(b.public),
      createdAt: b.created_at,
    }));
  } catch {
    return [];
  }
}

interface SupabaseBranch {
  id: string;
  name: string;
  git_branch?: string;
  status?: string;
  created_at?: string;
}

async function fetchProjectBranches(
  token: string,
  project: SupabaseProject,
): Promise<SupabaseBranchData[]> {
  if (project.status?.toLowerCase().includes("pause")) return [];
  try {
    const res = await fetch(`${BASE}/v1/projects/${project.ref}/branches`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as SupabaseBranch[];
    return json.map((b) => ({
      projectRef: project.ref,
      name: b.name,
      gitBranch: b.git_branch,
      status: b.status,
      createdAt: b.created_at,
    }));
  } catch {
    return [];
  }
}

async function fetchProjectExtras(
  token: string,
  project: SupabaseProject,
): Promise<SupabaseProjectExtras> {
  const base: SupabaseProjectExtras = { projectRef: project.ref };
  if (project.status?.toLowerCase().includes("pause")) return base;

  const [pg, pitr, net, replicas] = await Promise.allSettled([
    fetch(`${BASE}/v1/projects/${project.ref}/config/database/postgres`, {
      headers: headers(token),
      cache: "no-store",
    }),
    fetch(`${BASE}/v1/projects/${project.ref}/database/backups`, {
      headers: headers(token),
      cache: "no-store",
    }),
    fetch(`${BASE}/v1/projects/${project.ref}/network-restrictions`, {
      headers: headers(token),
      cache: "no-store",
    }),
    fetch(`${BASE}/v1/projects/${project.ref}/read-replicas`, {
      headers: headers(token),
      cache: "no-store",
    }),
  ]);

  if (pg.status === "fulfilled" && pg.value.ok) {
    try {
      const body = (await pg.value.json()) as { version?: string; engine?: string };
      base.postgresVersion = body.version ?? body.engine;
    } catch {
      // ignore
    }
  }

  if (pitr.status === "fulfilled" && pitr.value.ok) {
    try {
      const body = (await pitr.value.json()) as {
        pitr_enabled?: boolean;
        retention_period_days?: number;
        walg_enabled?: boolean;
      };
      base.pitrEnabled = Boolean(body.pitr_enabled ?? body.walg_enabled);
      base.pitrRetentionDays = body.retention_period_days;
    } catch {
      // ignore
    }
  }

  if (net.status === "fulfilled" && net.value.ok) {
    try {
      const body = (await net.value.json()) as {
        config?: { dbAllowedCidrs?: string[]; dbAllowedCidrsV6?: string[] };
        status?: string;
      };
      const cidrs = [
        ...(body.config?.dbAllowedCidrs ?? []),
        ...(body.config?.dbAllowedCidrsV6 ?? []),
      ];
      const open = cidrs.length === 0 || cidrs.includes("0.0.0.0/0");
      base.networkRestrictionsEnabled = !open;
    } catch {
      // ignore
    }
  }

  if (replicas.status === "fulfilled" && replicas.value.ok) {
    try {
      const body = (await replicas.value.json()) as unknown[];
      base.readReplicas = Array.isArray(body) ? body.length : 0;
    } catch {
      // ignore
    }
  }

  return base;
}

export async function fetchSupabaseAll(token: string): Promise<SupabaseResponse> {
  const projects = await fetchSupabaseProjects(token);
  const [usage, health, functions, buckets, branches, extras] = await Promise.all([
    Promise.all(projects.map((p) => fetchProjectUsage(token, p))),
    Promise.all(projects.map((p) => fetchProjectHealth(token, p))),
    Promise.all(projects.map((p) => fetchProjectFunctions(token, p))),
    Promise.all(projects.map((p) => fetchProjectBuckets(token, p))),
    Promise.all(projects.map((p) => fetchProjectBranches(token, p))),
    Promise.all(projects.map((p) => fetchProjectExtras(token, p))),
  ]);
  const projectData: ProjectData[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    domain: `${p.ref}.supabase.co`,
    provider: "supabase" as const,
    region: p.region,
    status: p.status?.toLowerCase().includes("pause") ? "paused" : "active",
    rawStatus: p.status,
    createdAt: p.created_at ?? p.inserted_at,
  }));
  return {
    projects: projectData,
    usage,
    health,
    functions: functions.flat(),
    buckets: buckets.flat(),
    branches: branches.flat(),
    extras,
  };
}
