import type { DeploymentData } from "@/types";
import { StatusDot } from "./StatusDot";
import { formatDuration, timeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function DeploymentList({ deployments }: { deployments: DeploymentData[] }) {
  if (!deployments.length) {
    return <p className="text-sm text-muted">No deployments found.</p>;
  }
  return (
    <ul className="divide-y divide-border border-y border-border">
      {deployments.map((d) => (
        <li
          key={d.id}
          className="group flex items-start gap-3 px-2 py-2 transition-colors hover:bg-surface-alt"
        >
          <StatusDot status={d.status} className="mt-1.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="truncate text-sm font-medium">{d.project}</span>
              {d.context && (
                <span
                  className={cn(
                    "border px-1 py-0 text-[9px] mono uppercase tracking-widest",
                    d.context === "production"
                      ? "border-brand/40 bg-brand-soft text-brand"
                      : "border-border bg-surface-alt text-muted",
                  )}
                >
                  {d.context === "production" ? "prod" : d.context === "preview" ? "prev" : "branch"}
                </span>
              )}
              {d.branch && (
                <span className="mono truncate text-[11px] text-muted">{d.branch}</span>
              )}
            </div>
            {d.commitMessage && (
              <p className="truncate text-xs text-muted">{d.commitMessage}</p>
            )}
          </div>
          <div className="mono tnum shrink-0 text-right">
            <div className="text-[11px] text-fg">{formatDuration(d.duration)}</div>
            <div className="text-[10px] text-muted-soft">{timeAgo(d.createdAt)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
