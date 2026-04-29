import { cache } from "react";
import { sql } from "@vercel/postgres";
import { decrypt, encrypt } from "./encryption";

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
