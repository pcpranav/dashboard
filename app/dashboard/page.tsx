import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTokensRow, initSchema } from "@/lib/db";
import type { ConnectedServices } from "@/types";
import { SummaryBar } from "@/components/dashboard/SummaryBar";
import { VercelCard } from "@/components/dashboard/VercelCard";
import { NetlifyCard } from "@/components/dashboard/NetlifyCard";
import { SupabaseCard } from "@/components/dashboard/SupabaseCard";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { UsageBars } from "@/components/dashboard/UsageBars";
import { Header } from "@/components/dashboard/Header";
import { NeedsAttention } from "@/components/dashboard/NeedsAttention";
import { LinkedProjects } from "@/components/dashboard/LinkedProjects";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  let connected: ConnectedServices = { vercel: false, netlify: false, supabase: false };
  try {
    await initSchema();
    const row = await getTokensRow(session.user.id);
    connected = {
      vercel: Boolean(row?.vercel_token),
      netlify: Boolean(row?.netlify_token),
      supabase: Boolean(row?.supabase_token),
    };
  } catch {
    // DB unreachable — show dashboard with nothing connected
  }

  if (!connected.vercel && !connected.netlify && !connected.supabase) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6">
      <Header email={session.user.email} />
      <NeedsAttention connected={connected} />
      <SummaryBar connected={connected} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <VercelCard connected={connected.vercel} />
        <NetlifyCard connected={connected.netlify} />
        <SupabaseCard connected={connected.supabase} />
      </div>
      <LinkedProjects connected={connected} />
      <UsageBars connected={connected} />
      <ActivityFeed connected={connected} />
    </main>
  );
}
