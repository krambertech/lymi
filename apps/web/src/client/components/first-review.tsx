import { Trans, useLingui } from "@lingui/react/macro";
import { comesBackIn } from "@lymi/client/first-review";
import { isolate, type Rating } from "@lymi/core";
import { EASE_OUT } from "@lymi/design";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { Button } from "./button";
import { GRADES } from "./grade";

// The account's first review teaches itself once: docs/design/onboarding.md "The first review".

/** The answer lands and is read before the tip about grading it covers the card. */
const AFTER_ANSWER_S = 1.6;

/** When each grade brings the card back: in days, and in words. */
export type Back = { days: Record<Rating, number>; words: Record<Rating, string> };

const RATINGS = [1, 2, 3, 4] as const;

/** When each grade brings the card back, or null before the schedule is known. */
export function useComesBack(
  next: Record<Rating, string> | undefined,
  dayEnd: Date | undefined,
): Back | null {
  const { t, i18n } = useLingui();
  if (!next || !dayEnd) return null;
  const relative = new Intl.RelativeTimeFormat(i18n.locale, { numeric: "auto" });
  const say = (days: number) => {
    if (days === 0) return t`later today`;
    if (days < 21) return relative.format(days, "day");
    if (days < 60) return relative.format(Math.round(days / 7), "week");
    return relative.format(Math.round(days / 30), "month");
  };
  const days = Object.fromEntries(
    RATINGS.map((r) => [r, comesBackIn(r, next[r], dayEnd)]),
  ) as Record<Rating, number>;
  const words = Object.fromEntries(RATINGS.map((r) => [r, say(days[r])])) as Record<Rating, string>;
  return { days, words };
}

function SkipTips({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSkip();
      }}
      className="relative z-20 rounded-xs text-sm text-ink-muted underline decoration-edge-strong underline-offset-2 hoverable:hover:text-ink"
    >
      <Trans>Skip tips</Trans>
    </button>
  );
}

/**
 * Under the word on the first card, and on a forgotten one as it returns: the lantern's light falls
 * on what the learner is asked about, and the note says what to do with it.
 */
export function CueTip({
  kind,
  cue,
  onSkip,
}: {
  kind: "first" | "returned";
  cue: "term" | "meaning" | "image";
  onSkip: () => void;
}) {
  const reduce = useReduceMotion();
  return (
    <motion.div
      role="note"
      className="grid justify-items-start gap-1.5 pt-1"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.4 }}
    >
      <p className="text-pretty text-md font-medium text-amber-text">
        {kind === "returned" ? (
          <Trans>You forgot this one earlier, so it’s back for one more try.</Trans>
        ) : cue === "meaning" ? (
          <Trans>Try to remember the word for this.</Trans>
        ) : cue === "image" ? (
          <Trans>Try to remember what this is.</Trans>
        ) : (
          <Trans>Try to remember what this means.</Trans>
        )}
      </p>
      <p className="text-pretty text-sm text-ink-secondary">
        <span className="@2xl:hidden">
          <Trans>Then tap the card to see the answer.</Trans>
        </span>
        <span className="hidden @2xl:inline">
          <Trans>Then press Space or click the card to see the answer.</Trans>
        </span>
      </p>
      <SkipTips onSkip={onSkip} />
    </motion.div>
  );
}

/**
 * The first reveal, once the answer has been read: the card frosts over and the words point down
 * at the grades, the one sharp thing left.
 */
export function GradesTip({ onSkip }: { onSkip: () => void }) {
  const reduce = useReduceMotion();
  return (
    <motion.div
      role="note"
      className="absolute inset-0 z-30 grid content-end justify-items-center gap-1.5 overflow-hidden rounded-[inherit] px-6 pb-5 text-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: AFTER_ANSWER_S }}
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-0 bg-plate/60"
        initial={{ backdropFilter: "blur(0px)" }}
        animate={{ backdropFilter: "blur(4px)" }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: AFTER_ANSWER_S }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-amber-tint [mask-image:linear-gradient(to_top,black_15%,transparent)]"
      />
      <p className="relative text-balance text-xl font-medium text-ink">
        <Trans>How well did you remember it?</Trans>
      </p>
      <p className="relative max-w-[34ch] text-pretty text-md text-ink-secondary">
        <Trans>Pick a grade below. It decides when you see this card again.</Trans>
      </p>
      <span className="relative mt-1">
        <SkipTips onSkip={onSkip} />
      </span>
      <motion.span
        aria-hidden="true"
        className="relative mt-1 text-amber-text"
        animate={reduce ? {} : { y: [0, 4, 0] }}
        transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        <ChevronDown className="size-5" strokeWidth={2} />
      </motion.span>
    </motion.div>
  );
}

/** Where a day sits along the line, as a share of its width; later today sits just past today. */
function along(days: number, span: number) {
  return `${(Math.max(days, 0.55) / span) * 100}%`;
}

/**
 * After the first grade the card leaves and this takes its place: a line of the days ahead, the
 * card travelling along it to the day it comes back, and where the other answers would have sent
 * it. Once, until Next card.
 */
export function ComesBack({
  term,
  rating,
  back,
  onNext,
  onSkip,
}: {
  term: string;
  rating: Rating;
  back: Back;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { i18n } = useLingui();
  const reduce = useReduceMotion();
  const days = back.days[rating];
  const when = back.words[rating];
  // Room for every answer's day, and never so short that tomorrow sits at the far end.
  const span = Math.min(Math.max(...Object.values(back.days), 6) + 1, 30);
  const others = GRADES.filter((g) => g.rating !== rating);
  const rise = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.36, ease: EASE_OUT, delay },
        };
  const LAND = 0.55;
  return (
    <motion.section
      aria-live="polite"
      className="edge relative mt-4 flex flex-1 flex-col justify-center overflow-hidden rounded-xl bg-plate px-6 py-10 @3xl:max-h-[600px] @3xl:px-10"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-amber-tint [mask-image:linear-gradient(to_top,black_5%,transparent)]"
      />
      <motion.h2
        {...rise(0.1)}
        className="relative mx-auto max-w-[18ch] text-balance text-center text-3xl font-medium tracking-[-0.02em] text-ink"
      >
        <Trans>
          {{ term: isolate(term) }} comes back {when}
        </Trans>
      </motion.h2>

      {/* The days ahead: today at the start, the card's day lit, the other answers' days marked. */}
      <div aria-hidden="true" className="relative mx-auto mt-10 mb-8 h-20 w-full max-w-md">
        <motion.span
          className="absolute inset-x-0 top-[50px] h-px origin-left bg-edge-strong rtl:origin-right"
          initial={{ scaleX: reduce ? 1 : 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.25 }}
        />
        {Array.from({ length: span - 1 }, (_, i) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: one tick per day, in order
            key={i}
            className="absolute top-[47px] h-1.5 w-px bg-edge-strong"
            style={{ insetInlineStart: along(i + 1, span) }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.3 + i * 0.03 }}
          />
        ))}
        <span className="absolute top-[50px] start-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink rtl:translate-x-1/2" />
        <span className="absolute top-[62px] start-0 -translate-x-1/2 text-xs text-ink-muted rtl:translate-x-1/2">
          <Trans>Today</Trans>
        </span>
        {others.map((g, i) => {
          const Icon = g.icon;
          return (
            <motion.span
              key={g.rating}
              className="absolute top-[50px] grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-plate edge rtl:translate-x-1/2"
              style={{ insetInlineStart: along(back.days[g.rating], span) }}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: EASE_OUT, delay: 0.25 + LAND + 0.5 + i * 0.07 }}
            >
              <Icon className={clsx("size-3.5", g.iconClass)} strokeWidth={2} />
            </motion.span>
          );
        })}
        {/* The card itself, setting off from today and landing on its day, on a stem over the line. */}
        <motion.span
          className="absolute top-0 grid -translate-x-1/2 justify-items-center rtl:translate-x-1/2"
          initial={{ insetInlineStart: reduce ? along(days, span) : "0%" }}
          animate={{ insetInlineStart: along(days, span) }}
          transition={
            reduce ? { duration: 0 } : { type: "spring", bounce: 0.3, duration: 0.9, delay: LAND }
          }
        >
          <span className="key-light block h-8 max-w-36 truncate rounded-md bg-amber px-3 text-sm font-medium leading-8 text-amber-ink">
            {term}
          </span>
          <span className="h-3 w-px bg-amber" />
          <span className="size-3 rounded-full bg-amber ring-4 ring-amber-soft" />
        </motion.span>
      </div>

      <motion.p
        {...rise(0.25 + LAND + 0.4)}
        className="relative mx-auto max-w-[34ch] text-pretty text-center text-md text-ink-secondary"
      >
        <Trans>
          Lymi brings each card back just before you’d forget it, and waits longer each time you
          remember.
        </Trans>
      </motion.p>
      <motion.dl
        {...rise(0.25 + LAND + 0.6)}
        className="relative mx-auto mt-5 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm"
      >
        {others.map((g) => {
          const Icon = g.icon;
          return (
            <div key={g.rating} className="flex items-center gap-1.5">
              <dt className="flex items-center gap-1 text-ink-muted">
                <Icon
                  className={clsx("size-3.5", g.iconClass)}
                  aria-hidden="true"
                  strokeWidth={2}
                />
                {i18n._(g.label)}
              </dt>
              <dd className="text-ink-secondary">{back.words[g.rating]}</dd>
            </div>
          );
        })}
      </motion.dl>
      <motion.div
        {...rise(0.25 + LAND + 0.8)}
        className="relative mt-10 grid justify-items-center gap-3"
      >
        <Button variant="primary" size="lg" kbd="Space" onClick={onNext}>
          <Trans>Next card</Trans>
        </Button>
        <SkipTips onSkip={onSkip} />
      </motion.div>
    </motion.section>
  );
}
