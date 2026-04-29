import { evaluateAndDispatch } from "@/lib/alerts/check";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel hobby max is 10s; pro is 60s. Keep at 60.

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
