import { cn } from "@/lib/utils";

interface Props {
  step: number;
  total: number;
  labels: string[];
}

export function StepIndicator({ step, total, labels }: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      {labels.slice(0, total).map((label, idx) => {
        const n = idx + 1;
        const done = n < step;
        const current = n === step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2.5">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center text-xs mono tnum font-semibold transition-colors",
                done && "bg-brand text-white",
                current && "border border-brand bg-brand-soft text-brand",
                !done && !current && "border border-border bg-surface text-muted-soft",
              )}
            >
              {done ? <Check /> : n}
            </div>
            <span
              className={cn(
                "text-[11px] uppercase tracking-[0.15em] font-medium",
                current ? "text-fg" : "text-muted",
              )}
            >
              {label}
            </span>
            {n < total && (
              <div
                className={cn(
                  "mx-1 h-px flex-1 transition-colors",
                  done ? "bg-brand" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function Check() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
