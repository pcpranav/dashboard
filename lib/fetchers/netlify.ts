import type {
  DeployContext,
  DeploymentData,
  DeployStatus,
  NetlifyAccountInfo,
  NetlifyBandwidthData,
  NetlifyFormData,
  NetlifyFunctionData,
  ProjectData,
} from "@/types";

const BASE = "https://api.netlify.com/api/v1";

function headers(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function validateNetlifyToken(token: string): Promise<boolean> {
  const res = await fetch(`${BASE}/user`, { headers: headers(token), cache: "no-store" });
  return res.ok;
}

interface NetlifySite {
  id: string;
  name: string;
  url: string;
  ssl_url?: string;
  custom_domain?: string | null;
  account_slug?: string;
}

export async function fetchNetlifySites(token: string): Promise<ProjectData[]> {
  const res = await fetch(`${BASE}/sites`, { headers: headers(token), cache: "no-store" });
  if (!res.ok) throw new Error(`netlify sites ${res.status}`);
  const sites = (await res.json()) as NetlifySite[];
  return sites.map((s) => ({
    id: s.id,
    name: s.name,
    domain: s.custom_domain || s.ssl_url || s.url,
    provider: "netlify" as const,
    status: "active" as const,
  }));
}

async function fetchSitesRaw(token: string): Promise<NetlifySite[]> {
  const res = await fetch(`${BASE}/sites`, { headers: headers(token), cache: "no-store" });
  if (!res.ok) return [];
  return (await res.json()) as NetlifySite[];
}

interface NetlifyDeploy {
  id: string;
  site_id: string;
  name?: string;
  state: string;
  branch?: string;
  title?: string;
  commit_ref?: string;
  deploy_time?: number;
  created_at: string;
  deploy_url?: string;
  ssl_url?: string;
  url?: string;
  context?: string;
}

function mapNetlifyState(state: string): DeployStatus {
  switch (state) {
    case "ready":
      return "ready";
    case "building":
    case "enqueued":
    case "processing":
    case "uploading":
    case "preparing":
      return "building";
    case "error":
      return "error";
    case "canceled":
    case "cancelled":
      return "cancelled";
    default:
      return "building";
  }
}

function mapNetlifyContext(context: string | undefined): DeployContext {
  if (context === "production") return "production";
  if (context === "deploy-preview") return "preview";
  return "branch";
}

export async function fetchNetlifyDeploys(token: string, limit = 10): Promise<DeploymentData[]> {
  const res = await fetch(`${BASE}/deploys?per_page=${limit}`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`netlify deploys ${res.status}`);
  const deploys = (await res.json()) as NetlifyDeploy[];
  return deploys.map((d) => ({
    id: d.id,
    project: d.name ?? "",
    status: mapNetlifyState(d.state),
    branch: d.branch ?? "",
    commitMessage: d.title ?? "",
    duration: d.deploy_time ?? 0,
    createdAt: d.created_at,
    url: d.deploy_url ?? d.ssl_url ?? d.url ?? "",
    provider: "netlify" as const,
    context: mapNetlifyContext(d.context),
  }));
}

export async function fetchNetlifyBuildMinutesMonthly(token: string): Promise<number> {
  const res = await fetch(`${BASE}/deploys?per_page=100`, {
    headers: headers(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`netlify deploys ${res.status}`);
  const deploys = (await res.json()) as NetlifyDeploy[];
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const totalSeconds = deploys.reduce((acc, d) => {
    if (!d.deploy_time || !d.created_at) return acc;
    const created = new Date(d.created_at);
    if (created.getUTCFullYear() === year && created.getUTCMonth() === month) {
      return acc + d.deploy_time;
    }
    return acc;
  }, 0);
  return Math.round(totalSeconds / 60);
}

interface NetlifyForm {
  id: string;
  name: string;
  site_id: string;
  submission_count?: number;
  paths?: string[];
}

interface NetlifySubmission {
  id: string;
  state?: string;
}

export async function fetchNetlifyForms(token: string): Promise<NetlifyFormData[]> {
  const sites = await fetchSitesRaw(token);
  const siteNameById = new Map(sites.map((s) => [s.id, s.name]));
  const res = await fetch(`${BASE}/forms`, { headers: headers(token), cache: "no-store" });
  if (!res.ok) return [];
  const forms = (await res.json()) as NetlifyForm[];

  const withUnread = await Promise.all(
    forms.map(async (f) => {
      let unreadCount = 0;
      try {
        const subsRes = await fetch(
          `${BASE}/forms/${f.id}/submissions?per_page=100`,
          { headers: headers(token), cache: "no-store" },
        );
        if (subsRes.ok) {
          const subs = (await subsRes.json()) as NetlifySubmission[];
          unreadCount = subs.filter((s) => s.state !== "spam" && s.state !== "verified").length;
        }
      } catch {
        // ignore
      }
      return {
        siteName: siteNameById.get(f.site_id) ?? "",
        formId: f.id,
        formName: f.name,
        submissionsCount: f.submission_count ?? 0,
        unreadCount,
      };
    }),
  );
  return withUnread;
}

interface NetlifyFunction {
  n: string;
  d?: string;
  s?: string;
  a?: string;
}

export async function fetchNetlifyFunctions(token: string): Promise<NetlifyFunctionData[]> {
  const sites = await fetchSitesRaw(token);
  const results: NetlifyFunctionData[] = [];
  await Promise.all(
    sites.map(async (s) => {
      try {
        const res = await fetch(`${BASE}/sites/${s.id}/functions`, {
          headers: headers(token),
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as { functions?: NetlifyFunction[] };
        for (const fn of json.functions ?? []) {
          results.push({
            siteName: s.name,
            name: fn.n,
            runtime: fn.a,
          });
        }
      } catch {
        // ignore
      }
    }),
  );
  return results;
}

interface NetlifyAccountRaw {
  id: string;
  name: string;
  slug: string;
  type_name?: string;
  billing_period?: string;
}

export async function fetchNetlifyAccount(token: string): Promise<NetlifyAccountInfo> {
  try {
    const res = await fetch(`${BASE}/accounts`, { headers: headers(token), cache: "no-store" });
    if (!res.ok) return { available: false };
    const accounts = (await res.json()) as NetlifyAccountRaw[];
    const first = accounts[0];
    if (!first) return { available: false };
    return {
      available: true,
      slug: first.slug,
      name: first.name,
      type: first.type_name,
      billingPeriod: first.billing_period,
    };
  } catch {
    return { available: false };
  }
}

export async function fetchNetlifyBandwidth(token: string): Promise<NetlifyBandwidthData> {
  try {
    const meRes = await fetch(`${BASE}/user`, { headers: headers(token), cache: "no-store" });
    if (!meRes.ok) return { available: false };
    const me = (await meRes.json()) as { preferred_account_id?: string };

    if (!me.preferred_account_id) {
      const accountsRes = await fetch(`${BASE}/accounts`, { headers: headers(token), cache: "no-store" });
      if (!accountsRes.ok) return { available: false };
      const accounts = (await accountsRes.json()) as { slug: string }[];
      if (accounts.length === 0) return { available: false };
      const slug = accounts[0].slug;
      const res = await fetch(`${BASE}/accounts/${slug}/bandwidth`, {
        headers: headers(token),
        cache: "no-store",
      });
      if (!res.ok) return { available: false };
      const b = (await res.json()) as { used?: number; included?: number };
      return { available: true, used: b.used, included: b.included, unit: "bytes" };
    }
    const res = await fetch(`${BASE}/accounts/${me.preferred_account_id}/bandwidth`, {
      headers: headers(token),
      cache: "no-store",
    });
    if (!res.ok) return { available: false };
    const b = (await res.json()) as { used?: number; included?: number };
    return { available: true, used: b.used, included: b.included, unit: "bytes" };
  } catch {
    return { available: false };
  }
}
