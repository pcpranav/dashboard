"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const GITHUB_URL = "https://github.com/pcpranav/dashboard";
const GARAGE_URL = "https://pranavs-garage.vercel.app/";
const FEEDBACK_EMAIL = "pcpranavchandra+devpulse@gmail.com";

export default function AboutPage() {
  const [feedback, setFeedback] = useState("");

  const submitAsIssue = () => {
    const body = feedback.trim();
    if (!body) return;
    const url = `${GITHUB_URL}/issues/new?title=${encodeURIComponent("Feedback")}&body=${encodeURIComponent(body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submitByEmail = () => {
    const body = feedback.trim();
    if (!body) return;
    const url = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent("DevPulse feedback")}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  return (
    <div>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center">
            <Logo size={26} withWordmark />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M6 2L3 5L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-16 md:py-24">
        <section className="mb-16">
          <p className="mono mb-3 text-[10px] uppercase tracking-[0.18em] text-muted">About</p>
          <h1 className="mb-5 text-3xl font-semibold tracking-tight text-fg md:text-4xl">
            DevPulse is built by a backend engineer who ships side projects.
          </h1>
          <p className="mb-7 text-[15px] leading-relaxed text-muted">
            Senior Software Engineer (Backend). Building scalable APIs, AI/LLM-powered products,
            and event-driven systems. Writing about backend, AI orchestration, and shipping
            side projects.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm">View on GitHub</Button>
            </a>
            <a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted transition-colors hover:text-fg"
            >
              Browse issues →
            </a>
            <a
              href={GARAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mono inline-flex h-8 items-center gap-1.5 bg-[#F59E0B] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0a0a0a] transition-colors hover:bg-[#fbbf24]"
            >
              Visit the Garage →
            </a>
          </div>
        </section>

        <section className="border-t border-border pt-12">
          <h2 className="mb-2 text-lg font-semibold text-fg">Report a bug or share feedback</h2>
          <p className="mb-5 text-sm text-muted">
            DevPulse is open source. Tell me what&apos;s broken, what&apos;s missing,
            or what you&apos;d want next — pick whichever channel is easier.
          </p>
          <textarea
            className="mb-3 block w-full resize-y rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-muted-soft focus:border-border-strong focus:outline-none"
            placeholder="What's on your mind? Describe the bug or the idea…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={6}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={submitAsIssue} disabled={!feedback.trim()}>
              Open as GitHub issue
            </Button>
            <Button size="sm" variant="ghost" onClick={submitByEmail} disabled={!feedback.trim()}>
              Or send by email
            </Button>
            <span className="text-xs text-muted-soft">
              GitHub issue opens in a new tab; email opens your mail client.
            </span>
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-4 pt-2 md:flex-row">
          <div className="flex items-center gap-3">
            <Logo size={20} withWordmark />
          </div>
          <div className="text-[11px] mono text-muted-soft">© 2026 DevPulse</div>
        </div>
      </footer>
    </div>
  );
}
