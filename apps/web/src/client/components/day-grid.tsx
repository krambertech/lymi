import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { InsightsOut } from "@lymi/core";
import { clsx } from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "./button";
import { LIGHT_FILL } from "./seven-lights";
import { addDays } from "./streak-calendar";
import { createTooltipHandle, Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

type Day = InsightsOut["activity"]["days"][number];

/** A local date as a Date at noon UTC, so formatting it in UTC can never slip a day. */
const asDate = (date: string) => new Date(`${date}T12:00:00Z`);

/** Days from Monday, so a week is one column whatever weekday the locale's calendars start on. */
const dow = (date: string) => (asDate(date).getUTCDay() + 6) % 7;

const daysBetween = (from: string, to: string) =>
  Math.round((asDate(to).getTime() - asDate(from).getTime()) / 86_400_000);

/** The cell, the space beside it and the month row, in px: the arithmetic needs them as numbers. */
const CELL = 28;
const GAP = 4;
const MONTH_ROW = 20;

/**
 * What the grid settles at, so a skeleton can hold its place and the section under it never
 * jumps: the header row, the gap under it, and a field of seven cells under the month band.
 */
export const DAY_GRID_HEIGHT = 32 + 6 + (2 * GAP + (GAP + MONTH_ROW) + 7 * CELL + 7 * GAP);

/** The shortest field: a year of weeks, which is the span the picture is read against. */
const YEAR_WEEKS = 52;

/** Any Monday, for naming the weekday rows without reaching for a real date in the data. */
const A_MONDAY = "2026-09-07";

/**
 * One popup for the whole field. A root per cell costs about ten times the mount of a plain
 * button, and a year is 371 cells before any history is added, so the cells share this handle
 * and each carries its own sentence as the payload.
 */
const tip = createTooltipHandle<string>();

/**
 * Where a day sits between nothing and its goal, in the seven lights' three steps and for the
 * same reason: the reference is that day's own goal, so lowering today's goal never rewrites
 * how an earlier day looks. A day from before goals, or one an import filled in, is drawn
 * against the goal in force now, which is the only reference it has.
 */
function level(day: Day | undefined, current: number): 0 | 1 | 2 | 3 {
  if (!day || day.attempts <= 0) return 0;
  const goal = day.goal ?? current;
  if (day.attempts >= goal) return 3;
  return day.attempts >= goal / 2 ? 2 : 1;
}

/** The 1st of a month inside the week starting `weekStart`, when the week holds one. */
function monthStartIn(weekStart: string): string | null {
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    if (date.endsWith("-01")) return date;
  }
  return null;
}

interface Props {
  /** Every day that held an attempt, oldest first. A day with nothing is absent. */
  days: Day[];
  /** Today in the review timezone, which is where "not yet" begins. */
  today: string;
  /** The first day with a review. The field starts there when that is further back than a year. */
  firstDay: string;
  /** The goal in force now, for a day that carries none of its own. */
  goal: number;
  /** The section's heading and count, which share a row with the arrows. */
  header?: ReactNode | undefined;
}

/**
 * Every day since the first review: a column per week, a row per weekday. One continuous field
 * rather than a block per month, so the weekday rows run the whole way across and a month is
 * marked by its name alone. The span is whole weeks, so the field is a rectangle whatever
 * weekday a month begins on. It scrolls sideways and comes to rest at the start of a month,
 * which is also what the arrows move it by.
 *
 * This is the one figure that grades a day by how much it held. The thirty-day strip beside it
 * deliberately does not, because over a month shading by volume turns a habit picture into a
 * scoreboard. Here the volume is the subject and the goal is what it is measured against.
 */
export function DayGrid({ days, today, firstDay, goal, header }: Props) {
  const { t, i18n } = useLingui();
  const scroller = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(false);
  const [atEnd, setAtEnd] = useState(true);

  const byDate = new Map(days.map((d) => [d.date, d]));
  // A constant frame, as the thirty-day strip has: always the last year at least, so a first
  // week reads as a first week instead of filling the field the way a finished year would.
  // Days before the first review are unlit, not absent.
  const floor = addDays(today, -(YEAR_WEEKS * 7 - 1));
  const start = firstDay < floor ? firstDay : floor;
  const from = addDays(start, -dow(start));
  const to = addDays(today, 6 - dow(today));
  const columns = (daysBetween(from, to) + 1) / 7;

  // One group per run of weeks under the same name. A week holding a 1st starts a new group; a
  // leading part week whose month began before the field is left unnamed rather than mislabelled.
  const groups: { month: string | null; span: number; col: number }[] = [];
  for (let c = 0; c < columns; c++) {
    const starts = monthStartIn(addDays(from, c * 7));
    const last = groups.at(-1);
    if (starts || !last) groups.push({ month: starts?.slice(0, 7) ?? null, span: 1, col: c });
    else last.span++;
  }
  // The leading part month has no 1st in view to be named above, so it takes the name of the
  // month it ends in — unless it is a single week, most of which belongs to the month before.
  const lead = groups[0];
  if (lead && !lead.month && lead.span > 1) {
    lead.month = addDays(from, lead.span * 7 - 1).slice(0, 7);
  }

  const utc = { timeZone: "UTC" } as const;
  const monthName = new Intl.DateTimeFormat(i18n.locale, { month: "short", ...utc });
  const weekdayNarrow = new Intl.DateTimeFormat(i18n.locale, { weekday: "narrow", ...utc });
  const dayName = new Intl.DateTimeFormat(i18n.locale, { day: "numeric", month: "long", ...utc });

  /**
   * One day in one sentence. Each way a day can end has its own, whole and reorderable, as the
   * streak month does: a sentence assembled from a "Today," fragment cannot be translated.
   */
  const sentence = (date: string): string => {
    const day = dayName.format(asDate(date));
    if (date > today) return t`${day}: not yet`;
    const entry = byDate.get(date);
    const isToday = date === today;
    const n = entry?.attempts ?? 0;
    const reviews = plural(n, { one: "# review", other: "# reviews" });
    if (entry?.outcome === "nothing_due") {
      return isToday ? t`Today, ${day}: nothing due` : t`${day}: nothing due`;
    }
    if (n === 0) {
      return isToday ? t`Today, ${day}: no reviews yet` : t`${day}: no reviews`;
    }
    if (entry?.outcome === "goal_met") {
      return isToday
        ? t`Today, ${day}: goal reached, ${reviews}`
        : t`${day}: goal reached, ${reviews}`;
    }
    if (entry?.outcome === "exhausted") {
      return isToday
        ? t`Today, ${day}: all due cards reviewed, ${reviews}`
        : t`${day}: all due cards reviewed, ${reviews}`;
    }
    // No goal of its own: history from before goals, or a day an import filled in.
    if (entry?.goal == null) {
      if (entry?.satisfied) return isToday ? t`Today, ${day}: ${reviews}` : t`${day}: ${reviews}`;
      return isToday
        ? t`Today, ${day}: ${reviews}, from an import`
        : t`${day}: ${reviews}, from an import`;
    }
    const goal = entry.goal;
    if (isToday) return t`Today, ${day}: ${reviews} of ${goal}`;
    // Imported recalls are counted here but were never measured, so a day they push past its
    // goal keeps the count and drops the verdict rather than calling a full cell missed.
    if (n < goal) return t`${day}: ${reviews}, goal missed`;
    return t`${day}: ${reviews}`;
  };

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const left = Math.abs(el.scrollLeft);
    setAtStart(left <= 1);
    setAtEnd(left >= el.scrollWidth - el.clientWidth - 1);
  }, []);

  // Opens on today, because the last thing done is what a learner came to look at.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    // A right-to-left scroller counts from the other end; the browser clamps either way.
    el.scrollLeft = getComputedStyle(el).direction === "rtl" ? -el.scrollWidth : el.scrollWidth;
    sync();
  }, [sync]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync]);

  /**
   * Steps a whole month either way. The stops are measured from the rendered month labels
   * rather than computed from the cell size, which would drift by the table's own spacing and
   * leave a press moving a few pixels instead of a month.
   */
  const page = (back: boolean) => {
    const el = scroller.current;
    if (!el) return;
    // How far the field has to travel from its own start edge to bring each month there, which
    // in a right-to-left scroller is measured from the right. `scrollLeft` counts the same way
    // once its sign is dropped, so the two are comparable in either direction.
    const rtl = getComputedStyle(el).direction === "rtl";
    const months = [...el.querySelectorAll<HTMLElement>("th[data-month]")];
    const stops = months
      .map((th) => (rtl ? el.scrollWidth - th.offsetLeft - th.offsetWidth : th.offsetLeft))
      .sort((a, b) => a - b);
    if (stops.length === 0) return;
    const left = Math.abs(el.scrollLeft);
    // A cell of slack, so the month already at the edge counts as where we are, not as a step.
    let here = 0;
    while (here + 1 < stops.length && (stops[here + 1] ?? 0) <= left + CELL) here++;
    const to = back ? Math.max(0, here - 1) : Math.min(stops.length - 1, here + 1);
    const target = stops[to] ?? 0;
    el.scrollTo({ left: rtl ? -target : target, behavior: "smooth" });
  };

  const total = days.reduce((n, d) => n + d.attempts, 0);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        {header}
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={t`Earlier months`}
            size="sm"
            aria-disabled={atStart || undefined}
            onClick={() => !atStart && page(true)}
          >
            <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
          </IconButton>
          <IconButton
            label={t`Later months`}
            size="sm"
            aria-disabled={atEnd || undefined}
            onClick={() => !atEnd && page(false)}
          >
            <ChevronRight className="rtl:-scale-x-100" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <div className="flex items-start gap-1.5">
        {/* Outside the scroller, so the weekdays stay put while the months move under them. The
            padding is everything standing above the first cell inside it: the scroller's own,
            the month row, and the table's spacing either side of that row. */}
        <div
          aria-hidden="true"
          className="grid shrink-0 gap-1 text-2xs text-faint"
          style={{
            gridTemplateRows: `repeat(7, ${CELL}px)`,
            paddingTop: GAP + GAP + MONTH_ROW + GAP,
          }}
        >
          {Array.from({ length: 7 }, (_, i) => (
            <span key={addDays(A_MONDAY, i)} className="flex h-7 items-center justify-end pe-0.5">
              {weekdayNarrow.format(asDate(addDays(A_MONDAY, i)))}
            </span>
          ))}
        </div>

        <div
          ref={scroller}
          onScroll={sync}
          className="relative -my-1 min-w-0 flex-1 snap-x snap-proximity overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <table className="w-max border-separate" style={{ borderSpacing: `${GAP}px` }}>
            <caption className="sr-only">
              {t`Reviews by day, one column a week. ${plural(total, { one: "# review", other: "# reviews" })} in all.`}
            </caption>
            <thead>
              <tr>
                {groups.map((g) => (
                  <th
                    key={g.col}
                    scope="colgroup"
                    colSpan={g.span}
                    data-month={g.month ?? undefined}
                    style={{ height: MONTH_ROW }}
                    className={clsx(
                      "p-0 text-start align-middle text-2xs font-normal whitespace-nowrap",
                      g.month === today.slice(0, 7) ? "font-medium text-text-2" : "text-muted",
                      // The start of a month is where a swipe comes to rest.
                      g.month && "snap-start",
                    )}
                  >
                    {g.month ? monthName.format(asDate(`${g.month}-01`)) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }, (_, r) => (
                <tr key={addDays(A_MONDAY, r)}>
                  {Array.from({ length: columns }, (_, c) => {
                    const date = addDays(from, c * 7 + r);
                    const entry = byDate.get(date);
                    const future = date > today;
                    const l = future ? 0 : level(entry, goal);
                    // Counted without filling: nothing left to do, or nothing due at all. The
                    // streak keeps a nothing-due day the same way, so the grid rings it too.
                    const kept =
                      !future && (!!entry?.satisfied || entry?.outcome === "nothing_due") && l < 3;
                    const say = sentence(date);
                    return (
                      <td key={date} className="p-0">
                        {/* The popup repeats the cell's own accessible name, so it is hidden
                            from assistive technology and the label is what a reader gets. */}
                        <TooltipTrigger
                          handle={tip}
                          payload={say}
                          render={
                            <button
                              type="button"
                              // Out of the tab order: a year of history would be a year of tab
                              // stops, and each cell's label is what a reader needs from it.
                              tabIndex={-1}
                              aria-label={say}
                              className={clsx(
                                "relative block size-7 cursor-default rounded-[6px_6px_8px_8px]",
                                // Hover veils the cell in ink, which is light in the dark room, so
                                // every state answers the pointer without a second ring beside the
                                // ones that already mean today and a day kept.
                                "after:absolute after:inset-0 after:rounded-[inherit] after:bg-text after:opacity-0 after:transition-opacity after:duration-150 hover:after:opacity-10",
                                future
                                  ? // Dashed is this system's mark for "not here yet", so a day
                                    // still to come never reads as a day that was missed.
                                    "border border-dashed border-edge-2"
                                  : l === 0
                                    ? "edge-inset bg-plate-2"
                                    : LIGHT_FILL[l],
                                kept && "shadow-[inset_0_0_0_1.5px_var(--amber)]",
                                date === today && "outline-1 outline-offset-2 outline-text-2",
                              )}
                            />
                          }
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {/* The field's one popup, which every cell opens with its own sentence. */}
          <Tooltip handle={tip}>
            {({ payload }) => <TooltipContent>{payload}</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
