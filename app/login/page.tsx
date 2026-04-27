import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { getTokensRow, initSchema } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user?.id) {
    try {
      await initSchema();
      const row = await getTokensRow(session.user.id);
      const hasAny = row?.vercel_token || row?.netlify_token || row?.supabase_token;
      redirect(hasAny ? "/dashboard" : "/onboarding");
    } catch {
      redirect("/onboarding");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-fg"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6 2L3 5L6 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to home
        </Link>
        <div className="glass-strong flex flex-col items-center gap-7 rounded-3xl p-10 text-center">
          <Logo size={56} />
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to <span className="text-blue-soft">DevPulse</span>
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Sign in to connect Vercel, Netlify, and Supabase in one place.
            </p>
          </div>
          <form
            className="w-full"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/dashboard" });
            }}
          >
            <Button type="submit" size="lg" className="w-full">
              <GoogleIcon />
              Continue with Google
            </Button>
          </form>
          <p className="text-[11px] text-muted mono">
            Tokens you provide later are encrypted at rest and used read-only.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21.8 12.23c0-.74-.07-1.45-.2-2.13H12v4.03h5.5c-.24 1.27-.96 2.34-2.04 3.06v2.54h3.3c1.93-1.78 3.04-4.4 3.04-7.5z" fill="#4285F4"/>
      <path d="M12 22c2.75 0 5.05-.91 6.73-2.46l-3.3-2.54c-.91.61-2.07.97-3.43.97-2.64 0-4.88-1.78-5.68-4.18H3v2.62A10 10 0 0 0 12 22z" fill="#34A853"/>
      <path d="M6.32 13.79A6 6 0 0 1 6 12c0-.62.11-1.22.32-1.79V7.59H3A10 10 0 0 0 2 12c0 1.61.38 3.14 1 4.41l3.32-2.62z" fill="#FBBC05"/>
      <path d="M12 5.82c1.49 0 2.83.51 3.89 1.52l2.92-2.92C17.04 2.88 14.74 2 12 2 7.67 2 3.97 4.48 3 7.59l3.32 2.62C7.12 7.6 9.36 5.82 12 5.82z" fill="#EA4335"/>
    </svg>
  );
}
