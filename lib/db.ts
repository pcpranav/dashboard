import { cache } from "react";
import { sql } from "@vercel/postgres";
import { decrypt, encrypt } from "./encryption";
import type { AlertCategory } from "./alerts/rules";

let schemaInitialized = false;

export interface UserTokensRow {
  user_id: string;
  vercel_token: string | null;
  netlify_token: string | null;
  supabase_token: string | null;
  supabase_project_refs: string | null;
  updated_at: Date;
}

export async function initSchema(): Promise<void> {
  if (schemaInitialized) return;
  await sql`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    image TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );`;
  await sql`CREATE TABLE IF NOT EXISTS user_tokens (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    vercel_token TEXT,
    netlify_token TEXT,
    supabase_token TEXT,
    supabase_project_refs TEXT,
    updated_at TIMESTAMP DEFAULT NOW()
  );`;
  await sql`CREATE TABLE IF NOT EXISTS project_links (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    frontend_provider TEXT NOT NULL CHECK (frontend_provider IN ('vercel','netlify')),
    frontend_project_name TEXT NOT NULL,
    supabase_project_ref TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, frontend_provider, frontend_project_name, supabase_project_ref)
  );`;
  await sql`
    CREATE TABLE IF NOT EXISTS user_alert_prefs (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      slack_webhook_url TEXT,
      enabled_categories TEXT NOT NULL DEFAULT '["failed_deploys","expiring_domains","quota_warning","supabase_paused","supabase_unhealthy","supabase_db_full"]',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sent_alerts (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issue_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, issue_id, severity)
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_sent_alerts_user_issue ON sent_alerts (user_id, issue_id)
  `;
  schemaInitialized = true;
}

export async function upsertUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<string> {
  const existing = await sql<{ id: string }>`
    SELECT id FROM users WHERE email = ${user.email} LIMIT 1;
  `;
  if (existing.rows[0]) {
    const id = existing.rows[0].id;
    await sql`
      UPDATE users
      SET name = ${user.name ?? null}, image = ${user.image ?? null}
      WHERE id = ${id};
    `;
    return id;
  }
  await sql`
    INSERT INTO users (id, email, name, image)
    VALUES (${user.id}, ${user.email}, ${user.name ?? null}, ${user.image ?? null});
  `;
  return user.id;
}

export async function getTokensRow(userId: string): Promise<UserTokensRow | null> {
  const { rows } = await sql<UserTokensRow>`
    SELECT user_id, vercel_token, netlify_token, supabase_token, supabase_project_refs, updated_at
    FROM user_tokens WHERE user_id = ${userId} LIMIT 1;
  `;
  return rows[0] ?? null;
}

export interface DecryptedTokens {
  vercel: string | null;
  netlify: string | null;
  supabase: string | null;
  supabaseProjectRefs: string[];
}

export const getDecryptedTokens = cache(async (userId: string): Promise<DecryptedTokens> => {
  const row = await getTokensRow(userId);
  if (!row) return { vercel: null, netlify: null, supabase: null, supabaseProjectRefs: [] };
  return {
    vercel: row.vercel_token ? decrypt(row.vercel_token) : null,
    netlify: row.netlify_token ? decrypt(row.netlify_token) : null,
    supabase: row.supabase_token ? decrypt(row.supabase_token) : null,
    supabaseProjectRefs: row.supabase_project_refs ? JSON.parse(row.supabase_project_refs) : [],
  };
});

export async function saveToken(
  userId: string,
  service: "vercel" | "netlify" | "supabase",
  token: string,
): Promise<void> {
  const encrypted = encrypt(token);
  if (service === "vercel") {
    await sql`
      INSERT INTO user_tokens (user_id, vercel_token, updated_at)
      VALUES (${userId}, ${encrypted}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET vercel_token = EXCLUDED.vercel_token, updated_at = NOW();
    `;
  } else if (service === "netlify") {
    await sql`
      INSERT INTO user_tokens (user_id, netlify_token, updated_at)
      VALUES (${userId}, ${encrypted}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET netlify_token = EXCLUDED.netlify_token, updated_at = NOW();
    `;
  } else {
    await sql`
      INSERT INTO user_tokens (user_id, supabase_token, updated_at)
      VALUES (${userId}, ${encrypted}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET supabase_token = EXCLUDED.supabase_token, updated_at = NOW();
    `;
  }
}

export async function saveSupabaseProjectRefs(userId: string, refs: string[]): Promise<void> {
  const json = JSON.stringify(refs);
  await sql`
    INSERT INTO user_tokens (user_id, supabase_project_refs, updated_at)
    VALUES (${userId}, ${json}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET supabase_project_refs = EXCLUDED.supabase_project_refs, updated_at = NOW();
  `;
}

export async function deleteAllTokens(userId: string): Promise<void> {
  await sql`DELETE FROM user_tokens WHERE user_id = ${userId};`;
}

export interface ProjectLinkRow {
  id: number;
  frontend_provider: "vercel" | "netlify";
  frontend_project_name: string;
  supabase_project_ref: string;
  created_at: Date;
}

export async function listLinks(userId: string): Promise<ProjectLinkRow[]> {
  const { rows } = await sql<ProjectLinkRow>`
    SELECT id, frontend_provider, frontend_project_name, supabase_project_ref, created_at
    FROM project_links
    WHERE user_id = ${userId}
    ORDER BY created_at DESC;
  `;
  return rows;
}

export async function createLink(
  userId: string,
  frontendProvider: "vercel" | "netlify",
  frontendProjectName: string,
  supabaseProjectRef: string,
): Promise<void> {
  await sql`
    INSERT INTO project_links (user_id, frontend_provider, frontend_project_name, supabase_project_ref)
    VALUES (${userId}, ${frontendProvider}, ${frontendProjectName}, ${supabaseProjectRef})
    ON CONFLICT (user_id, frontend_provider, frontend_project_name, supabase_project_ref) DO NOTHING;
  `;
}

export async function deleteLink(userId: string, id: number): Promise<void> {
  await sql`DELETE FROM project_links WHERE id = ${id} AND user_id = ${userId};`;
}

export async function getAlertPrefs(userId: string): Promise<{
  slackConfigured: boolean;
  enabledCategories: AlertCategory[];
} | null> {
  const { rows } = await sql<{
    slack_webhook_url: string | null;
    enabled_categories: string;
  }>`
    SELECT slack_webhook_url, enabled_categories FROM user_alert_prefs WHERE user_id = ${userId}
  `;
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    slackConfigured: Boolean(r.slack_webhook_url),
    enabledCategories: JSON.parse(r.enabled_categories),
  };
}

export async function getSlackWebhookUrl(userId: string): Promise<string | null> {
  const { rows } = await sql<{ slack_webhook_url: string | null }>`
    SELECT slack_webhook_url FROM user_alert_prefs WHERE user_id = ${userId}
  `;
  if (rows.length === 0 || !rows[0].slack_webhook_url) return null;
  try {
    return decrypt(rows[0].slack_webhook_url);
  } catch {
    return null;
  }
}

export async function saveAlertPrefs(
  userId: string,
  prefs: { slackWebhookUrl?: string | null; enabledCategories?: AlertCategory[] },
): Promise<void> {
  const encryptedUrl =
    prefs.slackWebhookUrl === undefined
      ? undefined
      : prefs.slackWebhookUrl === null
        ? null
        : encrypt(prefs.slackWebhookUrl);
  const categoriesJson =
    prefs.enabledCategories === undefined ? undefined : JSON.stringify(prefs.enabledCategories);

  if (encryptedUrl !== undefined && categoriesJson !== undefined) {
    await sql`
      INSERT INTO user_alert_prefs (user_id, slack_webhook_url, enabled_categories, updated_at)
      VALUES (${userId}, ${encryptedUrl}, ${categoriesJson}, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET slack_webhook_url = EXCLUDED.slack_webhook_url,
          enabled_categories = EXCLUDED.enabled_categories,
          updated_at = NOW()
    `;
  } else if (encryptedUrl !== undefined) {
    await sql`
      INSERT INTO user_alert_prefs (user_id, slack_webhook_url, updated_at)
      VALUES (${userId}, ${encryptedUrl}, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET slack_webhook_url = EXCLUDED.slack_webhook_url,
          updated_at = NOW()
    `;
  } else if (categoriesJson !== undefined) {
    await sql`
      INSERT INTO user_alert_prefs (user_id, enabled_categories, updated_at)
      VALUES (${userId}, ${categoriesJson}, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET enabled_categories = EXCLUDED.enabled_categories,
          updated_at = NOW()
    `;
  }
}

export async function listUsersWithAlerting(): Promise<
  Array<{ userId: string; enabledCategories: AlertCategory[] }>
> {
  const { rows } = await sql<{ user_id: string; enabled_categories: string }>`
    SELECT user_id, enabled_categories FROM user_alert_prefs WHERE slack_webhook_url IS NOT NULL
  `;
  return rows.map((r) => ({
    userId: r.user_id,
    enabledCategories: JSON.parse(r.enabled_categories),
  }));
}

export async function getActiveAlerts(
  userId: string,
): Promise<Array<{ issueId: string; severity: string }>> {
  const { rows } = await sql<{ issue_id: string; severity: string }>`
    SELECT issue_id, severity FROM sent_alerts WHERE user_id = ${userId} AND severity != 'resolved'
  `;
  return rows.map((r) => ({ issueId: r.issue_id, severity: r.severity }));
}

export async function recordAlertSent(
  userId: string,
  issueId: string,
  severity: string,
): Promise<void> {
  await sql`
    INSERT INTO sent_alerts (user_id, issue_id, severity)
    VALUES (${userId}, ${issueId}, ${severity})
    ON CONFLICT (user_id, issue_id, severity) DO NOTHING
  `;
}

export async function clearAlertResolved(userId: string, issueId: string): Promise<void> {
  await sql`
    DELETE FROM sent_alerts WHERE user_id = ${userId} AND issue_id = ${issueId} AND severity != 'resolved'
  `;
  await sql`
    INSERT INTO sent_alerts (user_id, issue_id, severity)
    VALUES (${userId}, ${issueId}, 'resolved')
    ON CONFLICT (user_id, issue_id, severity) DO UPDATE
    SET sent_at = NOW()
  `;
}

export async function deleteAlertPrefs(userId: string): Promise<void> {
  await sql`DELETE FROM user_alert_prefs WHERE user_id = ${userId}`;
  await sql`DELETE FROM sent_alerts WHERE user_id = ${userId}`;
}
