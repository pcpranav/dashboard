import { cn } from "@/lib/utils";
import type { DeployStatus } from "@/types";

const MAP: Record<DeployStatus, { color: string; glow: string; pulse: boolean; label: string }> = {
  ready: { color: "bg-mint", glow: "shadow-[0_0_10px_rgba(74,222,128,0.7)]", pulse: false, label: "Ready" },
  building: { color: "bg-amber", glow: "shadow-[0_0_10px_rgba(251,191,36,0.7)]", pulse: true, label: "Building" },
  error: { color: "bg-danger", glow: "shadow-[0_0_10px_rgba(251,113,133,0.7)]", pulse: false, label: "Error" },
  cancelled: { color: "bg-muted", glow: "", pulse: false, label: "Cancelled" },
};

export function StatusDot({ status, className }: { status: DeployStatus; className?: string }) {
  const { color, glow, pulse, label } = MAP[status];
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        color,
        glow,
        pulse && "animate-pulse-dot",
        className,
      )}
      aria-label={label}
      title={label}
    />
  );
}
