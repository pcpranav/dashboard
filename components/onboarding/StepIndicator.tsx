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
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs mono font-semibold transition-all",
                done &&
                  "bg-aurora text-black shadow-[0_0_20px_-4px_rgba(167,139,250,0.7)]",
                current &&
                  "border border-violet/60 bg-violet/10 text-violet shadow-[0_0_20px_-6px_rgba(167,139,250,0.6)]",
                !done && !current && "border border-border bg-white/[0.02] text-muted",
              )}
            >
              {done ? <Check /> : n}
            </div>
            <span
              className={cn(
                "text-[11px] uppercase tracking-widest font-medium",
                current ? "text-fg" : "text-muted",
              )}
            >
              {label}
            </span>
            {n < total && (
              <div
                className={cn(
                  "mx-1 h-px flex-1 transition-colors",
                  done ? "bg-gradient-to-r from-violet to-cyan" : "bg-border",
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
