import { clsx } from "clsx";

export interface TrendPoint {
  /** Sorted key, used for the React key and the accessible description. */
  at: string;
  /** 0 to 1. */
  value: number;
  /** How it reads in the description: "week of 3 August", "August". */
  label: string;
}

const W = 300;
const H = 74;
const PAD_Y = 11;
const PAD_X = 6;

/**
 * Turns the points into a smooth path. Catmull-Rom through every point, converted to cubic
 * beziers, with the control points clamped to each segment's own range so the curve dips
 * and rises without overshooting past a value that was never measured.
 */
function curve(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  const first = pts[0];
  if (!first) return "";
  if (pts.length === 1) return `M ${first.x} ${first.y}`;

  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? pts[i + 1];
    if (!p0 || !p1 || !p2 || !p3) continue;

    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const c1y = Math.max(lo, Math.min(hi, p1.y + (p2.y - p0.y) / 6));
    const c2y = Math.max(lo, Math.min(hi, p2.y - (p3.y - p1.y) / 6));

    d +=
      ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${c1y.toFixed(1)},` +
      ` ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${c2y.toFixed(1)},` +
      ` ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * A rate over time, with the level it is aiming at drawn behind it. Ink, not amber: on
 * Insights amber means a day the learner reviewed, and a second meaning on the same screen
 * would make the accent decorative. The last point is the exception, because that is the
 * one the number above the chart is talking about.
 *
 * The scale never starts at zero. Retention lives between about 70% and 100%, and a zero
 * baseline flattens every real change into a line across the top.
 */
export function TrendLine({
  points,
  target,
  targetLabel,
  className,
  label,
}: {
  points: TrendPoint[];
  /** Drawn as a dashed rule, e.g. the 0.9 the scheduler aims for. */
  target?: number | undefined;
  /** Sits at the end of the dashed rule, e.g. "90%". */
  targetLabel?: string | undefined;
  className?: string | undefined;
  label: string;
}) {
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, target ?? 1) - 0.05;
  const hi = Math.max(...values, target ?? 0) + 0.05;
  const span = Math.max(0.14, hi - lo);
  const floor = Math.max(0, Math.min(lo, 1 - span));

  const x = (i: number) =>
    points.length === 1 ? W / 2 : PAD_X + (i / (points.length - 1)) * (W - PAD_X * 2);
  const y = (v: number) => H - PAD_Y - ((v - floor) / span) * (H - PAD_Y * 2);

  const xy = points.map((p, i) => ({ x: x(i), y: y(p.value) }));
  const line = curve(xy);
  const area = `${line} L ${(W - PAD_X).toFixed(1)} ${H} L ${PAD_X} ${H} Z`;
  const last = xy.at(-1);
  const targetShown = target !== undefined && target >= floor && target <= floor + span;

  return (
    <div className={clsx("relative h-full w-full", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        // Stretched to the box rather than scaled by aspect ratio, so the chart fills the
        // height it is given instead of growing past it as the plate widens. Every stroke
        // carries `non-scaling-stroke` so the stretch cannot thin the line, and the two
        // things that must stay round or upright — the endpoint and the target label — are
        // HTML positioned over the drawing rather than shapes inside it.
        preserveAspectRatio="none"
        className="block h-full w-full"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        {targetShown && (
          <line
            x1="0"
            x2={W}
            y1={y(target)}
            y2={y(target)}
            stroke="var(--edge-2)"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {points.length > 1 && <path d={area} fill="var(--text)" fillOpacity="0.07" stroke="none" />}
        <path
          d={line}
          fill="none"
          stroke="var(--text)"
          strokeOpacity="0.6"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {last && (
        <span
          className="pointer-events-none absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber"
          style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }}
          aria-hidden="true"
        />
      )}
      {/* Positioned in HTML rather than drawn as SVG text, so it stays 11 px at every width.
          `muted`, not `faint`: this is a value the reader has to be able to read. */}
      {targetShown && targetLabel && (
        <span
          className="pointer-events-none absolute right-0 -translate-y-1/2 bg-plate pl-1 text-2xs text-muted tabular-nums"
          style={{ top: `${(y(target) / H) * 100}%` }}
          aria-hidden="true"
        >
          {targetLabel}
        </span>
      )}
    </div>
  );
}
