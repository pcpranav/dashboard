import { evaluateAndDispatch } from "@/lib/alerts/check";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel hobby max is 10s; pro is 60s. Keep at 60.

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response("Misconfigured", { status: 500 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Forbidden", { status: 403 });
  }
  try {
    const result = await evaluateAndDispatch();
    return Response.json(result);
  } catch (err) {
    console.error("[cron/check-alerts]", err);
    return new Response("Internal Error", { status: 500 });
  }
}
