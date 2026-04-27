import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDecryptedTokens } from "@/lib/db";
import { fetchVercelDeployments } from "@/lib/fetchers/vercel";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { vercel } = await getDecryptedTokens(session.user.id);
  if (!vercel) return NextResponse.json({ error: "not_connected" }, { status: 400 });

  try {
    const deployments = await fetchVercelDeployments(vercel);
    return NextResponse.json(deployments);
  } catch {
    return NextResponse.json({ error: "vercel_fetch_failed" }, { status: 502 });
  }
}
