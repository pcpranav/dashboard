export interface ChartBin {
  /** Short label rendered under the bar (1–3 chars). */
  label: string;
  /** Bar value (number of items). */
  count: number;
  /** Items in error state — bar renders danger if > 0. */
  errors: number;
  /** Optional unique key for React key prop; falls back to index if absent. */
  key?: string;
}

interface Props {
  bins: ChartBin[];
  /** When true, x-axis labels are rendered every Nth bin where N = labelEvery. */
  labelEvery?: number;
}

export function DeployBarChart({ bins, labelEvery = 1 }: Props) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  const niceMax = max <= 4 ? 4 : max <= 8 ? 8 : max <= 12 ? 12 : Math.ceil(max / 5) * 5;
  const halfMax = Math.round(niceMax / 2);
  const peakIdx = bins.findIndex((b) => b.count === max && b.count > 0);

  const W = 320;
  const H = 120;
  const padL = 22;
  const padR = 6;
  const padT = 8;
  const padB = 22;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const baselineY = H - padB;
  const barGap = bins.length > 30 ? 1 : bins.length > 14 ? 2 : 6;
  const barW = (chartW - barGap * Math.max(0, bins.length - 1)) / Math.max(1, bins.length);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Deploys per period"
      >
        {/* gridlines */}
        <line x1={padL} y1={padT} x2={W - padR} y2={padT} stroke="var(--chart-grid)" strokeWidth={1} />
        <line x1={padL} y1={padT + chartH / 2} x2={W - padR} y2={padT + chartH / 2} stroke="var(--chart-grid)" strokeWidth={1} />
        {/* baseline */}
        <line x1={padL} y1={baselineY} x2={W - padR} y2={baselineY} stroke="var(--rule)" strokeWidth={1} />

        {/* y-axis labels */}
        <text x={padL - 4} y={padT + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--muted-soft)">{niceMax}</text>
        <text x={padL - 4} y={padT + chartH / 2 + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--muted-soft)">{halfMax}</text>
        <text x={padL - 4} y={baselineY + 3} textAnchor="end" className="mono" fontSize={9} fill="var(--muted-soft)">0</text>

        {/* bars */}
        {bins.map((bin, i) => {
          const h = bin.count === 0 ? 0 : (bin.count / niceMax) * chartH;
          const x = padL + i * (barW + barGap);
          const y = baselineY - h;
          let fill = "var(--chart-bar-typical)";
          if (bin.errors > 0) fill = "var(--danger)";
          else if (i === peakIdx && bin.count > 0) fill = "var(--brand)";
          const showLabel = i % labelEvery === 0;
          return (
            <g key={bin.key ?? i}>
              {h > 0 && <rect x={x} y={y} width={barW} height={h} fill={fill} />}
              {showLabel && bin.label && (
                <text
                  x={x + barW / 2}
                  y={H - 6}
                  textAnchor="middle"
                  className="mono"
                  fontSize={9}
                  fill="var(--muted-soft)"
                >
                  {bin.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2 text-[10px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 bg-brand" />
          peak
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
