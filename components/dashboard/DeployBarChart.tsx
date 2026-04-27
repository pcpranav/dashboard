import type { DeploymentData } from "@/types";
import { cn } from "@/lib/utils";

export function DeployBarChart({ deployments }: { deployments: DeploymentData[] }) {
  const days: { label: string; dayKey: string; count: number; errors: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1),
      dayKey: d.toISOString().slice(0, 10),
      count: 0,
      errors: 0,
    });
  }
  for (const dep of deployments) {
    const key = dep.createdAt.slice(0, 10);
    const day = days.find((x) => x.dayKey === key);
    if (!day) continue;
    day.count += 1;
    if (dep.status === "error") day.errors += 1;
  }
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="flex items-end gap-1.5 pt-2">
      {days.map((day, i) => {
        const h = Math.max(4, Math.round((day.count / max) * 52));
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-full rounded-md transition-all",
                day.errors > 0
                  ? "bg-danger/80"
                  : day.count > 0
                    ? "bg-blue"
                    : "bg-white/[0.06]",
              )}
              style={{ height: `${h}px` }}
              title={`${day.count} deploys${day.errors ? `, ${day.errors} error` : ""}`}
            />
            <span className="text-[10px] text-muted mono">{day.label}</span>
          </div>
        );
      })}
    </div>
  );
}
