import { auth } from "@/lib/auth";
import { getAlertPrefs } from "@/lib/db";
import { ALERT_CATEGORIES } from "@/lib/alerts/rules";
import { AlertPrefsForm } from "@/components/settings/AlertPrefsForm";

export default async function AlertsSettingsPage() {
  const session = await auth();
  // Layout already enforced auth; safe to use session.user.id here.
  if (!session?.user?.id) throw new Error("unreachable: layout enforced auth");
  const prefs = (await getAlertPrefs(session.user.id)) ?? {
    slackConfigured: false,
    enabledCategories: [...ALERT_CATEGORIES],
  };

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-[15px] font-semibold tracking-tight">Settings · Alerts</h1>
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-soft">slack channel</span>
      </div>
      <AlertPrefsForm initial={prefs} />
    </div>
  );
}
