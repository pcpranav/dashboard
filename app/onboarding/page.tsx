import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { TokenForm } from "@/components/onboarding/TokenForm";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getTokensRow, initSchema } from "@/lib/db";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-6 border border-border bg-surface p-10 text-center">
          <Logo size={48} />
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              Sign in to <span className="text-brand">DevPulse</span>
            </h1>
            <p className="text-[13px] text-muted">Connect your services after signing in.</p>
          </div>
          <form
            className="w-full"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/onboarding" });
            }}
          >
            <Button type="submit" size="lg" className="w-full">Continue with Google</Button>
          </form>
          <Link href="/" className="text-[11px] text-muted-soft underline decoration-dotted underline-offset-4 hover:text-fg">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  try {
    await initSchema();
    const row = await getTokensRow(session.user.id);
    if (row?.vercel_token && row?.netlify_token && row?.supabase_token) {
      redirect("/dashboard");
    }
  } catch {
    // DB unreachable locally — allow user to continue, tokens just won't save
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo size={28} withWordmark />
          <span className="text-xs text-muted-soft uppercase tracking-[0.15em]">Setup</span>
        </div>
        <TokenForm />
      </div>
    </main>
  );
}
