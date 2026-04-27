import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  deleteAllTokens,
  getTokensRow,
  initSchema,
  saveSupabaseProjectRefs,
  saveToken,
  upsertUser,
} from "@/lib/db";
import { validateNetlifyToken } from "@/lib/fetchers/netlify";
import { validateSupabaseToken, fetchSupabaseProjects } from "@/lib/fetchers/supabase";
import { validateVercelToken } from "@/lib/fetchers/vercel";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await initSchema();
  } catch {
    // ignore
  }

  const row = await getTokensRow(session.user.id);
  return NextResponse.json({
    vercel: Boolean(row?.vercel_token),
    netlify: Boolean(row?.netlify_token),
    supabase: Boolean(row?.supabase_token),
  });
}

interface PostBody {
  service?: "vercel" | "netlify" | "supabase";
  token?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await initSchema();

  const body = (await req.json()) as PostBody;
  const { service, token } = body;
  if (!service || !token) {
    return NextResponse.json({ error: "missing service or token" }, { status: 400 });
  }

  let ok = false;
  if (service === "vercel") ok = await validateVercelToken(token);
  else if (service === "netlify") ok = await validateNetlifyToken(token);
  else if (service === "supabase") ok = await validateSupabaseToken(token);

  if (!ok) return NextResponse.json({ error: "invalid token" }, { status: 400 });

  let userId = session.user.id;
  if (session.user.email) {
    userId = await upsertUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
      image: session.user.image ?? null,
    });
  }
  await saveToken(userId, service, token);

  if (service === "supabase") {
    try {
      const projects = await fetchSupabaseProjects(token);
      await saveSupabaseProjectRefs(
        userId,
        projects.map((p) => p.ref),
      );
    } catch {
      // non-fatal: refs can be rebuilt later
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await deleteAllTokens(session.user.id);
  return NextResponse.json({ ok: true });
}
