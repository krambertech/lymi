import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { ReviewDayOutcome } from "@lymi/core";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import { IconButton } from "./button";

/** Calendar arithmetic on a local YYYY-MM-DD, which no timezone can shift. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n)).toISOString().slice(0, 10);
}

/** A local YYYY-MM moved by whole months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1 + n, 1)).toISOString().slice(0, 7);
}

/**
 * The faint amber inside a ring and along the band. Opaque, so where the two overlap it stays one
 * colour instead of doubling, and a pixel of overlap between days hides the seam.
 */
const RUN_FILL = "bg-[color-mix(in_oklab,var(--amber)_16%,var(--plate))]";

/** A rest day's stretch of band: lighter than the run, edged in dashes so rest never rests on colour alone. */
const REST_FILL = "bg-[color-mix(in_oklab,var(--amber)_7%,var(--plate))]";
const REST_EDGE = "border-y-2 border-dashed border-amber";

/** A local date as a Date at noon UTC, so formatting it in UTC can never slip a day. */
const asDate = (date: string) => new Date(`${date}T12:00:00Z`);

interface Props {
  /** The days that had an attempt or a nothing-due confirmation. Missing days had neither. */
  days: Map<string, { attempts: number; satisfied: boolean; outcome: ReviewDayOutcome | null }>;
  today: string;
  /** The local YYYY-MM on show. */
  month: string;
  onMonth: (month: string) => void;
  /** The earliest month worth paging back to: the first review's. */
  firstMonth: string;
  /** The dates of the current run, drawn in from its first day when the panel opens. */
  run?: Set<string> | undefined;
  /** Past days that fell short but kept the run. */
  rest?: Set<string> | undefined;
}

/**
 * A month of days, Monday first. A day that counted toward a streak is ringed in amber, and a
 * faint band joins it to the days beside it that kept the run, so a run is a length you can see.
 * A nothing-due day carries the band without a ring, because it kept the run without adding. A
 * rest day carries it too, lighter and between dashed edges, and an end with nothing beside it
 * rounds off in a dashed cap.
 */
export function StreakCalendar({ days, today, month, onMonth, firstMonth, run, rest }: Props) {
  const { t, i18n } = useLingui();
  const utc = { timeZone: "UTC" } as const;
  const first = `${month}-01`;
  const lead = (asDate(first).getUTCDay() + 6) % 7;
  const length = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const cells: { key: string; date: string | null }[] = [
    ...Array.from({ length: lead }, (_, n) => ({ key: `lead-${n}`, date: null })),
    ...Array.from({ length }, (_, n) => {
      const date = addDays(first, n);
      return { key: date, date };
    }),
  ];
  while (cells.length % 7) cells.push({ key: `trail-${cells.length}`, date: null });
  const weeks = Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  const weekday = new Intl.DateTimeFormat(i18n.locale, { weekday: "narrow", ...utc });
  const weekdayLong = new Intl.DateTimeFormat(i18n.locale, { weekday: "long", ...utc });
  const monday = "2026-09-07";
  const heads = Array.from({ length: 7 }, (_, i) => asDate(addDays(monday, i)));
  const title = i18n.date(asDate(first), { month: "long", year: "numeric", ...utc });
  const dayLabel = new Intl.DateTimeFormat(i18n.locale, { day: "numeric", month: "long", ...utc });
  const thisMonth = today.slice(0, 7);
  const atStart = month <= firstMonth;
  const atEnd = month >= thisMonth;
  const keeps = (date: string | null | undefined) => {
    if (date && rest?.has(date)) return true;
    const d = date ? days.get(date) : undefined;
    return !!d && (d.satisfied || d.outcome === "nothing_due");
  };
  const restInMonth = !!rest && [...rest].some((d) => d.startsWith(month));
  const runOrder = run ? [...run].sort() : [];

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-medium text-text" aria-live="polite">
          {title}
        </h3>
        {/* Pulled out like the place's close, so the chevron ends under the X, and out of the row's height. */}
        <div className="-my-1.5 -me-3 flex items-center gap-0.5 [--hit-x:-1px]">
          <IconButton
            label={t`Previous month`}
            size="sm"
            aria-disabled={atStart || undefined}
            onClick={() => !atStart && onMonth(addMonths(month, -1))}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-35"
          >
            <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={t`Next month`}
            size="sm"
            aria-disabled={atEnd || undefined}
            onClick={() => !atEnd && onMonth(addMonths(month, 1))}
            className="aria-disabled:pointer-events-none aria-disabled:opacity-35"
          >
            <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <table key={month} className="enter-fade w-full table-fixed border-collapse">
        <caption className="sr-only">{title}</caption>
        <thead>
          <tr>
            {heads.map((d) => (
              <th
                key={d.toISOString()}
                scope="col"
                abbr={weekdayLong.format(d)}
                className="pb-1.5 text-center text-xs font-medium text-muted"
              >
                {weekday.format(d)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.key}>
              {week.map(({ key, date }, i) => {
                if (!date) return <td key={key} className="h-9" />;
                const entry = days.get(date);
                const count = entry?.attempts ?? 0;
                const on = !!entry?.satisfied;
                const kept = keeps(date);
                const isToday = date === today;
                const future = date > today;
                const resting = !!rest?.has(date);
                const joinsBefore = kept && keeps(week[i - 1]?.date);
                const joinsAfter = kept && keeps(week[i + 1]?.date);
                const restBefore = joinsBefore && !!rest?.has(week[i - 1]?.date ?? "");
                const restAfter = joinsAfter && !!rest?.has(week[i + 1]?.date ?? "");
                const drawAt = run?.has(date) ? runOrder.indexOf(date) : -1;
                const delay =
                  drawAt >= 0
                    ? ({ "--draw-delay": `${Math.min(drawAt, 14) * 28}ms` } as CSSProperties)
                    : undefined;
                const day = dayLabel.format(asDate(date));
                const reviews = plural(count, { one: "# review", other: "# reviews" });
                // Each way a day can end has its own sentence: only one of them met a goal.
                const label = future
                  ? t`${day}: not yet`
                  : resting
                    ? count === 0
                      ? t`${day}: rest day`
                      : t`${day}: rest day, ${reviews}`
                    : entry?.outcome === "nothing_due"
                      ? isToday
                        ? t`Today, ${day}: nothing due`
                        : t`${day}: nothing due`
                      : count === 0
                        ? isToday
                          ? t`Today, ${day}: no reviews yet`
                          : t`${day}: no reviews`
                        : entry?.outcome === "goal_met"
                          ? isToday
                            ? t`Today, ${day}: goal reached, ${reviews}`
                            : t`${day}: goal reached, ${reviews}`
                          : entry?.outcome === "exhausted"
                            ? isToday
                              ? t`Today, ${day}: all due cards reviewed, ${reviews}`
                              : t`${day}: all due cards reviewed, ${reviews}`
                            : isToday
                              ? t`Today, ${day}: ${reviews}`
                              : on
                                ? t`${day}: ${reviews}`
                                : t`${day}: ${reviews}, goal missed`;
                return (
                  <td key={key} className="relative h-10 p-0 text-center">
                    {resting ? (
                      // Ends with no kept day beside them, such as yesterday before an open today, round off.
                      <i
                        aria-hidden="true"
                        className={clsx(
                          "absolute top-1/2 block h-8 -translate-y-1/2",
                          REST_FILL,
                          REST_EDGE,
                          joinsBefore
                            ? "-start-px"
                            : "start-[calc(50%-1rem)] rounded-s-full border-s-2",
                          joinsAfter ? "-end-px" : "end-[calc(50%-1rem)] rounded-e-full border-e-2",
                          drawAt >= 0 && "streak-draw",
                        )}
                        style={delay}
                      />
                    ) : (
                      // Each half runs from this circle's centre to the neighbour's, so the circles cap
                      // the band, and beside a rest day that half carries the dashes up to the ring.
                      <>
                        {joinsBefore && (
                          <i
                            aria-hidden="true"
                            className={clsx(
                              "absolute top-1/2 -start-px end-1/2 block h-8 -translate-y-1/2",
                              restBefore ? `${REST_FILL} ${REST_EDGE}` : RUN_FILL,
                              drawAt >= 0 && "streak-draw",
                            )}
                            style={delay}
                          />
                        )}
                        {joinsAfter && (
                          <i
                            aria-hidden="true"
                            className={clsx(
                              "absolute top-1/2 start-1/2 -end-px block h-8 -translate-y-1/2",
                              restAfter ? `${REST_FILL} ${REST_EDGE}` : RUN_FILL,
                              drawAt >= 0 && "streak-draw",
                            )}
                            style={delay}
                          />
                        )}
                      </>
                    )}
                    {on && (
                      <i
                        aria-hidden="true"
                        className={clsx(
                          "absolute top-1/2 left-1/2 block size-8 -translate-1/2 rounded-full shadow-[inset_0_0_0_2px_var(--amber)]",
                          RUN_FILL,
                          drawAt >= 0 && "streak-pop",
                        )}
                        style={delay}
                      />
                    )}
                    {isToday && !on && (
                      <i
                        aria-hidden="true"
                        className="absolute top-1/2 left-1/2 block size-8 -translate-1/2 rounded-full edge-2"
                      />
                    )}
                    {/* Dashed is this system's mark for "not here yet", so a day still to come cannot
                        be read as a day that was missed, in any palette or in none. */}
                    {future && (
                      <i
                        aria-hidden="true"
                        className="absolute top-1/2 left-1/2 block size-8 -translate-1/2 rounded-full border border-dashed border-edge-2"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "relative text-sm tabular-nums",
                        on ? "font-medium text-text" : future ? "text-faint" : "text-muted",
                        isToday && "font-semibold",
                      )}
                    >
                      {asDate(date).getUTCDate()}
                    </span>
                    <span className="sr-only">{label}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {restInMonth && (
        <p className="flex items-center gap-3 pt-1 text-sm text-text-2">
          <RestGlyph />
          <Trans>A rest day keeps the streak through one missed day a week.</Trans>
        </p>
      )}
    </div>
  );
}

/**
 * Two counted days and the dashed bridge between them, in the month's proportions: the band is as
 * tall as the rings. The key to a rest day, and its banner's mark.
 */
export function RestGlyph({ className }: { className?: string | undefined }) {
  const ring = "size-4.5 shrink-0 rounded-full shadow-[inset_0_0_0_2px_var(--amber)]";
  return (
    <span aria-hidden="true" className={clsx("flex shrink-0 items-center", className)}>
      <i className={clsx("block", ring, RUN_FILL)} />
      <i
        className={clsx(
          "-mx-px block h-4.5 w-4",
          REST_FILL,
          "border-y-2 border-dashed border-amber",
        )}
      />
      <i className={clsx("block", ring, RUN_FILL)} />
    </span>
  );
}
