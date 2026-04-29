import { cn } from "@/lib/utils";
import type { DeployStatus } from "@/types";

const MAP: Record<DeployStatus, { color: string; pulse: boolean; label: string }> = {
  ready: { color: "bg-success", pulse: false, label: "Ready" },
  building: { color: "bg-warning", pulse: true, label: "Building" },
  error: { color: "bg-danger", pulse: false, label: "Error" },
  cancelled: { color: "bg-muted-soft", pulse: false, label: "Cancelled" },
};

export function StatusDot({ status, className }: { status: DeployStatus; className?: string }) {
  const { color, pulse, label } = MAP[status];
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        color,
        pulse && "animate-pulse-dot",
        className,
      )}
      aria-label={label}
      title={label}
    />
  );
}
