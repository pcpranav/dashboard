import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDecryptedTokens } from "@/lib/db";
import type { DeploymentData, LogLine } from "@/types";
import { Header } from "@/components/dashboard/Header";
import { ConnectCTA } from "@/components/dashboard/ConnectCTA";
import { DeployMetaHeader } from "@/components/deploys/DeployMetaHeader";
import { LogView } from "@/components/deploys/LogView";
import { RefreshButton } from "@/components/deploys/RefreshButton";
import {
  fetchVercelDeployment,
  fetchVercelDeployLogs,
} from "@/lib/fetchers/vercel";
import {
  fetchNetlifyDeployment,
  fetchNetlifyDeployLog,
  type NetlifyLogResult,
} from "@/lib/fetchers/netlify";

export const dynamic = "force-dynamic";

type Provider = "vercel" | "netlify";
const PROVIDER_LABEL: Record<Provider, string> = {
  vercel: "Vercel",
  netlify: "Netlify",
};

function isProvider(p: string): p is Provider {
  return p === "vercel" || p === "netlify";
}

interface LogResult {
  lines: LogLine[];
  unavailable?: "logflow" | "missing";
}

async function fetchProviderLogs(provider: Provider, token: string, id: string): Promise<LogResult> {
  if (provider === "vercel") {
    const lines = await fetchVercelDeployLogs(token, id);
    return { lines };
  }
  const result: NetlifyLogResult = await fetchNetlifyDeployLog(token, id);
  return { lines: result.lines, unavailable: result.unavailable };
}

async function fetchProviderDeployment(
  provider: Provider,
  token: string,
  id: string,
): Promise<DeploymentData> {
  if (provider === "vercel") return fetchVercelDeployment(token, id);
  return fetchNetlifyDeployment(token, id);
}

export default async function DeployLogsPage({
  params,
}: {
  params: { provider: string; id: string };
}) {
  if (!isProvider(params.provider)) notFound();
  const provider: Provider = params.provider;

  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const tokens = await getDecryptedTokens(session.user.id);
  const token = provider === "vercel" ? tokens.vercel : tokens.netlify;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <Header email={session.user.email} />
      <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
        <Link
          href="/dashboard"
          className="mono text-[11px] uppercase tracking-[0.15em] text-muted hover:text-fg"
        >
          ← Back to dashboard
        </Link>

        {!token ? (
          <ConnectCTA service={PROVIDER_LABEL[provider]} />
        ) : (
          <DeployContent provider={provider} token={token} id={params.id} />
        )}
      </div>
    </main>
  );
}

async function DeployContent({
  provider,
  token,
  id,
}: {
  provider: Provider;
  token: string;
  id: string;
}) {
  const [metaResult, logsResult] = await Promise.allSettled([
    fetchProviderDeployment(provider, token, id),
    fetchProviderLogs(provider, token, id),
  ]);

  if (metaResult.status === "rejected") {
    return (
      <section className="border border-border bg-surface p-4">
        <p className="text-[13px] text-danger">Failed to load deploy details.</p>
        <div className="mt-3">
          <RefreshButton />
        </div>
      </section>
    );
  }

  const deploy = metaResult.value;

  if (logsResult.status === "rejected") {
    return (
      <>
        <DeployMetaHeader deploy={deploy} />
        <LogView lines={[]} status={{ kind: "error" }} />
      </>
    );
  }

  const logs = logsResult.value;

  return (
    <>
      <DeployMetaHeader deploy={deploy} />
      <LogView
        lines={logs.lines}
        status={
          logs.unavailable
            ? { kind: "unavailable", reason: logs.unavailable }
            : undefined
        }
      />
    </>
  );
}
