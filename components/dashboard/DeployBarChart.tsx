import type { DeploymentData } from "@/types";

interface Day {
  label: string;
  dayKey: string;
  count: number;
  errors: number;
}

export function DeployBarChart({ deployments }: { deployments: DeploymentData[] }) {
  const days: Day[] = [];
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
  // niceMax: round up to a clean number for the y-axis
  const niceMax = max <= 4 ? 4 : max <= 8 ? 8 : max <= 12 ? 12 : Math.ceil(max / 5) * 5;
  const halfMax = Math.round(niceMax / 2);
  const peakIdx = days.findIndex((d) => d.count === max && d.count > 0);

  // SVG layout
  const W = 320;
  const H = 120;
  const padL = 22;
  const padR = 6;
  const padT = 8;
  const padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const baselineY = H - padB;
  const barGap = 6;
  const barW = (chartW - barGap * (days.length - 1)) / days.length;

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Deploys per day, last 7 days"
      >
        {/* gridlines */}
        <line
          x1={padL}
          y1={padT}
          x2={W - padR}
          y2={padT}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        <line
          x1={padL}
          y1={padT + chartH / 2}
          x2={W - padR}
          y2={padT + chartH / 2}
          stroke="var(--chart-grid)"
          strokeWidth={1}
        />
        {/* baseline */}
        <line
          x1={padL}
          y1={baselineY}
          x2={W - padR}
          y2={baselineY}
          stroke="var(--rule)"
          strokeWidth={1}
        />

        {/* y-axis labels */}
        <text
          x={padL - 4}
          y={padT + 3}
          textAnchor="end"
          className="mono"
          fontSize={9}
          fill="var(--muted-soft)"
        >
          {niceMax}
        </text>
        <text
          x={padL - 4}
          y={padT + chartH / 2 + 3}
          textAnchor="end"
          className="mono"
          fontSize={9}
          fill="var(--muted-soft)"
        >
          {halfMax}
        </text>
        <text
          x={padL - 4}
          y={baselineY + 3}
          textAnchor="end"
          className="mono"
          fontSize={9}
          fill="var(--muted-soft)"
        >
          0
        </text>

        {/* bars */}
        {days.map((day, i) => {
          const h = day.count === 0 ? 0 : (day.count / niceMax) * chartH;
          const x = padL + i * (barW + barGap);
          const y = baselineY - h;
          let fill = "var(--chart-bar-typical)";
          if (day.errors > 0) fill = "var(--danger)";
          else if (i === peakIdx && day.count > 0) fill = "var(--brand)";
          return (
            <g key={day.dayKey}>
              {h > 0 && <rect x={x} y={y} width={barW} height={h} fill={fill} />}
              <text
                x={x + barW / 2}
                y={H - 6}
                textAnchor="middle"
                className="mono"
                fontSize={9}
                fill="var(--muted-soft)"
              >
                {day.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-brand" />
          peak day
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="inline-block h-2 w-2 bg-[var(--chart-bar-typical)]" />
          typical
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted">
          <span className="inline-block h-2 w-2 bg-danger" />
          had errors
        </span>
      </div>
    </div>
  );
}
