import type { IntervalGuide } from "@lymi/core/simulation";
import { type PointerEvent, useId, useRef, useState } from "react";
import { days, percent } from "./format";
import { useWidth } from "./useWidth";

interface Props {
  curves: IntervalGuide["curves"];
  retention: number;
}

const HEIGHT = 264;
const PAD = { top: 28, right: 96, bottom: 44, left: 40 };
const Y_MIN = 0.5;

/**
 * Retrievability falling after a review, for cards on three intervals. Each curve crosses the
 * target on the day that card is due, which is the whole scheduling rule in one picture.
 */
export function ForgettingCurves({ curves, retention }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box, 640);
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const longest = (curves.series.at(-1)?.points.length ?? 1) - 1;
  const xMax = longest * curves.stepDays;
  const plotW = Math.max(120, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (day: number) => PAD.left + (day / xMax) * plotW;
  const y = (r: number) => PAD.top + ((1 - r) / (1 - Y_MIN)) * plotH;
  const tick = xMax <= 60 ? 10 : Math.ceil(xMax / 60) * 10;
  const ticks = Array.from({ length: Math.floor(xMax / tick) + 1 }, (_, i) => i * tick);
  // Ink at graded opacity, strongest for the card that holds on longest.
  const opacity = (i: number) => [0.42, 0.68, 1][i] ?? 1;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const day = ((e.clientX - rect.left - PAD.left) / plotW) * xMax;
    setHover(day < 0 || day > xMax ? null : Math.round(day));
  };

  const at = (points: number[], day: number) => points[Math.round(day / curves.stepDays)] ?? 0;

  return (
    <div ref={box} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-labelledby={titleId}
        className="block max-w-full touch-pan-y overflow-visible"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <title id={titleId}>
          {`Recall falling after a review. ${curves.series
            .map(
              (s) =>
                `A card due after ${days(s.interval)} falls to ${percent(retention)} on day ${s.interval}.`,
            )
            .join(" ")}`}
        </title>

        {[...new Set([1, retention, 0.7, Y_MIN])].map((r) => (
          <g key={r}>
            <line
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(r)}
              y2={y(r)}
              stroke="var(--edge)"
              strokeDasharray={r === retention ? undefined : "2 4"}
            />
            <text
              x={PAD.left - 8}
              y={y(r)}
              dy="0.32em"
              textAnchor="end"
              className={
                r === retention
                  ? "fill-text text-2xs font-medium tabular-nums"
                  : "fill-muted text-2xs tabular-nums"
              }
            >
              {percent(r)}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left + plotW}
          y1={y(retention)}
          y2={y(retention)}
          stroke="var(--text)"
          strokeOpacity={0.5}
          strokeWidth={1}
          strokeDasharray="5 4"
        />

        {ticks.map((t) => (
          <text
            key={t}
            x={x(t)}
            y={HEIGHT - PAD.bottom + 18}
            textAnchor="middle"
            className="fill-muted text-2xs tabular-nums"
          >
            {t}
          </text>
        ))}
        <text x={PAD.left + plotW} y={HEIGHT - 2} textAnchor="end" className="fill-muted text-2xs">
          Days since the review
        </text>

        {curves.series.map((s, i) => {
          const d = s.points
            .map(
              (r, j) =>
                `${j === 0 ? "M" : "L"}${x(j * curves.stepDays).toFixed(1)} ${y(Math.max(Y_MIN, r)).toFixed(1)}`,
            )
            .join(" ");
          const end = s.points.at(-1) ?? 0;
          return (
            <g key={s.interval}>
              <path
                d={d}
                fill="none"
                stroke="var(--text)"
                strokeOpacity={opacity(i)}
                strokeWidth={1.75}
              />
              <circle
                cx={x(s.interval)}
                cy={y(retention)}
                r={3.5}
                fill="var(--plate)"
                stroke="var(--text)"
                strokeWidth={1.5}
              />
              <text
                x={PAD.left + plotW + 8}
                y={y(Math.max(Y_MIN, end))}
                dy="0.32em"
                className="fill-text-2 text-2xs"
              >
                <tspan className="font-medium fill-text">{days(s.interval)}</tspan>
                <tspan className="fill-muted"> interval</tspan>
              </text>
            </g>
          );
        })}

        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--edge-2)"
            />
            {curves.series.map((s, i) => (
              <circle
                key={s.interval}
                cx={x(hover)}
                cy={y(Math.max(Y_MIN, at(s.points, hover)))}
                r={3}
                fill="var(--text)"
                fillOpacity={opacity(i)}
              />
            ))}
          </g>
        )}
      </svg>

      <p
        aria-hidden="true"
        className="pointer-events-none absolute start-10 top-0 text-2xs tabular-nums text-muted"
      >
        {hover !== null && (
          <>
            <span className="text-text">Day {hover}</span>
            {curves.series.map((s) => (
              <span key={s.interval}>
                {" · "}
                {percent(at(s.points, hover))}
              </span>
            ))}
          </>
        )}
      </p>
    </div>
  );
}
