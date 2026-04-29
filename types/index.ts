export type Provider = "vercel" | "netlify" | "supabase";

export type DeployStatus = "ready" | "building" | "error" | "cancelled";

export type DeployContext = "production" | "preview" | "branch";

export interface DeploymentData {
  id: string;
  project: string;
  status: DeployStatus;
  branch: string;
  commitMessage: string;
  duration: number;
  createdAt: string;
  url: string;
  provider: "vercel" | "netlify";
  context?: DeployContext;
}

export interface ProjectData {
  id: string;
  name: string;
  domain: string;
  provider: Provider;
  region?: string;
  status?: "active" | "paused" | "inactive";
  rawStatus?: string;
  createdAt?: string;
}

export interface UsageData {
  service: Provider;
  metric: string;
  current: number;
  limit: number;
  unit: string;
}

export type ActivityType =
  | "deploy_success"
  | "deploy_fail"
  | "deploy_building"
  | "user_signup"
  | "error";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  message: string;
  service: Provider;
  timestamp: string;
}

export interface ConnectedServices {
  vercel: boolean;
  netlify: boolean;
  supabase: boolean;
}

export interface DomainData {
  name: string;
  expiresAt?: string | null;
  boughtAt?: string | null;
  verified: boolean;
  provider: Provider;
}

export interface VercelUsageData {
  available: boolean;
  bandwidthBytes?: number;
  bandwidthLimitBytes?: number;
  buildMinutes?: number;
  buildMinutesLimit?: number;
  functionInvocations?: number;
  functionInvocationsLimit?: number;
}

export interface VercelResponse {
  deployments: DeploymentData[];
  domains: DomainData[];
  usage: VercelUsageData;
}

export interface NetlifyFormData {
  siteName: string;
  formId: string;
  formName: string;
  submissionsCount: number;
  unreadCount: number;
}

export interface NetlifyFunctionData {
  siteName: string;
  name: string;
  runtime?: string;
}

export interface NetlifyBandwidthData {
  available: boolean;
  used?: number;
  included?: number;
  unit?: string;
}

export interface NetlifyResponse {
  deploys: DeploymentData[];
  buildMinutes: number;
  forms: NetlifyFormData[];
  functions: NetlifyFunctionData[];
  bandwidth: NetlifyBandwidthData;
}

export interface SupabaseProjectUsage {
  projectRef: string;
  projectName: string;
  available: boolean;
  dbSizeBytes?: number;
  dbSizeLimitBytes?: number;
  connections?: number;
  connectionsLimit?: number;
  apiRequests?: number;
  apiRequestsLimit?: number;
  authUsers?: number;
  paused?: boolean;
}

export type SupabaseServiceName = "auth" | "db" | "rest" | "realtime" | "storage";

export interface SupabaseServiceHealth {
  name: SupabaseServiceName | string;
  healthy: boolean;
  status?: string;
}

export interface SupabaseProjectHealth {
  projectRef: string;
  available: boolean;
  services: SupabaseServiceHealth[];
}

export interface SupabaseFunctionData {
  projectRef: string;
  slug: string;
  name: string;
  status?: string;
  updatedAt?: string;
}

export interface SupabaseBucketData {
  projectRef: string;
  name: string;
  public: boolean;
  createdAt?: string;
}

export interface SupabaseBranchData {
  projectRef: string;
  name: string;
  gitBranch?: string;
  status?: string;
  createdAt?: string;
}

export interface SupabaseProjectExtras {
  projectRef: string;
  postgresVersion?: string;
  pitrEnabled?: boolean;
  pitrRetentionDays?: number;
  networkRestrictionsEnabled?: boolean;
  readReplicas?: number;
}

export interface SupabaseResponse {
  projects: ProjectData[];
  usage: SupabaseProjectUsage[];
  health: SupabaseProjectHealth[];
  functions: SupabaseFunctionData[];
  buckets: SupabaseBucketData[];
  branches: SupabaseBranchData[];
  extras: SupabaseProjectExtras[];
}

export interface VercelTeam {
  id: string;
  name: string;
  slug: string;
}

export interface NetlifyAccountInfo {
  available: boolean;
  slug?: string;
  name?: string;
  type?: string;
  billingPeriod?: string;
}

export interface LogLine {
  ts: number | null;
  level: "info" | "warn" | "error";
  text: string;
}
