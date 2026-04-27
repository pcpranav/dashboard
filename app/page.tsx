import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { NetlifyLogo, SupabaseLogo, VercelLogo } from "@/components/ui/service-logos";

export default async function HomePage() {
  const session = await auth();
  const isAuthed = Boolean(session?.user?.id);

  return (
    <div className="relative">
      <MarketingNav isAuthed={isAuthed} />
      <Hero isAuthed={isAuthed} />
      <Features />
      <Services />
      <PrivacyStrip />
      <FooterCTA isAuthed={isAuthed} />
      <Footer />
    </div>
  );
}

function MarketingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-4 z-20 mx-auto flex w-full max-w-6xl items-center justify-between rounded-2xl glass px-5 py-3 mt-4 md:mx-auto">
      <Link href="/" className="flex items-center">
        <Logo size={26} withWordmark />
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
        <a href="#features" className="transition-colors hover:text-fg">Features</a>
        <a href="#services" className="transition-colors hover:text-fg">Services</a>
        <a href="#privacy" className="transition-colors hover:text-fg">Privacy</a>
      </nav>
      <div className="flex items-center gap-2">
        {isAuthed ? (
          <Link href="/dashboard">
            <Button size="sm">Open dashboard</Button>
          </Link>
        ) : (
          <>
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get started</Button>
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function Hero({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center md:pt-28">
      <div className="absolute inset-0 grid-lines opacity-60 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/[0.03] px-3 py-1 text-[11px] mono uppercase tracking-widest text-muted backdrop-blur-md">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald" />
          </span>
          Now live — self-hosted
        </div>
        <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
          All your deploys.<br />
          <span className="text-blue-soft">One pulse.</span>
        </h1>
        <p className="max-w-xl text-balance text-base text-muted md:text-lg">
          A single dashboard for Vercel, Netlify, and Supabase. See deploys, usage, and
          status across your stack — without tab-switching.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {isAuthed ? (
            <Link href="/dashboard">
              <Button size="lg">Open dashboard →</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button size="lg">Get started free →</Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">See features</Button>
              </a>
            </>
          )}
        </div>
        <div className="mt-4 flex items-center gap-6 text-[11px] mono uppercase tracking-widest text-muted">
          <span>Bring your own tokens</span>
          <span className="h-3 w-px bg-border" />
          <span>Read-only</span>
          <span className="h-3 w-px bg-border" />
          <span>No vendor lock-in</span>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mt-8 w-full max-w-4xl">
      <div className="glass rounded-2xl p-4 md:p-6 animate-float">
        <div className="mb-3 flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald/70" />
          <span className="ml-3 text-[10px] mono uppercase tracking-widest text-muted">
            devpulse.app / dashboard
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <PreviewMetric label="Projects" value="18" />
          <PreviewMetric label="Deploys today" value="12" />
          <PreviewMetric label="Errors 24h" value="0" />
          <PreviewMetric label="Services" value="3/3" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <PreviewCard name="Vercel" count="12" logo={<VercelLogo size={12} />} />
          <PreviewCard name="Netlify" count="4" logo={<NetlifyLogo size={12} />} />
          <PreviewCard name="Supabase" count="2" logo={<SupabaseLogo size={12} />} />
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-left">
      <div className="text-[10px] mono uppercase tracking-widest text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="text-[10px] mono text-muted">healthy</div>
    </div>
  );
}

function PreviewCard({
  name,
  count,
  logo,
}: {
  name: string;
  count: string;
  logo: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-3 text-left">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-fg">
          {logo}
          <span className="text-sm font-medium">{name}</span>
        </div>
      </div>
      <div className="mt-3 flex items-end gap-1">
        {[28, 36, 20, 44, 32, 48, 40].map((h, i) => (
          <div key={i} className="flex-1 rounded-sm bg-blue/60" style={{ height: `${h}px` }} />
        ))}
      </div>
      <div className="mt-2 text-[11px] mono text-muted">{count} recent</div>
    </div>
  );
}

function Features() {
  const items = [
    {
      title: "Unified activity",
      body: "One feed for every deploy, failure, and paused service — across all your accounts.",
      icon: <FeatureIcon1 />,
    },
    {
      title: "Usage & limits",
      body: "Track build minutes, DB size, and API calls before you hit a wall. Color-coded thresholds.",
      icon: <FeatureIcon2 />,
    },
    {
      title: "Status at a glance",
      body: "A 4-cell summary bar tells you if anything needs attention — no digging through tabs.",
      icon: <FeatureIcon3 />,
    },
  ];
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 flex flex-col items-center text-center">
        <span className="text-[11px] mono uppercase tracking-widest text-muted">
          Features
        </span>
        <h2 className="mt-2 max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Everything you need, nothing you don&apos;t.
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((f) => (
          <div key={f.title} className="glass group rounded-2xl p-6 transition-colors hover:border-border-strong">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-fg">
              {f.icon}
            </div>
            <h3 className="text-lg font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Services() {
  const services = [
    {
      name: "Vercel",
      blurb: "Deployments, build status, branches.",
      logo: <VercelLogo size={22} />,
    },
    {
      name: "Netlify",
      blurb: "Deploys & build-minute usage.",
      logo: <NetlifyLogo size={22} />,
    },
    {
      name: "Supabase",
      blurb: "DB size, connections, API calls.",
      logo: <SupabaseLogo size={22} />,
    },
  ];
  return (
    <section id="services" className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 flex flex-col items-center text-center">
        <span className="text-[11px] mono uppercase tracking-widest text-muted">
          Integrations
        </span>
        <h2 className="mt-2 max-w-2xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
          Works with your indie stack.
        </h2>
        <p className="mt-3 max-w-xl text-sm text-muted">
          Paste a read-only token for each service during setup. More integrations coming soon.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {services.map((s) => (
          <div key={s.name} className="glass group rounded-2xl p-6 transition-colors hover:border-border-strong">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.06] text-fg">
              {s.logo}
            </div>
            <div className="text-lg font-semibold tracking-tight">{s.name}</div>
            <p className="mt-1.5 text-sm text-muted leading-relaxed">{s.blurb}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PrivacyStrip() {
  const items = [
    {
      icon: <LockIcon />,
      title: "Encrypted at rest",
      body: "Tokens are AES-256 encrypted before they touch the database. The key never leaves your server.",
    },
    {
      icon: <EyeIcon />,
      title: "Read-only by design",
      body: "Scoped tokens with read access only. DevPulse can never deploy, delete, or modify anything in your accounts.",
    },
    {
      icon: <ServerIcon />,
      title: "Self-hostable",
      body: "Open the repo, point it at your Postgres, and run it anywhere. No SaaS lock-in.",
    },
  ];
  return (
    <section id="privacy" className="mx-auto max-w-6xl px-6 py-20">
      <div className="glass-strong rounded-3xl p-8 md:p-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {items.map((it) => (
            <div key={it.title}>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-fg">
                {it.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold">{it.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FooterCTA({ isAuthed }: { isAuthed: boolean }) {
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 text-center">
      <h2 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
        Ready to feel the <span className="text-blue-soft">pulse</span>?
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-sm text-muted md:text-base">
        Takes about 90 seconds to connect your first service.
      </p>
      <div className="mt-8">
        {isAuthed ? (
          <Link href="/dashboard">
            <Button size="lg">Open dashboard →</Button>
          </Link>
        ) : (
          <Link href="/login">
            <Button size="lg">Get started free →</Button>
          </Link>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
        <div className="flex items-center gap-3">
          <Logo size={20} withWordmark />
        </div>
        <div className="flex items-center gap-5 text-xs text-muted">
          <a href="#features" className="transition-colors hover:text-fg">Features</a>
          <a href="#services" className="transition-colors hover:text-fg">Services</a>
          <a href="#privacy" className="transition-colors hover:text-fg">Privacy</a>
        </div>
        <div className="text-[11px] mono text-muted">© 2026 DevPulse</div>
      </div>
    </footer>
  );
}

function FeatureIcon1() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 9H5L7 4L11 14L13 9H16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function FeatureIcon2() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 15V12M8 15V8M13 15V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function FeatureIcon3() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="6.5" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="9" cy="9" r="2" fill="currentColor"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="8" width="11" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M6 8V5.5a3 3 0 1 1 6 0V8" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 9S4 3.5 9 3.5 16.5 9 16.5 9 14 14.5 9 14.5 1.5 9 1.5 9z" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="9" cy="9" r="2.25" stroke="currentColor" strokeWidth="1.6"/>
    </svg>
  );
}
function ServerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="3" width="13" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6"/>
      <rect x="2.5" y="10" width="13" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6"/>
      <circle cx="5" cy="5.5" r="0.7" fill="currentColor"/>
      <circle cx="5" cy="12.5" r="0.7" fill="currentColor"/>
    </svg>
  );
}
