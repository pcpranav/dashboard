import { auth } from "@/lib/auth";
import { getSlackWebhookUrl } from "@/lib/db";
import { sendSlackAlert } from "@/lib/alerts/channels/slack";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const url = await getSlackWebhookUrl(session.user.id);
  if (!url) {
    return Response.json({ error: "No webhook configured" }, { status: 400 });
  }

  try {
    await sendSlackAlert(url, { newIssues: [], resolvedIssues: [], isTest: true });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
