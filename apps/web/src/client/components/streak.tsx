import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { StreakOut } from "@lymi/core";
import { clsx } from "clsx";
import { CalendarCheck, Check, type LucideIcon, Pencil, Trophy } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { streakFlameFor } from "../lib/flame";
import { IconButton } from "./button";
import { Flame } from "./flame";
import { GoalPicker } from "./goal-picker";
import { InlineError } from "./inline-error";
import { PlaceBar } from "./layout/place-bar";
import { SevenLights } from "./seven-lights";
import { Skeleton } from "./skeleton";
import { addDays, StreakCalendar } from "./streak-calendar";
import { Dialog, DialogContent, usePlaceShape } from "./ui/dialog";

export type StreakSummary = StreakOut;

const satisfied = (outcome: StreakSummary["today"]["outcome"]) =>
  outcome === "goal_met" || outcome === "exhausted";

/** Yesterday fell short and the run carried on through it: the morning after a rest day. */
export function restedYesterday(summary: StreakSummary): boolean {
  return summary.restDays.includes(addDays(summary.today.date, -1));
}

/**
 * The last `n` local days, oldest first, today last: attempts and whether each counted toward a
 * streak. What the seven lights read.
 */
export function lastDays(summary: StreakSummary, n = 7) {
  const byDate = new Map(summary.days.map((d) => [d.date, d]));
  const rest = new Set(summary.restDays);
  const dates = Array.from({ length: n }, (_, i) => addDays(summary.today.date, i - (n - 1)));
  const days = dates.map((date) => byDate.get(date));
  return {
    dates,
    attempts: days.map((d) => d?.attempts ?? 0),
    satisfied: days.map((d) => d?.satisfied ?? false),
    rest: dates.map((date) => rest.has(date)),
    goals: days.map((d, i) => (i === n - 1 ? summary.today.goal : (d?.goal ?? null))),
  };
}

interface PillProps {
  summary: StreakSummary | undefined;
  /** "rail" sits on the sidebar's first line; "phone" in the top bar, beside capture. */
  variant: "rail" | "phone";
}

/** The pill in the chrome, or the card on Today. Every face opens the same panel. */
export type StreakFace = PillProps["variant"] | "card";

/** The flame and the run, always in the chrome. docs/design/streak.md. */
function PillFace({ summary, variant }: PillProps) {
  const flame = summary ? streakFlameFor(summary) : "lit";
  const current = summary?.current ?? 0;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const ticked = mounted.current;
  const rail = variant === "rail";
  return (
    <>
      <Flame
        className={rail ? "h-4 w-[13px]" : "h-5 w-4"}
        state={flame}
        flicker={flame === "full"}
      />
      <span className="relative overflow-hidden tabular-nums">
        <span key={current} className={clsx("block", ticked && "streak-tick")}>
          {current}
        </span>
      </span>
    </>
  );
}

/**
 * The week and the run together, for Today and the end of a review: the lights say which days,
 * the number beside them says how many in a row. Secondary to whatever is above it, never the
 * largest number on the screen.
 */
export function StreakWeek({
  summary,
  size = "sm",
  className,
}: {
  summary: StreakSummary;
  size?: "sm" | "lg" | undefined;
  className?: string | undefined;
}) {
  const week = lastDays(summary);
  const large = size === "lg";
  return (
    <div
      className={clsx(
        // Stacked where the week fills the width; beside it, behind a rule, where there is room.
        "flex flex-col items-center gap-3 @md:flex-row",
        large ? "@md:gap-5" : "@md:gap-4",
        className,
      )}
    >
      <SevenLights
        days={week.attempts}
        satisfied={week.satisfied}
        rest={week.rest}
        goals={week.goals}
        dates={week.dates}
        size={size}
      />
      <p className="flex shrink-0 items-baseline gap-1.5 @md:grid @md:gap-0 @md:border-s @md:border-edge @md:ps-4 @md:text-start">
        <span
          className={clsx(
            "font-semibold leading-none tabular-nums text-text",
            large ? "text-lg @md:text-2xl" : "text-lg",
          )}
        >
          {summary.current}
        </span>
        <span className="whitespace-nowrap text-sm text-muted @md:mt-1 @md:text-xs">
          <Plural value={summary.current} one="day in a row" other="days in a row" />
        </span>
      </p>
    </div>
  );
}

/**
 * Today's attempts against the goal, in amber because it is the flame's own measure. It measures
 * the goal and nothing else: a day satisfied by running out of reviews stops where its attempts
 * stopped, and the line above it says the day counted.
 */
function GoalTrack({
  today,
  label,
  className,
}: {
  today: StreakSummary["today"];
  /** Omit inside a control that already says it, so the track is not announced twice. */
  label?: string | undefined;
  className?: string | undefined;
}) {
  const reached = Math.min(today.attempts, today.goal);
  return (
    <span
      {...(label
        ? {
            role: "progressbar",
            "aria-label": label,
            "aria-valuemin": 0,
            "aria-valuemax": today.goal,
            "aria-valuenow": reached,
          }
        : { "aria-hidden": true })}
      className={clsx("block h-1.5 overflow-hidden rounded-full bg-edge", className)}
    >
      <i
        className="streak-fill block h-full origin-left rounded-full bg-amber rtl:origin-right"
        style={{ transform: `scaleX(${today.goal > 0 ? reached / today.goal : 0})` }}
      />
    </span>
  );
}

/** The run and the week's lights: the streak card on Today. Today's own light shows its progress. */
function CardFace({ summary, status }: { summary: StreakSummary; status: string }) {
  const flame = streakFlameFor(summary);
  const { current } = summary;
  const week = lastDays(summary);
  return (
    <>
      <span className="grid gap-2">
        <span className="flex items-center gap-2.5">
          <Flame className="h-7 w-[22px]" state={flame} flicker={flame === "full"} />
          <span className="text-3xl font-medium leading-none tabular-nums">{current}</span>
          <span className="text-md font-medium text-text-2">
            <Plural value={current} one="day in a row" other="days in a row" />
          </span>
        </span>
        <span className="text-sm text-text-2 tabular-nums">{status}</span>
      </span>
      <SevenLights
        days={week.attempts}
        satisfied={week.satisfied}
        rest={week.rest}
        goals={week.goals}
        dates={week.dates}
        size="lg"
      />
    </>
  );
}

/** One line on where today stands against the streak: what is left, or that the day counts. */
export function useTodayStatus(summary: StreakSummary | undefined): string {
  const { t } = useLingui();
  if (!summary) return "";
  const { today } = summary;
  switch (today.outcome) {
    case "goal_met":
      return t`Daily goal reached.`;
    case "exhausted":
      return t`You’re done for today.`;
    case "nothing_due":
      return t`Nothing due today, so your streak is safe.`;
    default: {
      const left = Math.max(today.goal - today.attempts, 0);
      return t`${plural(left, { one: "# review", other: "# reviews" })} to today’s goal`;
    }
  }
}

/** One figure under today, with its icon and the words for it. */
function Figure({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="grid gap-0.5 px-4 py-3.5 not-first:border-s not-first:border-edge">
      <dt className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-md font-medium tabular-nums text-text">{value}</dd>
    </div>
  );
}

export interface StreakPanelProps {
  summary: StreakSummary;
  onGoalChange?: ((goal: number) => void) | undefined;
  /** "Saved" after a goal change lands, or the error that stopped it. */
  goalStatus?: "saving" | "saved" | "error" | undefined;
  titleId?: string | undefined;
  className?: string | undefined;
  /** Given when the panel is a place, and it then opens with the place's bar. */
  onClose?: (() => void) | undefined;
  /** The screen under the place, which back names on a phone. */
  returnsTo?: string | undefined;
}

/**
 * What the flame opens: the run, today against the goal, the two figures that put it in context,
 * and the month it sits in. The goal is a second view inside the same panel, so changing it
 * never loses your place, and this is the only place it is changed.
 */
export function StreakPanel({
  summary,
  onGoalChange,
  goalStatus,
  titleId,
  onClose,
  returnsTo,
  className,
}: StreakPanelProps) {
  const { t } = useLingui();
  const [view, setView] = useState<"streak" | "goal">("streak");
  const [month, setMonth] = useState(summary.today.date.slice(0, 7));
  const [drawRun, setDrawRun] = useState(true);
  const editRef = useRef<HTMLButtonElement>(null);
  const goalTitleRef = useRef<HTMLHeadingElement>(null);
  const { current, today } = summary;
  // A dialog or sheet names the view in its bar; a whole screen's bar is only the way back.
  const titleInBar = usePlaceShape() !== "screen";
  const done = satisfied(today.outcome);
  const flame = streakFlameFor(summary);
  const byDate = useMemo(() => new Map(summary.days.map((d) => [d.date, d])), [summary.days]);
  const rest = useMemo(() => new Set(summary.restDays), [summary.restDays]);
  const run = useMemo(() => {
    const dates = new Set<string>();
    const keeps = (date: string) => {
      const d = byDate.get(date);
      return rest.has(date) || (!!d && (d.satisfied || d.outcome === "nothing_due"));
    };
    let day = done ? today.date : addDays(today.date, -1);
    for (; keeps(day); day = addDays(day, -1)) {
      if (byDate.get(day)?.satisfied || rest.has(day)) dates.add(day);
    }
    return dates;
  }, [byDate, rest, done, today.date]);
  const firstMonth = summary.days[0]?.date.slice(0, 7) ?? today.date.slice(0, 7);

  // Only a change of view moves focus; comparing views, not counting runs, survives StrictMode's double effect.
  const shownView = useRef(view);
  useLayoutEffect(() => {
    if (shownView.current === view) return;
    shownView.current = view;
    (view === "goal" ? goalTitleRef : editRef).current?.focus();
  }, [view]);

  if (view === "goal") {
    const goalTitle = (
      <h2 ref={goalTitleRef} id={titleId} tabIndex={-1} className="outline-none">
        <Trans>Daily goal</Trans>
      </h2>
    );
    return (
      <div className={clsx("enter-fade grid gap-4", className)}>
        <PlaceBar
          back={{ label: t`Streak`, name: t`Back to streak`, onClick: () => setView("streak") }}
          title={titleInBar ? goalTitle : undefined}
          onClose={onClose}
          status={
            <p className="min-h-5 text-sm text-muted" role="status">
              {goalStatus === "saved" && (
                <span className="enter-fade inline-flex items-center gap-1.5">
                  <Check className="size-4" aria-hidden="true" />
                  <Trans>Saved</Trans>
                </span>
              )}
              {goalStatus === "error" && (
                <InlineError>
                  <Trans>Couldn’t save. Try again.</Trans>
                </InlineError>
              )}
            </p>
          }
        />
        {!titleInBar && <div className="text-xl font-medium text-text">{goalTitle}</div>}
        <p className="text-sm text-text-2">
          <Trans>How many reviews a day keep your streak. Every grade counts, even Forgot.</Trans>
        </p>
        <GoalPicker value={summary.goal} onValueChange={(n) => onGoalChange?.(n)} />
      </div>
    );
  }

  const status =
    today.outcome === "goal_met"
      ? t`Daily goal reached.`
      : today.outcome === "exhausted"
        ? t`You’re done for today.`
        : today.outcome === "nothing_due"
          ? t`Nothing due today, so your streak is safe.`
          : restedYesterday(summary)
            ? t`Yesterday was a rest day. Reach today’s goal to keep it going.`
            : current > 0
              ? t`Reach today’s goal to keep it going.`
              : t`Reach today’s goal to start a streak.`;

  return (
    <div className={clsx("grid gap-5", className)}>
      {onClose && (
        <PlaceBar
          parent={t`Streak`}
          title={titleInBar ? t`Streak` : undefined}
          returnsTo={returnsTo}
          onClose={onClose}
        />
      )}
      <header className="grid gap-1.5">
        {/* The flame sits on the number's line, the words on its baseline. */}
        <h2 id={titleId} tabIndex={-1} className="flex items-center gap-3 text-text outline-none">
          <Flame className="h-11 w-[35px] shrink-0" state={flame} flicker={flame === "full"} />
          <span className="flex items-baseline gap-2.5">
            <span className="text-5xl font-semibold leading-none tracking-tight tabular-nums">
              {current}
            </span>
            <span className="text-lg font-medium text-text-2">
              <Plural value={current} one="day in a row" other="days in a row" />
            </span>
          </span>
        </h2>
        <p className="text-sm text-text-2">{status}</p>
      </header>

      <section className="grid rounded-lg bg-plate-2" aria-label={t`Today`}>
        <div className="grid gap-2.5 px-4 py-3.5">
          <div className="flex items-center gap-2">
            {/* The goal is named whether or not the day is done, so the bar below has a number to mean. */}
            <span className="flex flex-1 items-center gap-1.5 text-base font-medium tabular-nums text-text">
              {done && <Check className="size-4 shrink-0 text-amber-text" aria-hidden="true" />}
              {/* "of" only holds up to the goal; a round past it counts on and still names what it passed. */}
              {today.attempts > today.goal ? (
                <Plural
                  value={today.attempts}
                  one={`# review, goal ${today.goal}`}
                  other={`# reviews, goal ${today.goal}`}
                />
              ) : (
                <Plural
                  value={today.goal}
                  one={`${today.attempts} of # review`}
                  other={`${today.attempts} of # reviews`}
                />
              )}
            </span>
            {onGoalChange && (
              <IconButton
                ref={editRef}
                label={t`Change daily goal`}
                size="sm"
                onClick={() => setView("goal")}
                // Out of the row's height, and in to the box's 16 px inset like the text across from it.
                className="-my-2 -me-2"
              >
                <Pencil aria-hidden="true" />
              </IconButton>
            )}
          </div>
          <GoalTrack today={today} label={t`Today’s goal`} />
        </div>
        <dl className="grid grid-cols-2 border-t border-edge">
          <Figure icon={Trophy} value={summary.longest} label={t`Longest streak`} />
          <Figure icon={CalendarCheck} value={summary.reviewedDays} label={t`Days reviewed`} />
        </dl>
      </section>

      <StreakCalendar
        days={byDate}
        today={today.date}
        month={month}
        onMonth={(m) => {
          setDrawRun(false);
          setMonth(m);
        }}
        firstMonth={firstMonth}
        run={drawRun ? run : undefined}
        rest={rest}
      />
    </div>
  );
}

export interface StreakButtonProps {
  summary: StreakSummary | undefined;
  variant: StreakFace;
  className?: string | undefined;
  /** Opens the app's one streak place. Without it the button opens a place of its own, as on the design page. */
  onOpen?: (() => void) | undefined;
}

/** The pill in the chrome, or the card on Today. Every face opens the same place. */
export function StreakButton({ summary, variant, className, onOpen }: StreakButtonProps) {
  const { t } = useLingui();
  const [ownOpen, setOwnOpen] = useState(false);
  const rail = variant === "rail";
  const card = variant === "card";
  const status = useTodayStatus(summary);

  if (!summary) {
    return (
      <Skeleton
        className={clsx(
          card
            ? "h-40 w-full rounded-xl"
            : rail
              ? "h-8 w-12 rounded-full"
              : "h-10 w-16 rounded-full",
          className,
        )}
      />
    );
  }

  const label = t`Streak: ${plural(summary.current, { one: "# day in a row", other: "# days in a row" })}`;
  const face = card
    ? clsx(
        // A wide single-column card puts the week beside the run; the desktop column stacks them again.
        "edge grid w-full grid-cols-1 content-between @xl:grid-cols-[minmax(0,1fr)_auto] @xl:items-center @xl:gap-x-6 @3xl:grid-cols-none @3xl:items-stretch gap-4 rounded-xl bg-plate p-5 text-start text-text transition-[background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.98] motion-reduce:active:scale-100 hoverable:hover:edge-2 hoverable:hover:bg-hover",
        className,
      )
    : clsx(
        "relative inline-flex shrink-0 items-center rounded-full font-semibold text-text transition-[background-color,box-shadow,scale] duration-150 ease-out active:scale-[0.97] motion-reduce:active:scale-100",
        rail
          ? "h-8 gap-1.5 px-2.5 text-sm before:absolute before:-inset-1.5 before:content-[''] hoverable:hover:bg-hover"
          : "h-10 gap-2 px-2.5 text-base before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] hoverable:hover:bg-hover",
        className,
      );

  return (
    <>
      <button
        type="button"
        aria-label={card ? `${label}. ${status}` : label}
        aria-haspopup="dialog"
        onClick={() => (onOpen ? onOpen() : setOwnOpen(true))}
        className={face}
      >
        {card ? (
          <CardFace summary={summary} status={status} />
        ) : (
          <PillFace summary={summary} variant={variant} />
        )}
      </button>
      {!onOpen && <StreakPlace open={ownOpen} onOpenChange={setOwnOpen} summary={summary} />}
    </>
  );
}

export interface StreakPlaceProps extends Omit<StreakPanelProps, "titleId" | "onClose"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * What the flame opens, as a place: centred over the page on a desktop, a page from the end edge on
 * touch. Each opening is a fresh panel: this month, the run drawing in, the streak view first.
 */
export function StreakPlace({ open, onOpenChange, ...panel }: StreakPlaceProps) {
  const titleId = useId();
  return (
    <Dialog kind="place" open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // Top-anchored, so switching to the shorter goal view or paging months never moves back or close.
        className="mt-[max(1rem,calc(50dvh-20rem))] mb-auto w-[min(92vw,400px)]"
        aria-labelledby={titleId}
        // The run, not its first control: opened from a link, a focused control would show its tooltip at once.
        initialFocus={() => document.getElementById(titleId)}
      >
        <StreakPanel titleId={titleId} onClose={() => onOpenChange(false)} {...panel} />
      </DialogContent>
    </Dialog>
  );
}
