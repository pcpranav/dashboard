import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDecryptedTokens } from "@/lib/db";
import { fetchSupabaseAll } from "@/lib/fetchers/supabase";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { supabase } = await getDecryptedTokens(session.user.id);
  if (!supabase) return NextResponse.json({ error: "not_connected" }, { status: 400 });

  try {
    const data = await fetchSupabaseAll(supabase);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "supabase_fetch_failed" }, { status: 502 });
  }
}
