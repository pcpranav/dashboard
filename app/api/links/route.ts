import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createLink, deleteLink, initSchema, listLinks } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    await initSchema();
  } catch {
    // ignore
  }
  const rows = await listLinks(session.user.id);
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      frontendProvider: r.frontend_provider,
      frontendProjectName: r.frontend_project_name,
      supabaseProjectRef: r.supabase_project_ref,
      createdAt: r.created_at,
    })),
  );
}

interface PostBody {
  frontendProvider?: "vercel" | "netlify";
  frontendProjectName?: string;
  supabaseProjectRef?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await initSchema();
  const body = (await req.json()) as PostBody;
  const { frontendProvider, frontendProjectName, supabaseProjectRef } = body;
  if (
    !frontendProvider ||
    (frontendProvider !== "vercel" && frontendProvider !== "netlify") ||
    !frontendProjectName ||
    !supabaseProjectRef
  ) {
    return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
  }
  await createLink(session.user.id, frontendProvider, frontendProjectName, supabaseProjectRef);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const idRaw = searchParams.get("id");
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  await deleteLink(session.user.id, id);
  return NextResponse.json({ ok: true });
}
