import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ChartSegment = { value: number; color: string; label: string };
export type ChartLegendItem = { value: string | number; color: string; label: string };

export function DonutChart({
  segments,
  size = 112,
  strokeWidth = 11,
  centerLabel,
  centerSub,
}: {
  segments: ChartSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
  centerSub?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let dashOffset = 0;
  /** Usable diameter inside the ring for labels */
  const hole = Math.max(36, size - strokeWidth * 2 - 8);
  const labelLen = String(centerLabel).length;
  const centerTextClass =
    hole < 56
      ? "text-base"
      : hole < 72
        ? labelLen > 4
          ? "text-lg"
          : "text-xl"
        : hole < 88
          ? labelLen > 4
            ? "text-xl"
            : "text-2xl"
          : labelLen > 4
            ? "text-2xl"
            : "text-3xl";

  return (
    <div className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(0.92 0.01 130)"
          strokeWidth={strokeWidth}
        />
        {segments.map((seg, i) => {
          if (seg.value <= 0) return null;
          const dash = (seg.value / total) * circumference;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-dashOffset}
              strokeLinecap="butt"
            />
          );
          dashOffset += dash;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center p-2">
        {(centerLabel || centerSub) && (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ width: hole, maxWidth: hole }}
          >
            {centerLabel ? (
              <span
                className={cn(
                  "font-display font-light leading-none tracking-tight tabular-nums",
                  centerTextClass,
                )}
              >
                {centerLabel}
              </span>
            ) : null}
            {centerSub && (
              <span
                className={cn(
                  "w-full text-center font-medium uppercase leading-tight tracking-wide text-muted-foreground",
                  centerLabel ? "mt-1" : "",
                  hole < 72 ? "text-[0.6rem]" : "text-[0.65rem]",
                )}
              >
                {centerSub}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function HorizontalBar({
  label,
  value,
  max,
  colorClass,
  display,
  size = "md",
}: {
  label: string;
  value: number;
  max: number;
  colorClass: string;
  display: string;
  size?: "md" | "lg";
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const large = size === "lg";
  return (
    <div>
      <div
        className={cn(
          "mb-2 flex items-baseline justify-between gap-3",
          large ? "text-base sm:text-lg" : "text-sm",
        )}
      >
        <span className={cn("text-foreground", large ? "font-semibold" : "font-medium")}>
          {label}
        </span>
        <span
          className={cn(
            "shrink-0 tabular-nums",
            large ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {display}
        </span>
      </div>
      <div className={cn("overflow-hidden rounded-full bg-muted", large ? "h-3.5" : "h-2.5")}>
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StatRing({
  title,
  segments,
  centerLabel,
  centerSub,
  legend,
  size = "md",
}: {
  title: string;
  segments: ChartSegment[];
  centerLabel: string;
  centerSub?: string;
  legend: ChartLegendItem[];
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  return (
    <Card
      className={cn(
        "flex h-full min-w-0 flex-col border-border/70",
        large ? "p-4 sm:p-5" : "p-4 sm:p-5",
      )}
    >
      <p
        className={cn(
          "font-display font-semibold tracking-tight text-foreground",
          large ? "text-base" : "text-eyebrow text-muted-foreground",
        )}
      >
        {title}
      </p>

      {large ? (
        <div className="mt-4 flex min-w-0 flex-1 flex-col items-center">
          <DonutChart
            segments={segments}
            centerLabel={centerLabel}
            centerSub={centerSub}
            size={118}
            strokeWidth={12}
          />
          <ul className="mt-4 w-full min-w-0 space-y-2">
            {legend.map((item) => (
              <li
                key={item.label}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 text-sm"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="min-w-0 leading-snug text-muted-foreground">{item.label}</span>
                <span className="max-w-[7.5rem] break-words text-right font-semibold leading-snug tabular-nums">
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 flex min-w-0 items-center gap-4">
          <DonutChart
            segments={segments}
            centerLabel={centerLabel}
            centerSub={centerSub}
            size={104}
            strokeWidth={11}
          />
          <ul className="min-w-0 flex-1 space-y-2">
            {legend.map((item) => (
              <li key={item.label} className="flex min-w-0 items-start gap-2 text-sm">
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{item.label}</span>
                <span className="max-w-[5.5rem] shrink-0 break-words text-right font-medium tabular-nums leading-snug">
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export type HistogramBar = {
  label: string;
  value: number;
  color?: string;
  subLabel?: string;
};

function niceMax(raw: number) {
  if (raw <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function yTicks(max: number, count = 4) {
  const step = max / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i * 1000) / 1000);
}

/** Vertical histogram on a Cartesian plane (X categories, Y values). */
export function HistogramChart({
  bars,
  height = 280,
  valueFormatter,
  minSlotWidth = 72,
}: {
  bars: HistogramBar[];
  height?: number;
  valueFormatter?: (n: number) => string;
  /** Minimum width (px) allocated per bar — increases overall chart width. */
  minSlotWidth?: number;
}) {
  const fmt = valueFormatter ?? ((n: number) => String(n));
  const dataMax = Math.max(...bars.map((b) => b.value), 0);
  const yMax = niceMax(dataMax || 1);
  const ticks = yTicks(yMax);

  const pad = { top: 24, right: 24, bottom: 64, left: 72 };
  const plotW = Math.max(bars.length * minSlotWidth, 420);
  const plotH = Math.max(220, height);
  const vbW = pad.left + plotW + pad.right;
  const vbH = pad.top + plotH + pad.bottom;
  const n = Math.max(bars.length, 1);
  const slot = plotW / n;
  const barW = Math.min(slot * 0.62, Math.max(56, minSlotWidth * 0.55));

  const axisFmt = (n: number) => {
    const s = fmt(n);
    return s.length > 10 ? s.slice(0, 9) + "…" : s;
  };

  return (
    <div className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        width="100%"
        height={Math.max(height + 72, 320)}
        className="overflow-visible text-foreground"
        role="img"
        aria-label="Histogram chart"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid + Y axis ticks */}
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / yMax) * plotH;
          return (
            <g key={`y-${t}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + plotW}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={pad.left - 10}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="currentColor"
                opacity={0.55}
                style={{ fontSize: 13, fontFamily: "inherit", fontWeight: 300 }}
              >
                {axisFmt(t)}
              </text>
            </g>
          );
        })}

        {/* Axes (Cartesian plane) */}
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + plotH}
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={pad.left}
          y1={pad.top + plotH}
          x2={pad.left + plotW}
          y2={pad.top + plotH}
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        {/* Origin tick marks */}
        <line
          x1={pad.left - 5}
          y1={pad.top + plotH}
          x2={pad.left}
          y2={pad.top + plotH}
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />

        {/* Bars + X labels */}
        {bars.map((bar, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const h = (bar.value / yMax) * plotH;
          const y = pad.top + plotH - h;
          return (
            <g key={bar.label}>
              <title>{`${bar.label}${bar.subLabel ? ` · ${bar.subLabel}` : ""}: ${fmt(bar.value)}`}</title>
              <rect
                x={cx - barW / 2}
                y={Number.isFinite(y) ? y : pad.top + plotH}
                width={barW}
                height={Math.max(h, bar.value > 0 ? 3 : 0)}
                fill={bar.color || "var(--primary)"}
                rx={3}
              />
              <text
                x={cx}
                y={pad.top + plotH + 20}
                textAnchor="middle"
                fill="currentColor"
                style={{ fontSize: 13, fontFamily: "inherit", fontWeight: 300 }}
              >
                {bar.label.length > 14 ? `${bar.label.slice(0, 13)}…` : bar.label}
              </text>
              {bar.subLabel && (
                <text
                  x={cx}
                  y={pad.top + plotH + 36}
                  textAnchor="middle"
                  fill="currentColor"
                  opacity={0.55}
                  style={{ fontSize: 11, fontFamily: "inherit", fontWeight: 300 }}
                >
                  {bar.subLabel.length > 16 ? `${bar.subLabel.slice(0, 15)}…` : bar.subLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type GroupedBarSeries = {
  key: string;
  label: string;
  color: string;
};

export type GroupedBarGroup = {
  label: string;
  values: Record<string, number>;
};

/** Grouped vertical bars on a Cartesian plane. */
export function GroupedHistogram({
  groups,
  series,
  height = 220,
}: {
  groups: GroupedBarGroup[];
  series: GroupedBarSeries[];
  height?: number;
}) {
  const dataMax = Math.max(
    0,
    ...groups.flatMap((g) => series.map((s) => g.values[s.key] ?? 0)),
  );
  const yMax = niceMax(dataMax || 1);
  const ticks = yTicks(yMax);
  const fmt = (n: number) => String(n);

  const pad = { top: 18, right: 16, bottom: 44, left: 44 };
  const plotW = Math.max(groups.length * 36, 160);
  const plotH = Math.max(140, height - 48);
  const vbW = pad.left + plotW + pad.right;
  const vbH = pad.top + plotH + pad.bottom;
  const n = Math.max(groups.length, 1);
  const slot = plotW / n;
  const clusterW = slot * 0.72;
  const gap = 2;
  const barW = Math.max(4, (clusterW - gap * (series.length - 1)) / Math.max(series.length, 1));

  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <div className="mb-3 flex flex-wrap gap-4">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="font-light text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        width="100%"
        height={height}
        className="overflow-visible text-foreground"
        role="img"
        aria-label="Grouped histogram chart"
        preserveAspectRatio="xMidYMid meet"
      >
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / yMax) * plotH;
          return (
            <g key={`gy-${t}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={pad.left + plotW}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={pad.left - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="currentColor"
                opacity={0.55}
                style={{ fontSize: 11, fontFamily: "inherit", fontWeight: 300 }}
              >
                {fmt(t)}
              </text>
            </g>
          );
        })}

        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + plotH}
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={pad.left}
          y1={pad.top + plotH}
          x2={pad.left + plotW}
          y2={pad.top + plotH}
          stroke="currentColor"
          strokeOpacity={0.45}
          strokeWidth={1.25}
          vectorEffect="non-scaling-stroke"
        />

        {groups.map((group, gi) => {
          const slotCenter = pad.left + slot * gi + slot / 2;
          const clusterLeft = slotCenter - clusterW / 2;
          return (
            <g key={group.label}>
              {series.map((s, si) => {
                const value = group.values[s.key] ?? 0;
                const h = (value / yMax) * plotH;
                const x = clusterLeft + si * (barW + gap);
                const y = pad.top + plotH - h;
                return (
                  <rect
                    key={s.key}
                    x={x}
                    y={y}
                    width={barW}
                    height={Math.max(h, value > 0 ? 2 : 0)}
                    fill={s.color}
                    rx={2}
                  >
                    <title>{`${group.label} · ${s.label}: ${value}`}</title>
                  </rect>
                );
              })}
              <text
                x={slotCenter}
                y={pad.top + plotH + 18}
                textAnchor="middle"
                fill="currentColor"
                style={{ fontSize: 11, fontFamily: "inherit", fontWeight: 300 }}
              >
                {group.label.length > 12 ? `${group.label.slice(0, 11)}…` : group.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
