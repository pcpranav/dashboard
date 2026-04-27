import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDecryptedTokens } from "@/lib/db";
import { fetchNetlifyFunctions } from "@/lib/fetchers/netlify";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { netlify } = await getDecryptedTokens(session.user.id);
  if (!netlify) return NextResponse.json({ error: "not_connected" }, { status: 400 });

  try {
    const functions = await fetchNetlifyFunctions(netlify);
    return NextResponse.json(functions);
  } catch {
    return NextResponse.json({ error: "netlify_fetch_failed" }, { status: 502 });
  }
}
