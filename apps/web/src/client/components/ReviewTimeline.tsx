import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Clock } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { layoutTimeline, TIMELINE } from "../lib/timeline";
import { GradeMark, Mark } from "./Grade";

interface Props {
  /** When the word was added. The line starts here. */
  start: Date;
  /** Every review of every mode. */
  reviews: { id: string; at: Date; rating: number }[];
  /** When each started mode is back, keyed by its card state. */
  dues: { id: string; at: Date }[];
  now?: Date | undefined;
}

/** The gap an axis label needs from its neighbour before it is left out. */
const LABEL_ROOM = 56;
/** How far the line stops from a mark's centre. */
const CLEAR = TIMELINE.mark / 2 + 2;
/** A sliver of line between two close marks reads as a stray dash, so it is left out. */
const MIN_SEGMENT = 6;

/** [from, to] with a gap cut around each stop. */
function segments(from: number, to: number, stops: number[]): [number, number][] {
  const out: [number, number][] = [];
  let at = from;
  for (const x of [...stops].sort((a, b) => a - b)) {
    if (x + CLEAR <= from || x - CLEAR >= to) continue;
    if (x - CLEAR - at >= MIN_SEGMENT) out.push([at, x - CLEAR]);
    at = Math.max(at, x + CLEAR);
  }
  if (to - at >= MIN_SEGMENT) out.push([at, to]);
  return out;
}

/**
 * A word's reviews on one line through time, with a clock where each mode comes back.
 * Positions depend on the drawn width, so the line measures itself.
 */
export function ReviewTimeline({ start, reviews, dues, now = new Date() }: Props) {
  const { t, i18n } = useLingui();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const sorted = [...reviews].sort((a, b) => a.at.getTime() - b.at.getTime());
  const layout = layoutTimeline({
    start,
    now,
    reviews: sorted.map((r) => r.at),
    dues: dues.map((d) => d.at),
    width,
  });
  // The line stops short of every mark, so it never runs through an icon.
  const stops = [...layout.marks.map((m) => m.x), ...layout.rings];
  const day = (d: Date) =>
    i18n.date(d, {
      day: "numeric",
      month: "short",
      ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
    });
  const addedToday = start.toDateString() === now.toDateString();
  const endX = layout.at(layout.end);
  const showEnd = layout.endIsDue && endX - layout.today >= LABEL_ROOM;
  const showStart = !addedToday && layout.today >= LABEL_ROOM;
  const label = t`${plural(reviews.length, { one: "# review", other: "# reviews" })} since ${day(start)}`;

  return (
    <div className="grid gap-1">
      <div ref={ref} role="img" aria-label={label} className="relative h-6">
        {width > 0 && (
          <>
            {segments(layout.hidden > 0 ? TIMELINE.more : 0, layout.today, stops).map(
              ([from, to]) => (
                <span
                  key={`past-${from}`}
                  className="absolute top-1/2 h-px bg-edge-2"
                  style={{ insetInlineStart: from, width: to - from }}
                />
              ),
            )}
            {segments(layout.today, width, stops).map(([from, to]) => (
              <span
                key={`ahead-${from}`}
                className="absolute top-1/2 border-t border-dashed border-edge-2"
                style={{ insetInlineStart: from, width: to - from }}
              />
            ))}
            <span
              className="absolute inset-y-1 w-px bg-text-2"
              style={{ insetInlineStart: layout.today }}
            />
            {layout.hidden > 0 && (
              <span className="absolute start-0 top-1/2 -translate-y-1/2 pe-1 text-2xs font-medium text-muted tabular-nums">
                +{i18n.number(layout.hidden)}
              </span>
            )}
            {layout.marks.map(({ index, x }) => {
              const review = sorted[index];
              return review ? (
                <GradeMark
                  key={review.id}
                  rating={review.rating}
                  size="sm"
                  className="absolute top-1/2 -translate-y-1/2 rtl:translate-x-1/2 ltr:-translate-x-1/2"
                  style={{ insetInlineStart: x }}
                />
              ) : null;
            })}
            {dues.map((due, i) => (
              <Mark
                key={due.id}
                icon={Clock}
                size="sm"
                className="absolute top-1/2 -translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2"
                style={{ insetInlineStart: layout.rings[i] }}
              />
            ))}
          </>
        )}
      </div>
      <div aria-hidden="true" className="relative h-4 text-2xs text-muted tabular-nums">
        {width > 0 && (
          <>
            {addedToday ? (
              <span className="absolute start-0">{t`Added today`}</span>
            ) : (
              <>
                {showStart && <span className="absolute start-0">{day(start)}</span>}
                <span
                  className={clsx(
                    "absolute whitespace-nowrap",
                    layout.today >= LABEL_ROOM / 2 && "ltr:-translate-x-1/2 rtl:translate-x-1/2",
                  )}
                  style={{ insetInlineStart: layout.today >= LABEL_ROOM / 2 ? layout.today : 0 }}
                >
                  {t`Today`}
                </span>
              </>
            )}
            {showEnd && <span className="absolute end-0">{day(layout.end)}</span>}
          </>
        )}
      </div>
    </div>
  );
}
