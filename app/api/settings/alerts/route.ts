import { auth } from "@/lib/auth";
import { deleteAlertPrefs, getAlertPrefs, saveAlertPrefs } from "@/lib/db";
import { ALERT_CATEGORIES, isAlertCategory, type AlertCategory } from "@/lib/alerts/rules";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const prefs = await getAlertPrefs(session.user.id);
  return Response.json(
    prefs ?? {
      slackConfigured: false,
      enabledCategories: [...ALERT_CATEGORIES],
    },
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { slackWebhookUrl?: string | null; enabledCategories?: string[] }
    | null;
  if (!body) return new Response("Bad Request", { status: 400 });

  // Validate Slack URL if present and non-null
  if (typeof body.slackWebhookUrl === "string") {
    if (!body.slackWebhookUrl.startsWith("https://hooks.slack.com/")) {
      return Response.json({ error: "must start with https://hooks.slack.com/" }, { status: 400 });
    }
  }

  // Validate categories
  let validCategories: AlertCategory[] | undefined;
  if (Array.isArray(body.enabledCategories)) {
    validCategories = body.enabledCategories.filter(isAlertCategory);
  }

  await saveAlertPrefs(session.user.id, {
    slackWebhookUrl: body.slackWebhookUrl,
    enabledCategories: validCategories,
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });
  await deleteAlertPrefs(session.user.id);
  return Response.json({ ok: true });
}
