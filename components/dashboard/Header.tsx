import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-20 -mx-4 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur-sm md:-mx-6 md:px-6">
      <div className="flex items-center gap-3">
        <Logo size={26} withWordmark />
        <span className="hidden text-xs text-muted sm:inline">· Live dev dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        {email && (
          <span className="hidden items-center gap-2 border border-border bg-surface px-3 py-1 text-xs text-muted mono md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {email}
          </span>
        )}
        <Link href="/settings/alerts">
          <Button variant="ghost" size="sm">
            Alerts
          </Button>
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
