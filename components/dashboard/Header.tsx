import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function Header({ email }: { email?: string | null }) {
  return (
    <header className="glass sticky top-4 z-20 flex items-center justify-between rounded-2xl px-5 py-3">
      <div className="flex items-center gap-3">
        <Logo size={28} withWordmark />
        <span className="hidden text-xs text-muted sm:inline">· Live dev dashboard</span>
      </div>
      <div className="flex items-center gap-3">
        {email && (
          <span className="hidden items-center gap-2 rounded-full border border-border bg-white/[0.02] px-3 py-1 text-xs text-muted mono md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            {email}
          </span>
        )}
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
