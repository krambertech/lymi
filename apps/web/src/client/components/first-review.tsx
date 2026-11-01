import { Trans, useLingui } from "@lingui/react/macro";
import { comesBackIn } from "@lymi/client/first-review";
import type { Rating } from "@lymi/core";
import { EASE_OUT } from "@lymi/design";
import { clsx } from "clsx";
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import type { ComponentProps } from "react";
import { useReduceMotion } from "../lib/use-reduce-motion";
import { Button } from "./button";
import { GRADES } from "./grade";
import { TermText } from "./term-text";

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
    if (days < 5) return relative.format(days, "day");
    // A grade's own fuzz moves the real day from this preview, by days at this length.
    if (days <= 10) return t`in about a week`;
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
        style={{ WebkitBackdropFilter: "blur(4px)" }}
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

/**
 * After the first grade the card leaves and this takes its place: when the card comes back, and
 * when each of the other answers would have brought it. Once, until Next card.
 */
export function ComesBack({
  card,
  rating,
  back,
  onNext,
  onSkip,
}: {
  card: ComponentProps<typeof TermText>["card"];
  rating: Rating;
  back: Back;
  onNext: () => void;
  onSkip: () => void;
}) {
  const { i18n } = useLingui();
  const reduce = useReduceMotion();
  const when = back.words[rating];
  const rise = (delay: number) =>
    reduce
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.36, ease: EASE_OUT, delay },
        };
  const ROWS = 0.22;
  const CHOSEN = ROWS + GRADES.length * 0.05 + 0.1;
  return (
    <motion.section
      aria-live="polite"
      className="edge relative mt-4 flex min-h-0 flex-1 flex-col justify-center-safe overflow-x-hidden overflow-y-auto rounded-xl bg-plate px-6 py-8 short:py-5 @3xl:max-h-[600px] @3xl:px-10"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-amber-tint [mask-image:linear-gradient(to_top,black_5%,transparent)]"
      />
      <motion.h2 {...rise(0.1)} className="relative grid gap-1 text-center">
        <span className="hyphenate line-clamp-3 text-balance text-3xl font-medium short:line-clamp-2 short:text-2xl tracking-[-0.02em] text-ink [overflow-wrap:anywhere]">
          <TermText card={card} />
        </span>
        <span className="text-lg font-normal text-ink-secondary">
          <Trans>comes back {when}</Trans>
        </span>
      </motion.h2>

      <dl className="relative mx-auto mt-6 grid w-full max-w-sm gap-1 short:mt-3 short:gap-0">
        {GRADES.map((g, i) => {
          const Icon = g.icon;
          const on = g.rating === rating;
          return (
            <motion.div
              key={g.rating}
              {...rise(ROWS + i * 0.05)}
              className="relative flex items-center justify-between gap-3 px-3 py-2 short:py-1.5"
            >
              {on && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-md bg-amber-soft"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: EASE_OUT, delay: CHOSEN }}
                />
              )}
              <dt
                className={clsx(
                  "relative flex items-center gap-2",
                  on ? "font-medium text-ink" : "text-ink-secondary",
                )}
              >
                <Icon className={clsx("size-4", g.iconClass)} aria-hidden="true" strokeWidth={2} />
                {i18n._(g.label)}
              </dt>
              <dd
                className={clsx(
                  "relative text-end",
                  on ? "font-medium text-ink" : "text-ink-secondary",
                )}
              >
                {back.words[g.rating]}
              </dd>
            </motion.div>
          );
        })}
      </dl>

      <motion.p
        {...rise(CHOSEN + 0.1)}
        className="relative mx-auto mt-6 max-w-[34ch] text-pretty text-center text-md text-ink-secondary short:mt-3"
      >
        <Trans>
          Lymi brings each card back just before you’d forget it, and waits longer each time you
          remember.
        </Trans>
      </motion.p>
      <motion.div
        {...rise(CHOSEN + 0.2)}
        className="relative mt-8 grid justify-items-center gap-3 short:mt-4 short:gap-2"
      >
        <Button variant="primary" size="lg" kbd="Space" onClick={onNext}>
          <Trans>Next card</Trans>
        </Button>
        <SkipTips onSkip={onSkip} />
      </motion.div>
    </motion.section>
  );
}
