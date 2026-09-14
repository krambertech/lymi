import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { StreakOut } from "@lymi/core";
import { clsx } from "clsx";
import {
  CalendarCheck,
  Check,
  ChevronLeft,
  type LucideIcon,
  Pencil,
  Trophy,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { streakFlameFor } from "../lib/flame";
import { IconButton } from "./button";
import { Flame } from "./flame";
import { GoalPicker } from "./goal-picker";
import { SevenLights } from "./seven-lights";
import { Skeleton } from "./skeleton";
import { addDays, StreakCalendar } from "./streak-calendar";

export type StreakSummary = StreakOut;

const satisfied = (outcome: StreakSummary["today"]["outcome"]) =>
  outcome === "goal_met" || outcome === "exhausted";

/**
 * The last `n` local days, oldest first, today last: attempts and whether each counted toward a
 * streak. What the seven lights read.
 */
export function lastDays(summary: StreakSummary, n = 7) {
  const byDate = new Map(summary.days.map((d) => [d.date, d]));
  const dates = Array.from({ length: n }, (_, i) => addDays(summary.today.date, i - (n - 1)));
  const days = dates.map((date) => byDate.get(date));
  return {
    dates,
    attempts: days.map((d) => d?.attempts ?? 0),
    satisfied: days.map((d) => d?.satisfied ?? false),
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

/** The flame and the run, always in the chrome. DESIGN.md, "The streak". */
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

/** Today's attempts against the goal, in amber because it is the flame's own measure. */
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
  const done = satisfied(today.outcome);
  const share = done ? 1 : Math.min(1, today.attempts / today.goal);
  return (
    <span
      {...(label
        ? {
            role: "progressbar",
            "aria-label": label,
            "aria-valuemin": 0,
            "aria-valuemax": today.goal,
            "aria-valuenow": done ? today.goal : Math.min(today.attempts, today.goal),
          }
        : { "aria-hidden": true })}
      className={clsx("block h-2 overflow-hidden rounded-full bg-plate edge-inset", className)}
    >
      <i
        className="streak-fill block h-full origin-left rounded-full bg-amber rtl:origin-right"
        style={{ transform: `scaleX(${share})` }}
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
        goals={week.goals}
        dates={week.dates}
        size="lg"
      />
    </>
  );
}

/** One line on where today stands against the streak: what is left, or that the day counts. */
function useCardStatus(summary: StreakSummary | undefined): string {
  const { t } = useLingui();
  if (!summary) return "";
  const { today } = summary;
  switch (today.outcome) {
    case "goal_met":
      return t`Daily goal reached.`;
    case "exhausted":
      return t`That’s the lot for today.`;
    case "nothing_due":
      return t`Nothing due today, so your streak is safe.`;
    default: {
      const left = Math.max(today.goal - today.attempts, 0);
      return t`${plural(left, { one: "# review", other: "# reviews" })} to today’s goal`;
    }
  }
}

/** One figure in a tile, with its icon and the words for it. */
function Figure({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="grid gap-1.5 rounded-lg bg-plate-2 px-3.5 py-3">
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <Icon className="size-4 shrink-0 text-text-2" aria-hidden="true" />
        {label}
      </span>
      <span className="text-xl font-semibold leading-none tabular-nums text-text">{value}</span>
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
  /** The modal's close button, placed at the end of the panel's first line. */
  close?: ReactNode | undefined;
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
  close,
  className,
}: StreakPanelProps) {
  const { t } = useLingui();
  const [view, setView] = useState<"streak" | "goal">("streak");
  const [month, setMonth] = useState(summary.today.date.slice(0, 7));
  const [drawRun, setDrawRun] = useState(true);
  const editRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const { current, today } = summary;
  const done = satisfied(today.outcome);
  const flame = streakFlameFor(summary);
  const byDate = useMemo(() => new Map(summary.days.map((d) => [d.date, d])), [summary.days]);
  const run = useMemo(() => {
    const dates = new Set<string>();
    let day = done ? today.date : addDays(today.date, -1);
    for (
      let kept = byDate.get(day);
      kept && (kept.satisfied || kept.nothingDue);
      kept = byDate.get(day)
    ) {
      if (kept.satisfied) dates.add(day);
      day = addDays(day, -1);
    }
    return dates;
  }, [byDate, done, today.date]);
  const firstMonth = summary.days[0]?.date.slice(0, 7) ?? today.date.slice(0, 7);

  const firstRender = useRef(true);
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    (view === "goal" ? backRef : editRef).current?.focus();
  }, [view]);

  if (view === "goal") {
    return (
      <div className={clsx("enter-fade grid gap-4", className)}>
        <div className="-ms-2 flex min-h-8 items-center gap-1">
          <IconButton
            ref={backRef}
            label={t`Back to streak`}
            size="sm"
            onClick={() => setView("streak")}
          >
            <ChevronLeft className="rtl:-scale-x-100" aria-hidden="true" />
          </IconButton>
          <h2 id={titleId} className="flex-1 text-md font-medium text-text">
            <Trans>Daily goal</Trans>
          </h2>
          <p className="min-h-5 text-sm text-muted" role="status">
            {goalStatus === "saved" && (
              <span className="enter-fade inline-flex items-center gap-1.5">
                <Check className="size-4" aria-hidden="true" />
                <Trans>Saved</Trans>
              </span>
            )}
            {goalStatus === "error" && (
              <span className="text-danger">
                <Trans>Not saved. Try again.</Trans>
              </span>
            )}
          </p>
          {close}
        </div>
        <p className="text-sm text-text-2">
          <Trans>
            How many reviews keep your streak each day. Every grade counts, including Forgot and a
            card you see again.
          </Trans>
        </p>
        <GoalPicker value={summary.goal} onChange={(n) => onGoalChange?.(n)} />
      </div>
    );
  }

  const status =
    today.outcome === "goal_met"
      ? t`Daily goal reached.`
      : today.outcome === "exhausted"
        ? t`That’s the lot for today.`
        : today.outcome === "nothing_due"
          ? t`Nothing due today, so your streak is safe.`
          : current > 0
            ? t`Reach today’s goal to keep it going.`
            : t`Reach today’s goal to start a streak.`;

  return (
    <div className={clsx("grid gap-5", className)}>
      <header className="flex items-center gap-3.5">
        <Flame className="h-11 w-9" state={flame} flicker={flame === "full"} />
        <div className="grid min-w-0">
          <h2 id={titleId} className="flex items-baseline gap-2 text-text">
            <span className="text-3xl font-semibold leading-none tabular-nums">{current}</span>
            <span className="text-md font-medium">
              <Plural value={current} one="day in a row" other="days in a row" />
            </span>
          </h2>
          <p className="mt-1.5 text-sm text-text-2">{status}</p>
        </div>
        {/* Pulled out by the button's own padding, so the glyph sits on the card's edge below. */}
        {close && <div className="-me-2 -mt-1 ms-auto self-start">{close}</div>}
      </header>

      <div className="grid gap-2.5 rounded-lg bg-plate-2 p-3.5 ps-4">
        <div className="flex min-h-8 items-center gap-3">
          <div className="grid flex-1 gap-0.5">
            <span className="text-xs text-muted">
              <Trans>Today</Trans>
            </span>
            <span className="text-base font-medium tabular-nums text-text">
              {done ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-amber-text" aria-hidden="true" />
                  <Plural value={today.attempts} one="# review" other="# reviews" />
                </span>
              ) : (
                <Plural
                  value={today.goal}
                  one={`${today.attempts} of # review`}
                  other={`${today.attempts} of # reviews`}
                />
              )}
            </span>
          </div>
          {onGoalChange && (
            <IconButton
              ref={editRef}
              label={t`Change daily goal`}
              size="sm"
              variant="secondary"
              onClick={() => setView("goal")}
            >
              <Pencil aria-hidden="true" />
            </IconButton>
          )}
        </div>
        <GoalTrack today={today} label={t`Today’s goal`} />
      </div>

      <div className="-mt-2.5 grid grid-cols-2 gap-2.5">
        <Figure icon={Trophy} value={summary.longest} label={t`Longest streak`} />
        <Figure icon={CalendarCheck} value={summary.reviewedDays} label={t`Days reviewed`} />
      </div>

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
      />
    </div>
  );
}

export interface StreakButtonProps extends Omit<StreakPanelProps, "summary" | "titleId" | "close"> {
  summary: StreakSummary | undefined;
  variant: StreakFace;
  className?: string | undefined;
}

/**
 * The pill and the modal it opens: the whole screen on a phone, centred over the page on
 * anything wider. The platform `<dialog>` owns focus, Escape and the top layer.
 */
export function StreakButton({ summary, variant, className, ...panel }: StreakButtonProps) {
  const { t } = useLingui();
  const [opened, setOpened] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const rail = variant === "rail";
  const card = variant === "card";
  const status = useCardStatus(summary);

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
        "edge grid w-full grid-cols-1 content-between @xl:grid-cols-[minmax(0,1fr)_auto] @xl:items-center @xl:gap-x-6 @3xl:grid-cols-none @3xl:items-stretch gap-4 rounded-xl bg-plate p-5 text-start text-text transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.98] hoverable:hover:edge-2 hoverable:hover:bg-hover",
        className,
      )
    : clsx(
        "relative inline-flex shrink-0 items-center rounded-full font-semibold text-text transition-[background-color,box-shadow,scale] duration-150 active:scale-[0.97]",
        rail
          ? "h-8 gap-1.5 px-2.5 text-sm before:absolute before:-inset-1.5 before:content-[''] hoverable:hover:bg-hover"
          : "h-10 gap-2 px-2.5 text-base before:absolute before:inset-x-0 before:-inset-y-1 before:content-[''] hoverable:hover:bg-hover",
        className,
      );

  const close = () => dialogRef.current?.close();
  return (
    <>
      <button
        type="button"
        aria-label={card ? `${label}. ${status}` : label}
        aria-haspopup="dialog"
        onClick={() => {
          setOpened((n) => n + 1);
          dialogRef.current?.showModal();
        }}
        className={face}
      >
        {card ? (
          <CardFace summary={summary} status={status} />
        ) : (
          <PillFace summary={summary} variant={variant} />
        )}
      </button>
      {/* In the body, because a pill inside a hidden rail or header would hide an open modal with it
          when the window crosses the breakpoint, and leave the page inert behind nothing. */}
      {createPortal(
        // biome-ignore lint/a11y/useKeyWithClickEvents: the native dialog closes on Escape; this click only catches the backdrop
        <dialog
          ref={dialogRef}
          aria-labelledby={titleId}
          onClick={(e) => {
            // Full screen on a phone the dialog is the sheet itself, so only the centred modal has a backdrop.
            if (e.target === dialogRef.current && window.matchMedia("(min-width: 48rem)").matches) {
              close();
            }
          }}
          className={clsx(
            "sheet-modal overflow-y-auto overscroll-contain bg-plate text-start text-text",
            // A phone gets the whole screen; anything wider gets a centred modal.
            "max-md:m-0 max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:px-5 max-md:pt-[max(env(safe-area-inset-top),20px)] max-md:pb-[max(env(safe-area-inset-bottom),20px)]",
            "md:edge-2 md:m-auto md:w-[400px] md:max-w-[92vw] md:rounded-xl md:p-5",
          )}
        >
          {/* Each opening is a fresh panel: this month, the run drawing in, and the streak view first. */}
          {opened > 0 && (
            <StreakPanel
              key={opened}
              className="mx-auto max-w-md"
              summary={summary}
              titleId={titleId}
              close={
                <IconButton label={t`Close`} size="sm" onClick={close}>
                  <X aria-hidden="true" />
                </IconButton>
              }
              {...panel}
            />
          )}
        </dialog>,
        document.body,
      )}
    </>
  );
}
