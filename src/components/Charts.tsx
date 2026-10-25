const GRID_LINES = [0, 25, 50, 75, 100] as const;
const LABEL_EVERY = 5;

interface BarChartProps {
  readonly values: readonly number[];
  readonly labels: readonly string[];
  readonly ariaLabel: string;
  readonly step?: number;
}

/** Bars scaled 0-100 (percent), with grid lines like the spreadsheet charts. */
export function BarChart({ values, labels, ariaLabel, step = 16 }: BarChartProps) {
  const left = 30;
  const top = 8;
  const plot = 100;
  const width = left + values.length * step + 4;
  const showEvery = values.length > 12 ? LABEL_EVERY : 1;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${top + plot + 20}`}
      role="img"
      aria-label={ariaLabel}
    >
      {GRID_LINES.map((g) => {
        const y = top + plot - g;
        return (
          <g key={g}>
            <line x1={left} x2={width} y1={y} y2={y} className="grid-line" />
            <text x={left - 4} y={y + 3} textAnchor="end" className="axis-text">
              {g}%
            </text>
          </g>
        );
      })}
      {values.map((v, i) => {
        const h = Math.max(0, Math.min(100, v));
        const x = left + i * step + 2;
        return (
          <g key={labels[i] ?? i}>
            <rect x={x} y={top + plot - h} width={step - 4} height={h} className="bar" rx="1.5" />
            {(i + 1) % showEvery === 0 || i === 0 ? (
              <text x={x + (step - 4) / 2} y={top + plot + 13} textAnchor="middle" className="axis-text">
                {labels[i]}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

interface DonutProps {
  readonly pct: number;
}

export function Donut({ pct }: DonutProps) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg className="donut" viewBox="0 0 100 100" role="img" aria-label={`${Math.round(clamped)}% complete`}>
      <circle cx="50" cy="50" r={radius} className="donut-track" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        className="donut-value"
        strokeDasharray={`${(clamped / 100) * circumference} ${circumference}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="55" textAnchor="middle" className="donut-text">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

export interface LineSeries {
  readonly name: string;
  readonly color: string;
  readonly max: number;
  readonly values: readonly (number | null)[];
}

interface LineChartProps {
  readonly series: readonly LineSeries[];
  readonly labels: readonly string[];
  readonly ariaLabel: string;
}

export function LineChart({ series, labels, ariaLabel }: LineChartProps) {
  const left = 6;
  const top = 8;
  const plot = 70;
  const step = 14;
  const count = labels.length;
  const width = left + count * step;

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${top + plot + 6}`} role="img" aria-label={ariaLabel}>
      <line x1={left} x2={width} y1={top + plot} y2={top + plot} className="grid-line" />
      {series.map((s) => {
        const points = s.values
          .map((v, i) =>
            v === null ? null : `${left + i * step + step / 2},${top + plot - (v / s.max) * plot}`,
          )
          .filter((p): p is string => p !== null);
        return (
          <polyline
            key={s.name}
            points={points.join(" ")}
            fill="none"
            stroke={s.color}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        );
      })}
    </svg>
  );
}
