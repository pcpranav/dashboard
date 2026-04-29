"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ALERT_CATEGORIES,
  ALERT_CATEGORY_LABELS,
  type AlertCategory,
} from "@/lib/alerts/rules";

interface Initial {
  slackConfigured: boolean;
  enabledCategories: AlertCategory[];
}

export function AlertPrefsForm({ initial }: { initial: Initial }) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [configured, setConfigured] = useState(initial.slackConfigured);
  const [categories, setCategories] = useState<AlertCategory[]>(initial.enabledCategories);
  const [savingUrl, setSavingUrl] = useState(false);
  const [savingCats, setSavingCats] = useState(false);
  const [testing, setTesting] = useState(false);
  const [urlMsg, setUrlMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [catMsg, setCatMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function saveWebhook() {
    setSavingUrl(true);
    setUrlMsg(null);
    try {
      const res = await fetch("/api/settings/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slackWebhookUrl: webhookUrl.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setUrlMsg({ type: "err", text: j.error ?? `Save failed (${res.status})` });
        return;
      }
      setConfigured(Boolean(webhookUrl.trim()));
      setWebhookUrl("");
      setUrlMsg({ type: "ok", text: webhookUrl.trim() ? "Webhook saved." : "Webhook cleared." });
    } finally {
      setSavingUrl(false);
    }
  }

  async function saveCategories() {
    setSavingCats(true);
    setCatMsg(null);
    try {
      const res = await fetch("/api/settings/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabledCategories: categories }),
      });
      if (!res.ok) {
        setCatMsg({ type: "err", text: `Save failed (${res.status})` });
        return;
      }
      setCatMsg({ type: "ok", text: "Categories saved." });
    } finally {
      setSavingCats(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setUrlMsg(null);
    try {
      const res = await fetch("/api/settings/alerts/test", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setUrlMsg({ type: "err", text: j.error ?? `Test failed (${res.status})` });
        return;
      }
      setUrlMsg({ type: "ok", text: "Test alert sent. Check your Slack channel." });
    } finally {
      setTesting(false);
    }
  }

  function toggleCategory(c: AlertCategory) {
    setCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  return (
    <div className="space-y-8">
      <section className="border border-border bg-surface p-6">
        <div className="mono text-[9px] uppercase tracking-[0.15em] text-muted-soft">
          Slack webhook url
        </div>
        <div className="mt-3 space-y-3">
          <Input
            type="url"
            placeholder={
              configured
                ? "✓ Configured. Paste a new URL to replace, or clear and save to remove."
                : "https://hooks.slack.com/services/T0…"
            }
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
          />
          <a
            href="https://api.slack.com/messaging/webhooks"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted underline decoration-dotted underline-offset-4 hover:text-fg"
          >
            How to create a Slack incoming webhook →
          </a>
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={saveWebhook} disabled={savingUrl}>
              {savingUrl ? "Saving…" : "Save webhook URL"}
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={testing || !configured}>
              {testing ? "Sending…" : "Send test alert"}
            </Button>
          </div>
          {urlMsg && (
            <div
              className={
                urlMsg.type === "ok"
                  ? "border border-success/30 bg-success/10 px-3 py-2 text-[12px] text-success"
                  : "border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger"
              }
            >
              {urlMsg.text}
            </div>
          )}
        </div>
      </section>

      <section className="border border-border bg-surface p-6">
        <div className="mono text-[9px] uppercase tracking-[0.15em] text-muted-soft">
          Categories
        </div>
        <ul className="mt-4 space-y-2.5">
          {ALERT_CATEGORIES.map((c) => (
            <li key={c} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                id={`cat-${c}`}
                checked={categories.includes(c)}
                onChange={() => toggleCategory(c)}
                className="h-4 w-4 accent-brand"
              />
              <label htmlFor={`cat-${c}`} className="cursor-pointer text-[13px] text-fg">
                {ALERT_CATEGORY_LABELS[c]}
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={saveCategories} disabled={savingCats}>
            {savingCats ? "Saving…" : "Save categories"}
          </Button>
        </div>
        {catMsg && (
          <div
            className={
              catMsg.type === "ok"
                ? "mt-3 border border-success/30 bg-success/10 px-3 py-2 text-[12px] text-success"
                : "mt-3 border border-danger/30 bg-danger-soft px-3 py-2 text-[12px] text-danger"
            }
          >
            {catMsg.text}
          </div>
        )}
      </section>
    </div>
  );
}
