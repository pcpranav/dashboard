import {
  clearAlertResolved,
  getActiveAlerts,
  getDecryptedTokens,
  getSlackWebhookUrl,
  initSchema,
  listUsersWithAlerting,
  recordAlertSent,
} from "@/lib/db";
import { sendSlackAlert } from "@/lib/alerts/channels/slack";
import { buildIssues, type AlertCategory, type Issue } from "@/lib/alerts/rules";
import { fetchVercelDeployments, fetchVercelDomains, fetchVercelUsage } from "@/lib/fetchers/vercel";
import {
  fetchNetlifyBandwidth,
  fetchNetlifyBuildMinutesMonthly,
  fetchNetlifyDeploys,
} from "@/lib/fetchers/netlify";
import type { NetlifyResponse } from "@/types";
import { fetchSupabaseAll } from "@/lib/fetchers/supabase";

const CUTOFF_24H_MS = 24 * 60 * 60 * 1000;

interface UserAlertingState {
  userId: string;
  enabledCategories: AlertCategory[];
}

async function evaluateUser(state: UserAlertingState): Promise<{ sent: boolean; error?: string }> {
  const tokens = await getDecryptedTokens(state.userId);

  // Best-effort fetch all required data
  const [vercelDeploys, vercelDomains, vercelUsage, netlify, netlifyBw, supabase] =
    await Promise.all([
      tokens.vercel
        ? fetchVercelDeployments(tokens.vercel).catch(() => undefined)
        : Promise.resolve(undefined),
      tokens.vercel
        ? fetchVercelDomains(tokens.vercel).catch(() => undefined)
        : Promise.resolve(undefined),
      tokens.vercel
        ? fetchVercelUsage(tokens.vercel).catch(() => undefined)
        : Promise.resolve(undefined),
      // buildIssues expects a NetlifyResponse shape (deploys + buildMinutes).
      // Assemble it from the individual fetchers; forms/functions/bandwidth
      // are not read by buildIssues so we provide empty defaults.
      tokens.netlify
        ? Promise.all([
            fetchNetlifyDeploys(tokens.netlify).catch(() => []),
            fetchNetlifyBuildMinutesMonthly(tokens.netlify).catch(() => 0),
          ])
            .then(
              ([deploys, buildMinutes]): NetlifyResponse => ({
                deploys,
                buildMinutes,
                forms: [],
                functions: [],
                bandwidth: { available: false },
              }),
            )
            .catch(() => undefined)
        : Promise.resolve(undefined),
      tokens.netlify
        ? fetchNetlifyBandwidth(tokens.netlify).catch(() => undefined)
        : Promise.resolve(undefined),
      tokens.supabase
        ? fetchSupabaseAll(tokens.supabase).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

  const currentIssues: Issue[] = buildIssues({
    vercelDeploys,
    vercelDomains,
    vercelUsage,
    netlify,
    netlifyBw,
    supabase,
    cutoffMs: CUTOFF_24H_MS,
  }).filter((i) => state.enabledCategories.includes(i.category));

  const priorActive = await getActiveAlerts(state.userId);
  const priorIds = new Set(priorActive.map((p) => p.issueId));
  const currentIds = new Set(currentIssues.map((i) => i.id));

  const newIssues = currentIssues.filter((i) => !priorIds.has(i.id));
  const resolvedIds = priorActive.filter((p) => !currentIds.has(p.issueId));

  // Build resolved label list — we only have IDs from prior, so display the issue ID.
  // Acceptable for v1; store labels in sent_alerts in v2.
  const resolvedIssues: Issue[] = resolvedIds.map((p) => ({
    id: p.issueId,
    severity: "warning" as const,
    label: `Resolved: ${p.issueId}`,
    category: "failed_deploys" as const, // placeholder; not used by sender
  }));

  if (newIssues.length === 0 && resolvedIssues.length === 0) {
    return { sent: false };
  }

  const webhookUrl = await getSlackWebhookUrl(state.userId);
  if (!webhookUrl) return { sent: false };

  try {
    await sendSlackAlert(webhookUrl, { newIssues, resolvedIssues });
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }

  for (const i of newIssues) {
    await recordAlertSent(state.userId, i.id, i.severity);
  }
  for (const r of resolvedIssues) {
    await clearAlertResolved(state.userId, r.id);
  }

  return { sent: true };
}

export async function evaluateAndDispatch(): Promise<{
  usersChecked: number;
  alertsSent: number;
  errors: number;
}> {
  await initSchema();
  const users = await listUsersWithAlerting();
  let alertsSent = 0;
  let errors = 0;

  for (const u of users) {
    try {
      const r = await evaluateUser(u);
      if (r.sent) alertsSent += 1;
      if (r.error) {
        console.warn(`[alerts] user ${u.userId} send failed:`, r.error);
        errors += 1;
      }
    } catch (err) {
      console.warn(`[alerts] user ${u.userId} failed:`, (err as Error).message);
      errors += 1;
    }
  }

  return { usersChecked: users.length, alertsSent, errors };
}
