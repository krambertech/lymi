import { Radio as RadioPrimitive } from "@base-ui/react/radio";
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group";
import { Plural, Select, Trans, useLingui } from "@lingui/react/macro";
import type { DayPart, NextCards } from "@lymi/client/first-review";
import { GOAL_MINUTES } from "@lymi/client/welcome";
import { DAILY_GOAL_PRESETS, type ReminderTime } from "@lymi/core";
import { EASE_OUT } from "@lymi/design";
import { clsx } from "clsx";
import { Bell, Check, Clock, type LucideIcon, Moon, Sun, Sunrise } from "lucide-react";
import { motion } from "motion/react";
import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { supportsPush, turnOnReminder } from "../lib/push-reminder";
import { useInstallState } from "../lib/pwa-install";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { Button } from "./button";
import type { StreakSummary } from "./streak";
import { TermText } from "./term-text";

export type Reminder =
  | "loading"
  | "off"
  | "on"
  | "denied"
  | "dismissed"
  | "install"
  | "error"
  | "none";

export interface ReminderControl {
  reminder: Reminder;
  busy: boolean;
  /** Turned on here, so the time on screen is the one that was saved. */
  turnedOn: boolean;
  turnOn: (time: ReminderTime) => Promise<Reminder>;
}

/** This device's reminder: whether it can be turned on, whether it is, and turning it on. */
export function useReminder(enabled: boolean): ReminderControl {
  const install = useInstallState();
  const [key, setKey] = useState<string | null>(null);
  const [reminder, setReminder] = useState<Reminder>("loading");
  const [busy, setBusy] = useState(false);
  const [turnedOn, setTurnedOn] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    if (install.isIOS && !install.installed) {
      setReminder("install");
      return;
    }
    if (!supportsPush()) {
      setReminder("none");
      return;
    }
    if (Notification.permission === "denied") {
      setReminder("denied");
      return;
    }
    // Loaded before any press, because awaiting it inside the press would cost the browser's prompt.
    api
      .pushConfig()
      .then(async ({ publicKey }) => {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const status = subscription && (await api.pushStatus({ endpoint: subscription.endpoint }));
        if (!live) return;
        setKey(publicKey);
        setReminder(status?.enabled ? "on" : "off");
      })
      .catch(() => live && setReminder("none"));
    return () => {
      live = false;
    };
  }, [enabled, install.isIOS, install.installed]);

  const turnOn = async (time: ReminderTime): Promise<Reminder> => {
    if (!key) return reminder;
    setBusy(true);
    try {
      const result = await turnOnReminder(key, time);
      setReminder(result);
      setTurnedOn(result === "on");
      return result;
    } catch {
      setReminder("error");
      return "error";
    } finally {
      setBusy(false);
    }
  };

  return { reminder, busy, turnedOn, turnOn };
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const weekdayOf = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00`).getDay()] ?? "other";

function SeeYou({ next }: { next: NextCards | undefined }) {
  if (!next) return <Trans>See you soon</Trans>;
  if (next.days === 1) return <Trans>See you tomorrow</Trans>;
  const weekday = weekdayOf(next.date);
  return (
    <Select
      value={weekday}
      _sun="See you on Sunday"
      _mon="See you on Monday"
      _tue="See you on Tuesday"
      _wed="See you on Wednesday"
      _thu="See you on Thursday"
      _fri="See you on Friday"
      _sat="See you on Saturday"
      other="See you soon"
    />
  );
}

/** What waits, on the day `SeeYou` has just named. */
function WhatWaits({ next, fresh }: { next: NextCards | undefined; fresh: boolean }) {
  if (!next) return null;
  if (next.days > 1)
    return (
      <Plural value={next.count} one="# card comes back then." other="# cards come back then." />
    );
  return fresh ? (
    <Plural value={next.count} one="# new card will be ready." other="# new cards will be ready." />
  ) : (
    <Plural value={next.count} one="# card will be ready." other="# cards will be ready." />
  );
}

const OPEN_KEY = "lymi-first-review";

/** Marks this tab's first review as under way with the cards of its hand, or as over. */
export function rememberFirstReview(cards: readonly FanCard[] | null) {
  try {
    if (!cards) return sessionStorage.removeItem(OPEN_KEY);
    const hand = cards.slice(0, HAND).map(({ term, language }) => ({ term, language }));
    sessionStorage.setItem(OPEN_KEY, JSON.stringify(hand));
  } catch {}
}

/** A reload mid-review: its grades already end `isGuiding`, so only this tab knows it is still the first. */
export function firstReviewOpen(streak: StreakSummary): FanCard[] | null {
  if (streak.reviewedDays > 1 || streak.today.attempts === 0) return null;
  try {
    const hand: unknown = JSON.parse(sessionStorage.getItem(OPEN_KEY) ?? "null");
    return Array.isArray(hand) ? (hand as FanCard[]) : null;
  } catch {
    return null;
  }
}

/** Off only for browser journeys about review itself, which start on a new account; docs/testing.md. */
export function firstReviewTeaches() {
  return !(window as { lymiNoFirstReview?: boolean }).lymiNoFirstReview;
}

/** The heading of the success screen that opens the first review's end. */
export function FirstReviewTitle({ stopped }: { stopped: boolean }) {
  return stopped ? (
    <Trans>That’s your first review</Trans>
  ) : (
    <Trans>You finished your first review</Trans>
  );
}

/** The line beside the flame on that screen: the streak has begun, or how far off it is. */
export function FirstStreakNote({ left }: { left: number }) {
  return left > 0 ? (
    <Plural value={left} one="# more to start your streak" other="# more to start your streak" />
  ) : (
    <Trans>You started your streak</Trans>
  );
}

export type PlanStep = "summary" | "goal" | "remind" | "bye";
export type FirstEndLeft = "done" | "more_cards" | "forgotten" | "add_cards" | "closed";

export interface FirstEndInput {
  step: PlanStep;
  onStep: (step: PlanStep) => void;
  /** The cards of this first review, for the last screen. */
  cards: readonly FanCard[];
  next: NextCards | undefined;
  /** The next day's cards are all new ones. */
  fresh: boolean;
  goal: number;
  /** The last choice did not save, so the tiles are back on the saved goal. */
  goalFailed: boolean;
  onGoal: (goal: number) => void;
  control: ReminderControl;
  times: Record<DayPart, ReminderTime>;
  part: DayPart;
  onPart: (part: DayPart) => void;
}

const canAsk = (reminder: Reminder) =>
  reminder === "off" || reminder === "loading" || reminder === "error" || reminder === "dismissed";

function Rise({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReduceMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.28, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Takes focus as it arrives, so each step is announced and Tab starts at its choices. */
function StepHeading({ children }: { children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <h2
      ref={heading}
      tabIndex={-1}
      className="text-balance text-3xl font-medium tracking-[-0.02em] text-ink outline-none"
    >
      {children}
    </h2>
  );
}

/** One tile of a choice, lit when chosen; arrow keys move between them through the group. */
function Tile<Value>({
  value,
  className,
  children,
}: {
  value: Value;
  className: string;
  children: ReactNode;
}) {
  return (
    <RadioPrimitive.Root
      value={value}
      className={({ checked }) =>
        clsx(
          "grid cursor-pointer place-content-center justify-items-center gap-0.5 rounded-lg px-1 transition-[background-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          checked ? "bg-amber-soft outline-2 outline-amber" : "edge bg-plate hoverable:hover:veil",
          className,
        )
      }
    >
      {children}
    </RadioPrimitive.Root>
  );
}

function GoalChoice({ goal, onGoal }: { goal: number; onGoal: (goal: number) => void }) {
  const { t, i18n } = useLingui();
  return (
    <RadioGroupPrimitive<number>
      aria-label={t`Time each day`}
      className="grid grid-cols-2 gap-2.5"
      value={goal}
      onValueChange={onGoal}
    >
      {DAILY_GOAL_PRESETS.map((n) => (
        <Tile key={n} value={n} className="h-20">
          <span className="text-lg font-medium text-ink">
            {i18n.number(GOAL_MINUTES[n], { style: "unit", unit: "minute", unitDisplay: "long" })}
          </span>
          <span className="text-sm tabular-nums text-ink-secondary">
            <Plural value={n} one="about # card" other="about # cards" />
          </span>
        </Tile>
      ))}
    </RadioGroupPrimitive>
  );
}

/** The day's three times, one chosen. */
function TimeChoice({
  times,
  value,
  onChange,
}: {
  times: Record<DayPart, ReminderTime>;
  value: DayPart;
  onChange: (part: DayPart) => void;
}) {
  const { t } = useLingui();
  const parts: { part: DayPart; label: string; icon: LucideIcon }[] = [
    { part: "morning", label: t`Morning`, icon: Sunrise },
    { part: "lunch", label: t`Lunch`, icon: Sun },
    { part: "evening", label: t`Evening`, icon: Moon },
  ];
  return (
    <RadioGroupPrimitive<DayPart>
      aria-label={t`Reminder time`}
      className="grid grid-cols-3 gap-2.5"
      value={value}
      onValueChange={onChange}
    >
      {parts.map(({ part, label, icon: Icon }) => (
        <Tile key={part} value={part} className="h-24">
          <Icon
            className={clsx(
              "mb-1 size-5 transition-colors duration-150",
              part === value ? "text-amber-mark" : "text-ink-muted",
            )}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span className="text-md font-medium text-ink">{label}</span>
          <span className="text-sm tabular-nums text-ink-secondary">{times[part]}</span>
        </Tile>
      ))}
    </RadioGroupPrimitive>
  );
}

function ReminderNote({ reminder }: { reminder: Reminder }) {
  if (reminder === "error")
    return <Trans>Couldn’t turn the reminder on. Check your connection and try again.</Trans>;
  if (reminder === "dismissed")
    return <Trans>Reminders stay off until notifications are allowed.</Trans>;
  if (reminder === "denied")
    return <Trans>Notifications are blocked. You can allow them in your browser’s settings.</Trans>;
  return <Trans>Your browser will ask to allow notifications.</Trans>;
}

export type FanCard = ComponentProps<typeof TermText>["card"];

/** How many cards the last screen deals. */
const HAND = 3;

/** Past this many characters a term takes the smaller size on a card of the hand. */
const LONG_TERM = 14;

/** A hand of this review's words, dealt from a stack. */
function WordFan({ cards }: { cards: readonly FanCard[] }) {
  const reduce = useReduceMotion();
  const hand = cards.slice(0, HAND);
  const middle = (hand.length - 1) / 2;
  return (
    <div aria-hidden="true" className="relative mx-auto h-44 w-full">
      {hand.map((card, i) => {
        const from = i - middle;
        return (
          <motion.div
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed hand; a term can repeat.
            key={i}
            className="edge absolute start-1/2 top-2 grid h-36 w-32 -translate-x-1/2 place-items-center rounded-xl bg-plate px-3 shadow-sm rtl:translate-x-1/2"
            style={{ zIndex: hand.length - Math.abs(Math.round(from)) }}
            initial={reduce ? false : { x: 0, y: 8, rotate: 0, opacity: 0 }}
            animate={{
              x: from * 108,
              y: Math.abs(from) * 12,
              rotate: from * 7,
              opacity: 1,
            }}
            transition={{ type: "spring", bounce: 0.18, duration: 0.7, delay: 0.2 + i * 0.03 }}
          >
            {/* No reading: a card this small has no room over a long term. */}
            <span
              className={clsx(
                "hyphenate line-clamp-3 w-full text-center font-medium text-ink [overflow-wrap:anywhere]",
                card.term.length > LONG_TERM ? "text-sm" : "text-lg",
              )}
            >
              <TermText card={{ ...card, pronunciation: null }} />
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/** The first review's end after the success screen, as the parts `ReviewComplete` shows. */
export function firstEndParts(input: FirstEndInput): {
  beat?: ReactNode;
  foot?: ReactNode;
  steps: ReactNode;
  /** Moves on from a step with nothing to decide, for Space and Enter. */
  advance?: () => void;
} {
  const { step, onStep, control, next, fresh, goal, onGoal, times, part, onPart } = input;
  const { reminder, busy, turnOn } = control;
  const time = times[part];
  const asks = canAsk(reminder) || step === "remind";
  const order: PlanStep[] = ["summary", "goal", ...(asks ? (["remind"] as const) : []), "bye"];
  const at = order.indexOf(step);
  const steps = (
    <span className="flex items-center gap-1.5">
      {order.map((s, i) => (
        <span
          key={s}
          className={clsx(
            "size-1.5 rounded-full transition-colors duration-200",
            i <= at ? "bg-amber" : "bg-edge-strong",
          )}
        />
      ))}
    </span>
  );
  const nextButton = (to: PlanStep) => (
    <Button variant="primary" size="lg" className="w-full" onClick={() => onStep(to)}>
      <Trans context="moving on">Next</Trans>
    </Button>
  );

  if (step === "summary") return { foot: nextButton("goal"), steps, advance: () => onStep("goal") };

  if (step === "goal")
    return {
      steps,
      advance: () => onStep(asks ? "remind" : "bye"),
      beat: (
        <Rise key="goal" className="w-full pt-3">
          <StepHeading>
            <Trans>How much time a day?</Trans>
          </StepHeading>
          <p className="mt-2 text-pretty text-md text-ink-secondary">
            <Trans>You can change this any time.</Trans>
          </p>
          <div className="mt-6 grid gap-2.5">
            <GoalChoice goal={goal} onGoal={onGoal} />
            {input.goalFailed && (
              <p role="alert" className="text-sm text-ink-muted">
                <Trans>Couldn’t save that. Check your connection and try again.</Trans>
              </p>
            )}
          </div>
        </Rise>
      ),
      foot: nextButton(asks ? "remind" : "bye"),
    };

  if (step === "remind")
    return {
      steps,
      beat: (
        <Rise key="remind" className="w-full pt-3">
          <StepHeading>
            <Trans>When should we remind you?</Trans>
          </StepHeading>
          <p className="mt-2 text-pretty text-md text-ink-secondary">
            <Trans>One reminder, only on days with cards.</Trans>
          </p>
          <div className="mt-6 grid gap-2.5">
            <TimeChoice times={times} value={part} onChange={onPart} />
            <p className="text-sm text-ink-muted">
              <ReminderNote reminder={reminder} />
            </p>
          </div>
        </Rise>
      ),
      foot:
        reminder === "denied" ? (
          nextButton("bye")
        ) : (
          <div className="grid w-full gap-2">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              loading={busy || reminder === "loading"}
              onClick={() =>
                void turnOn(time).then((result) => {
                  if (result === "on") onStep("bye");
                })
              }
            >
              <Bell data-icon="inline-start" aria-hidden="true" />
              <Trans>Remind me at {time}</Trans>
            </Button>
            <Button variant="ghost" size="lg" className="w-full" onClick={() => onStep("bye")}>
              <Trans>Not now</Trans>
            </Button>
          </div>
        ),
    };

  const minutes = GOAL_MINUTES[goal as keyof typeof GOAL_MINUTES];
  const on = control.turnedOn;
  return {
    steps,
    beat: (
      <Rise key="bye" className="w-full pt-3">
        <StepHeading>
          <SeeYou next={next} />
        </StepHeading>
        {next && (
          <p className="mt-2 text-pretty text-md text-ink-secondary">
            <WhatWaits next={next} fresh={fresh} />
          </p>
        )}
        {input.cards.length > 0 && (
          <div className="mt-5 [@media(max-height:600px)]:hidden">
            <WordFan cards={input.cards} />
          </div>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-ink-secondary">
          {minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-amber-mark" aria-hidden="true" />
              <FinaleMinutes minutes={minutes} />
            </span>
          )}
          {on && (
            <span className="flex items-center gap-1.5">
              <Bell className="size-3.5 text-amber-mark" aria-hidden="true" />
              <Trans>Reminder at {time}</Trans>
            </span>
          )}
        </div>
      </Rise>
    ),
  };
}

function FinaleMinutes({ minutes }: { minutes: number }) {
  const { i18n } = useLingui();
  const amount = i18n.number(minutes, { style: "unit", unit: "minute", unitDisplay: "long" });
  return <Trans>{amount} a day</Trans>;
}
