import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ConnectCTA({ service }: { service: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border-strong bg-white/[0.02] p-4">
      <p className="text-sm text-muted">
        <span className="text-fg">{service}</span> is not connected yet.
      </p>
      <Link href="/onboarding">
        <Button variant="outline" size="sm">
          Connect {service}
        </Button>
      </Link>
    </div>
  );
}
