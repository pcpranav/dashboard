"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StepIndicator } from "./StepIndicator";

type Service = "vercel" | "netlify" | "supabase";

const STEPS: { service: Service; title: string; description: string; helpUrl: string }[] = [
  {
    service: "vercel",
    title: "Connect Vercel",
    description: "Paste a Vercel API token with read access to your team or personal account.",
    helpUrl: "https://vercel.com/account/tokens",
  },
  {
    service: "netlify",
    title: "Connect Netlify",
    description: "Paste a Netlify personal access token.",
    helpUrl: "https://app.netlify.com/user/applications#personal-access-tokens",
  },
  {
    service: "supabase",
    title: "Connect Supabase",
    description: "Paste a Supabase Management API access token.",
    helpUrl: "https://supabase.com/dashboard/account/tokens",
  },
];

export function TokenForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const current = STEPS[step - 1];

  async function save(service: Service, value: string): Promise<boolean> {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, token: value }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({ error: "unknown" }))) as { error?: string };
        setError(j.error === "invalid token" ? "Invalid token. Check and try again." : "Failed to save token.");
        return false;
      }
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  async function onSave() {
    if (!token.trim()) return;
    const ok = await save(current.service, token.trim());
    if (!ok) return;
    advance();
  }

  function advance() {
    setToken("");
    setError(null);
    if (step >= STEPS.length) {
      router.push("/dashboard");
    } else {
      setStep(step + 1);
    }
  }

  function onSkip() {
    advance();
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-5">
        <StepIndicator
          step={step}
          total={STEPS.length}
          labels={STEPS.map((s) => s.service)}
        />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <CardTitle className="text-xl">{current.title}</CardTitle>
          <CardDescription className="text-sm">{current.description}</CardDescription>
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder={`Paste your ${current.service} token`}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoFocus
          />
          <a
            href={current.helpUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted underline decoration-dotted underline-offset-4 transition-colors hover:text-violet"
          >
            Where do I get this?
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1H9V7M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </a>
        </div>
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={onSave} disabled={submitting || !token.trim()} className="flex-1">
            {submitting ? "Validating…" : step === STEPS.length ? "Finish setup" : "Save & continue"}
          </Button>
          <Button variant="ghost" onClick={onSkip} disabled={submitting}>
            Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
