import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTokensRow, initSchema } from "@/lib/db";
import type { ConnectedServices } from "@/types";
import { Header } from "@/components/dashboard/Header";
import { FactStrip } from "@/components/dashboard/FactStrip";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { FilterProvider } from "@/components/dashboard/filter-context";
import { isFilterRange, type FilterRange } from "@/components/dashboard/filter-shared";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { VercelCard } from "@/components/dashboard/VercelCard";
import { NetlifyCard } from "@/components/dashboard/NetlifyCard";
import { SupabaseCard } from "@/components/dashboard/SupabaseCard";
import { LinkedProjects } from "@/components/dashboard/LinkedProjects";
import { UsageBars } from "@/components/dashboard/UsageBars";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";

// Force-dynamic: dashboard is user-specific; cannot cache statically
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { range?: string; q?: string };
}) {
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

  const range: FilterRange = isFilterRange(searchParams.range) ? searchParams.range : "7d";
  const q = (searchParams.q ?? "").trim().toLowerCase().slice(0, 200);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6">
      <Header email={session.user.email} />
      <FilterProvider range={range} q={q}>
        <FactStrip connected={connected} />
        <FilterBar range={range} q={q} />
        <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
          <HeroCard connected={connected} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <VercelCard connected={connected.vercel} />
            <NetlifyCard connected={connected.netlify} />
            <SupabaseCard connected={connected.supabase} />
          </div>
          <LinkedProjects connected={connected} />
          <UsageBars connected={connected} />
          <ActivityFeed connected={connected} />
        </div>
      </FilterProvider>
    </main>
  );
}
