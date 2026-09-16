import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";

export interface TrendPoint {
  /** Sorted key, used for the React key and the accessible description. */
  at: string;
  /**
   * When this bucket starts, as a sortable number. Positions come from this rather than
   * from the array index: the API leaves empty buckets out so a week away reads as a gap,
   * and spacing by index would draw July next to September as if they were consecutive.
   */
  t: number;
  /** 0 to 1. */
  value: number;
  /** How it reads in the description: "week of 3 August", "August". */
  label: string;
  /** The end labels under the plot: "3 Aug", "Aug". Only the first and last are drawn. */
  short: string;
}

const W = 300;
const H = 58;
const PAD_Y = 12;
/**
 * Room for the reference label, so it sits beside the plot instead of on top of it. Wide
 * enough to hold "90%" at 11 px on the narrowest plate: the label no longer carries an
 * opaque backing, so anything it overhangs it draws straight through.
 */
const GUTTER = 44;
const PAD_R = 8;
/** The end labels' row, below the plot and inside the figure box the plates share. */
const ENDS_H = 15;

/** A line needs three points to have a shape; below that the caller draws the sample. */
export const TREND_MIN_POINTS = 3;

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
 * one the end label names.
 *
 * Every bucket carries a dot. Four weekly measurements drawn as a bare curve read as a
 * daily trend across the whole period, which is a span the series never measured.
 *
 * No points draws the reference alone, which is what the zero state shows. Rendering the
 * same component there is what keeps the ghost and the live chart from disagreeing about
 * where the reference sits.
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
  /** Sits in the gutter beside the dashed rule, e.g. "90%". */
  targetLabel?: string | undefined;
  className?: string | undefined;
  label: string;
}) {
  const { i18n } = useLingui();
  const values = points.map((p) => p.value);
  const lo = Math.min(...values, target ?? 1) - 0.05;
  const hi = Math.max(...values, target ?? 0) + 0.05;
  const span = Math.max(0.14, hi - lo);
  const floor = Math.max(0, Math.min(lo, 1 - span));

  const t0 = points[0]?.t ?? 0;
  const tn = points.at(-1)?.t ?? 0;
  const elapsed = tn - t0;
  const x = (t: number) =>
    elapsed === 0 ? (GUTTER + W - PAD_R) / 2 : GUTTER + ((t - t0) / elapsed) * (W - PAD_R - GUTTER);
  const y = (v: number) => H - PAD_Y - ((v - floor) / span) * (H - PAD_Y * 2);

  const xy = points.map((p) => ({ x: x(p.t), y: y(p.value) }));
  const last = xy.at(-1);
  const lastValue = points.at(-1)?.value;
  const targetShown = target !== undefined && target >= floor && target <= floor + span;

  return (
    <div className={clsx("flex h-full w-full flex-col", className)}>
      {/*
       * The plot is its own box because every label and dot below is HTML positioned over
       * the drawing as a percentage. Measuring them against the outer box instead would
       * put them off the line by the height of the end-label row.
       */}
      <div className="relative min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          // Stretched to the box rather than scaled by aspect ratio, so the chart fills the
          // height it is given instead of growing past it as the plate widens. Every stroke
          // carries `non-scaling-stroke` so the stretch cannot thin the line, and the two
          // things that must stay round or upright — the dots and the reference label — are
          // HTML positioned over the drawing rather than shapes inside it.
          preserveAspectRatio="none"
          className="block h-full w-full"
          role="img"
          aria-label={label}
        >
          <title>{label}</title>
          {targetShown && (
            // Inset to the series rather than spanning the viewBox: a reference that runs
            // past both ends of the data claims a span the chart never measured.
            <line
              x1={GUTTER}
              x2={W - PAD_R}
              y1={y(target)}
              y2={y(target)}
              stroke="var(--edge-2)"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {points.length > 1 && (
            <path
              d={curve(xy)}
              fill="none"
              stroke="var(--text)"
              strokeOpacity="0.55"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* No area fill. At these point counts it reads as a grey slab with hard sides
              rather than as weight under the line. */}
        </svg>
        {xy.slice(0, -1).map((p, i) => (
          <span
            key={points[i]?.at}
            className="pointer-events-none absolute size-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-text/45"
            style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%` }}
            aria-hidden="true"
          />
        ))}
        {last && (
          <span
            className="pointer-events-none absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber"
            style={{ left: `${(last.x / W) * 100}%`, top: `${(last.y / H) * 100}%` }}
            aria-hidden="true"
          />
        )}
        {/* In the gutter, clear of the marks. An opaque chip on the rule punches a hole
            through the very line it is labelling. Positioned in HTML so it stays 11 px at
            every width, and `muted` rather than `faint` because it is a value to read. */}
        {targetShown && targetLabel && (
          <span
            className="pointer-events-none absolute start-0 -translate-y-1/2 text-2xs text-muted tabular-nums"
            style={{ top: `${(y(target) / H) * 100}%` }}
            aria-hidden="true"
          >
            {targetLabel}
          </span>
        )}
      </div>
      {/* The period the line covers, and the value its last bucket reached. The endpoint's
          number lives here rather than floating by the dot: above the dot it lands on the
          reference rule whenever the last bucket is under target, and below it lands on
          this row. The row keeps its height with no points so the ghost's plot matches. */}
      <div
        className="flex justify-between text-2xs text-muted"
        style={{ height: ENDS_H, marginInlineStart: `${(GUTTER / W) * 100}%` }}
        aria-hidden="true"
      >
        <span>{points[0]?.short}</span>
        {lastValue !== undefined && points.length > 1 && (
          <span>
            {points.at(-1)?.short}{" "}
            <b className="font-medium text-text tabular-nums">
              {i18n.number(lastValue, { style: "percent" })}
            </b>
          </span>
        )}
      </div>
    </div>
  );
}
