import type { DeploymentData } from "@/types";
import { StatusDot } from "@/components/dashboard/StatusDot";
import { formatDuration, timeAgo } from "@/lib/utils";

const CONTEXT_LABEL: Record<string, string> = {
  production: "PROD",
  preview: "PREV",
  branch: "BRANCH",
};

export function DeployMetaHeader({ deploy }: { deploy: DeploymentData }) {
  const contextLabel = deploy.context ? CONTEXT_LABEL[deploy.context] : null;

  return (
    <section className="border border-border bg-surface px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusDot status={deploy.status} />
          <span className="truncate text-base font-medium text-fg">
            {deploy.project || "—"}
          </span>
        </div>
        {deploy.url && (
          <a
            href={deploy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mono shrink-0 text-[11px] text-muted hover:text-fg"
          >
            Open ↗
          </a>
        )}
      </div>
      <p className="mono mt-1 truncate text-[11px] text-muted">
        {deploy.branch || "—"}
        {deploy.commitMessage && (
          <>
            {" · "}
            <span>{deploy.commitMessage}</span>
          </>
        )}
      </p>
      <p className="mono mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-soft">
        {contextLabel && (
          <>
            {contextLabel}
            {" · "}
          </>
        )}
        {formatDuration(deploy.duration)}
        {" · "}
        {timeAgo(deploy.createdAt)}
      </p>
    </section>
  );
}
