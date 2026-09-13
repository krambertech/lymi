import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { Rating } from "@lymi/core";
import { clsx } from "clsx";
import {
  Brain,
  Check,
  CircleAlert,
  Loader2,
  type LucideIcon,
  Pointer,
  RotateCcw,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion, useAnimate, useReducedMotion, type Variants } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "../components/Button";
import { Chip, SourceChip, StateChip } from "../components/Chip";
import { ErrorTip } from "../components/ErrorTip";
import { Kbd } from "../components/Kbd";
import { Lantern } from "../components/Lantern";
import { Progress } from "../components/Progress";
import { Skeleton } from "../components/Skeleton";
import { type StreakSummary, StreakWeek } from "../components/Streak";
import type { QueueItem } from "../lib/api";
import { intervalLabel } from "../lib/i18n";

export const GRADES: {
  rating: Rating;
  label: MessageDescriptor;
  key: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  { rating: 1, label: msg`Forgot`, key: "1", icon: RotateCcw, iconClass: "text-grade-forgot" },
  { rating: 2, label: msg`Hard`, key: "2", icon: Brain, iconClass: "text-grade-hard" },
  { rating: 3, label: msg`Good`, key: "3", icon: Check, iconClass: "text-grade-good" },
  { rating: 4, label: msg`Easy`, key: "4", icon: Zap, iconClass: "text-grade-easy" },
];

export interface ReviewHeaderProps {
  done: number;
  total: number;
  /** Roll the count when it changes. Off when the grade came from the keyboard. */
  animateCount?: boolean | undefined;
  flare?: boolean | undefined;
  onClose?: (() => void) | undefined;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * The lantern, the session track, the count and the exit, on one line.
 *
 * The deck name is deliberately absent. It is chosen two taps earlier, it cannot change for the
 * length of the session, and a long one squeezes the track down to nothing — so it moves to the
 * end screen, where it is a fact about what was reviewed rather than a caption on every card.
 * The lantern stays: the flare on a good answer is the one warm thing on this screen.
 *
 * The lantern's drawing starts about a quarter of the way into its box, so the negative margin
 * puts the metal, not the box, on the card's outer edge.
 */
export function ReviewHeader({
  done,
  total,
  animateCount = true,
  flare,
  onClose,
}: ReviewHeaderProps) {
  const { t } = useLingui();
  return (
    <header className="flex min-h-14 shrink-0 items-center gap-3 pt-2 @3xl:pt-4">
      <Lantern className="-ms-[11.5px] -me-2 size-11" flicker glow flare={flare} />
      <Progress
        value={total ? done / total : 0}
        label={t`Session progress`}
        className="min-w-0 flex-1"
      />
      <span className="shrink-0 text-sm font-medium tabular-nums text-text-2">
        <Trans>
          <RollingCount value={done} animate={animateCount} /> of {total}
        </Trans>
      </span>
      {/* Quiet but not small: a 40 px circle with a 52 px hit area, pulled out so the X sits on the card edge. */}
      <IconButton
        label={t`Leave review`}
        round
        onClick={onClose}
        className="-me-2.5 [&_svg]:size-5 @3xl:[&_svg]:size-[18px]"
      >
        <X />
      </IconButton>
    </header>
  );
}

/** The count rolls up when a card lands, so the change is seen rather than noticed later. */
function RollingCount({ value, animate }: { value: number; animate: boolean }) {
  return (
    <span className="relative inline-grid overflow-hidden align-bottom">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          className="inline-block"
          initial={animate ? { y: "80%", opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={
            animate
              ? { y: "-80%", opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }
              : { opacity: 0, transition: { duration: 0 } }
          }
          transition={{ duration: 0.22, ease: EASE_OUT }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/**
 * The review card says a lapse in words. "Relearning" is the schedule's name for it; what the
 * learner needs to know is that this one got away recently, since one relearning step means the
 * state only lasts until the next Good.
 */
function ReviewStateChip({ state }: { state: number }) {
  if (state === 3)
    return (
      <Chip tone="learning" size="lg">
        <RotateCcw className="size-3.5 text-grade-forgot" aria-hidden="true" strokeWidth={2} />
        <Trans>Forgot recently</Trans>
      </Chip>
    );
  return <StateChip state={state} size="lg" />;
}

interface AudioButtonProps {
  state: "idle" | "loading" | "playing";
  error: string | null;
  onPlay: () => void;
  className?: string | undefined;
}

/**
 * Pronunciation, at the end of the word. A failure turns the button red, shakes it once and says
 * why in a tip over it; the button stays red until the next try.
 *
 * The word joiner keeps the button on the line with the word's last letters, and the line-tall box
 * centres it on that line. Its name is in the app language, not the card's.
 */
function AudioButton({ state, error, onPlay, className }: AudioButtonProps) {
  const { t, i18n } = useLingui();
  const button = useRef<HTMLButtonElement>(null);
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const reduce = useReducedMotion();
  const shaken = useRef(error);

  // Shake once per new failure, never for an error the button was drawn with.
  useEffect(() => {
    if (error === shaken.current) return;
    shaken.current = error;
    if (!error || reduce || !scope.current) return;
    animate(scope.current, { x: [0, -4, 4, -3, 3, -1, 0] }, { duration: 0.4, ease: "easeInOut" });
  }, [error, reduce, animate, scope]);

  return (
    <span className="whitespace-nowrap" lang={i18n.locale}>
      {"\u2060"}
      <span ref={scope} className="ms-3 inline-flex h-[1lh] items-center align-top">
        <IconButton
          ref={button}
          label={state === "playing" ? t`Replay pronunciation` : t`Play pronunciation`}
          size="sm"
          variant={error ? "danger" : "secondary"}
          round
          className={className}
          disabled={state === "loading"}
          onClick={(e) => {
            e.stopPropagation();
            onPlay();
          }}
        >
          {state === "loading" ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Volume2 aria-hidden="true" />
          )}
        </IconButton>
      </span>
      <ErrorTip anchor={button} message={error} />
    </span>
  );
}

/**
 * A pointing hand at the foot of an unrevealed card, for the learner who has not yet found that
 * the plate is the button. It taps three times, then rests. When it appears is `useRevealHint`'s
 * decision.
 */
function TapHint() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center gap-1 px-5 text-muted"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <span className="relative grid size-11 place-items-center">
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full border border-edge-2"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.2], opacity: [0.9, 0] }}
            transition={{
              delay: 0.48,
              duration: 0.8,
              repeat: 2,
              repeatDelay: 1.7,
              ease: "easeOut",
            }}
          />
        )}
        <motion.span
          className="grid place-items-center"
          animate={reduce ? {} : { y: [0, 3, 0], scale: [1, 0.9, 1] }}
          transition={{
            delay: 0.3,
            duration: 0.36,
            repeat: 2,
            repeatDelay: 2.14,
            ease: "easeInOut",
          }}
        >
          <Pointer className="size-6" strokeWidth={1.5} />
        </motion.span>
      </span>
      {/* Touch wording on a phone, the shortcut where there is a keyboard to press it with. */}
      <p className="flex items-center gap-2 text-center text-sm font-medium">
        <span className="@2xl:hidden">
          <Trans>Tap the card when you have it</Trans>
        </span>
        <span className="hidden @2xl:inline">
          <Trans>Reveal the card when you have it</Trans>
        </span>
        <span className="hidden @2xl:inline-flex">
          <Kbd>Space</Kbd>
        </span>
      </p>
    </motion.div>
  );
}

const answerGroup: Variants = {
  hidden: {},
  shown: { transition: { delayChildren: 0.04, staggerChildren: 0.05 } },
};
const answerRule: Variants = {
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { duration: 0.36, ease: EASE_OUT } },
};
// Blur settles to `none` rather than `blur(0)`, which Safari rasterises soft.
const answerLine: Variants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.26, ease: EASE_OUT },
    transitionEnd: { filter: "none" },
  },
};

export interface ReviewCardProps {
  item: QueueItem;
  revealed: boolean;
  animateReveal?: boolean | undefined;
  /** Show how to reveal: the pointing hand with the words under it. */
  hint?: boolean | undefined;
  onReveal: () => void;
  onPlayAudio?: (() => void) | undefined;
  audioState?: "idle" | "loading" | "playing" | undefined;
  /** Why the pronunciation did not play. Shown on the button, never as a line in the card. */
  audioError?: string | null | undefined;
  className?: string | undefined;
}

/**
 * The card. A flat plate with one hairline edge. Before reveal it is the word alone, large.
 * After reveal the word glides up, the rule draws across, and the meaning, example and sources
 * rise in under it one after another, each labelled with its source.
 */
export function ReviewCard({
  item,
  revealed,
  animateReveal = true,
  hint = false,
  onReveal,
  onPlayAudio,
  audioState = "idle",
  audioError = null,
  className,
}: ReviewCardProps) {
  const { t } = useLingui();
  const { card, direction } = item;
  const recog = direction === "recognition";
  const front = recog ? card.term : (card.meaning ?? card.term);
  const back = recog ? (card.meaning ?? t`No meaning yet`) : card.term;
  const audio = (className?: string) =>
    onPlayAudio && (
      <AudioButton
        state={audioState}
        error={audioError}
        onPlay={onPlayAudio}
        className={className}
      />
    );
  return (
    // The whole plate reveals the answer, so the control is a button covering the plate rather than
    // a caption at its foot: pressing the card is what a card affords, and the most-pressed control
    // on the screen should not look like a footnote. It sits above the text and below the
    // pronunciation button, which is the one thing inside the card you can press for another reason.
    <section
      aria-label={recog ? t`Recognition card for ${front}` : t`Production card for ${front}`}
      className={clsx(
        "edge relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl bg-plate p-5 @3xl:p-6",
        !revealed && "cursor-pointer hoverable:hover:edge-2",
        className,
      )}
    >
      {!revealed && (
        <button
          type="button"
          onClick={onReveal}
          aria-label={t`Tap card to reveal`}
          className="absolute inset-0 z-10 rounded-xl"
        />
      )}
      <div className="flex items-center justify-between gap-3 text-sm text-muted @3xl:text-xs">
        <span>
          {recog ? <Trans>Recognise</Trans> : <Trans>Produce</Trans>}
          {card.language && <span> · {card.language.toUpperCase()}</span>}
        </span>
        <ReviewStateChip state={item.fsrsState} />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 py-2">
        <motion.div
          layout={animateReveal ? "position" : false}
          transition={{ layout: { duration: 0.34, ease: EASE_OUT } }}
          className="grid gap-3"
        >
          <p
            lang={recog ? (card.language ?? undefined) : undefined}
            className="hyphens-auto text-4xl font-medium tracking-[-0.03em] text-text [overflow-wrap:anywhere] @3xl:text-5xl"
          >
            {front}
            {recog && audio("z-20")}
          </p>
          {recog && card.pronunciation && (
            <p className="text-md text-muted">{card.pronunciation}</p>
          )}
        </motion.div>

        {revealed && (
          <motion.div
            variants={answerGroup}
            initial={animateReveal ? "hidden" : false}
            animate="shown"
            className="grid gap-5"
          >
            <motion.div
              variants={answerRule}
              aria-hidden="true"
              className="h-px bg-edge ltr:origin-left rtl:origin-right"
            />
            <div className="grid gap-3">
              <motion.p
                variants={answerLine}
                className={clsx(
                  "hyphens-auto leading-[1.35] text-text [overflow-wrap:anywhere]",
                  recog ? "text-xl" : "text-3xl font-medium",
                )}
                lang={recog ? undefined : (card.language ?? undefined)}
              >
                {back}
                {!recog && audio()}
              </motion.p>
              {!recog && card.pronunciation && (
                <motion.p variants={answerLine} className="text-md text-muted">
                  {card.pronunciation}
                </motion.p>
              )}
              {card.example && (
                <motion.p
                  variants={answerLine}
                  className="text-md leading-relaxed text-text-2"
                  lang={card.language ?? undefined}
                >
                  {card.example}
                </motion.p>
              )}
              {card.notes && (
                <motion.p variants={answerLine} className="text-sm text-muted">
                  {card.notes}
                </motion.p>
              )}
              <motion.div variants={answerLine} className="mt-1 flex flex-wrap gap-1.5">
                {card.meaningSource && <SourceChip source={card.meaningSource} field="meaning" />}
                {card.exampleSource && card.example && (
                  <SourceChip source={card.exampleSource} field="example" />
                )}
                {card.source && <Chip size="sm">{card.source}</Chip>}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
      <AnimatePresence>{!revealed && hint && <TapHint />}</AnimatePresence>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {revealed ? t`Answer: ${back}` : ""}
      </p>
    </section>
  );
}

const gradeGroup: Variants = {
  hidden: {},
  shown: { transition: { delayChildren: 0.08, staggerChildren: 0.035 } },
};
const gradeRise: Variants = {
  hidden: { opacity: 0, y: 10 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
};

/**
 * Opens from nothing, which is what shrinks the card above it. The glide matches the word's inside
 * the card, so the word's two movements land as one. It clips only while opening, so a pressed
 * grade's scale and focus ring are not cut off afterwards; mounting on each reveal resets that.
 */
function OpeningStrip({ animate: wanted, children }: { animate: boolean; children: ReactNode }) {
  // Height is not a transform, so MotionConfig's reduced motion does not stop it; this does.
  const reduce = useReducedMotion();
  const animate = wanted && !reduce;
  const [opened, setOpened] = useState(!animate);
  return (
    <motion.div
      className={clsx("shrink-0", !opened && "overflow-hidden")}
      initial={animate ? { height: 0 } : false}
      animate={{ height: "auto" }}
      transition={{ duration: 0.34, ease: EASE_OUT }}
      onAnimationComplete={() => setOpened(true)}
    >
      {children}
    </motion.div>
  );
}

export interface GradeBarProps {
  id?: string | undefined;
  /** Before the answer is showing there is no strip, and the card takes its room. */
  revealed: boolean;
  /** The grades rise in one after another. Off when the reveal came from the keyboard. */
  animateIn?: boolean | undefined;
  /** The four dates FSRS would set, keyed by rating. Announced, not shown. */
  next?: Record<Rating, string> | undefined;
  pending?: boolean | undefined;
  pendingRating?: Rating | null | undefined;
  error?: string | null | undefined;
  onGrade: (r: Rating) => void;
  className?: string | undefined;
}

/**
 * Four equally weighted recall grades. They are absent until the answer shows, then the strip
 * opens under the card and the card gives up the room.
 *
 * What each grade schedules is not printed: four dates under four labels is clutter, and the card
 * comes back when it comes back. The date is in every button's accessible name, because without it
 * a screen reader hears three unexplained synonyms for "correct".
 */
export function GradeBar({
  id,
  revealed,
  animateIn = false,
  next,
  pending,
  pendingRating,
  error,
  onGrade,
  className,
}: GradeBarProps) {
  const { t, i18n } = useLingui();
  const now = new Date();
  if (!revealed) return null;
  return (
    <OpeningStrip animate={animateIn}>
      <fieldset id={id} className={clsx("scroll-mt-24", className)}>
        <legend className="sr-only">
          <Trans>Choose a recall grade</Trans>
        </legend>
        {error && (
          <p className="mb-2 text-center text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <motion.div
          variants={gradeGroup}
          initial={animateIn ? "hidden" : false}
          animate="shown"
          className="grid grid-cols-4 gap-2"
        >
          {GRADES.map((g) => {
            const saving = pending && pendingRating === g.rating;
            const GradeIcon = g.icon;
            const label = i18n._(g.label);
            const schedules = next ? intervalLabel(i18n, now, new Date(next[g.rating])) : undefined;
            return (
              // The rise is on a wrapper so the button's own disabled opacity is not overridden.
              <motion.div key={g.rating} variants={gradeRise} className="grid min-w-0">
                <button
                  type="button"
                  disabled={pending}
                  aria-busy={saving || undefined}
                  aria-label={schedules ? t`${label}, next in ${schedules}` : undefined}
                  onClick={() => onGrade(g.rating)}
                  className={clsx(
                    "edge relative grid h-[72px] min-w-0 content-center gap-1 rounded-lg bg-plate px-1 text-sm font-medium text-text-2",
                    "transition-[scale,background-color,box-shadow,opacity] duration-150 ease-out @2xl:text-base",
                    "enabled:hoverable:hover:edge-2 enabled:hoverable:hover:bg-hover enabled:hoverable:hover:text-text active:scale-[0.96] disabled:opacity-55",
                  )}
                >
                  <span
                    className={clsx(
                      "mx-auto grid size-5 place-items-center transition-[color,opacity] duration-150",
                      g.iconClass,
                      saving && "opacity-0",
                    )}
                  >
                    <GradeIcon className="size-[18px]" aria-hidden="true" strokeWidth={1.75} />
                  </span>
                  <span className={clsx("transition-opacity duration-150", saving && "opacity-0")}>
                    {label}
                  </span>
                  <span className="hidden @3xl:contents">
                    <Kbd
                      tone="default"
                      className="absolute end-1.5 top-1.5 h-4 min-w-4 rounded-full px-1.5 text-2xs"
                    >
                      {g.key}
                    </Kbd>
                  </span>
                  {saving && (
                    <span className="spinner-enter absolute inset-0 grid place-items-center">
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    </span>
                  )}
                </button>
              </motion.div>
            );
          })}
        </motion.div>
      </fieldset>
    </OpeningStrip>
  );
}

export interface SessionDoneProps {
  done: number;
  moreDue?: number | undefined;
  /** Named here rather than over every card, because here it is a fact about what was reviewed. */
  deckName?: string | undefined;
  /** The week and the run, as Today shows them. */
  streak?: StreakSummary | undefined;
  action?: ReactNode | undefined;
}

/**
 * The end. The lantern brightens and the seven lights show the week. Cards counted, never points.
 *
 * A session is one batch of at most fifty, so more can be due when this screen appears. That is a
 * pause with a way on, not a failure to finish: the batch really did end, and the next one is a
 * decision rather than an endless list.
 */
export function SessionDone({ done, moreDue = 0, deckName, streak, action }: SessionDoneProps) {
  const lit = done > 0;
  const paused = lit && moreDue > 0;
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
      <Lantern
        className="complete-lantern mb-4 size-32 @3xl:size-36"
        flicker
        glow
        catchLight
        litUp={lit}
        variant={lit ? "lit" : "unlit"}
      />
      <h2 className="complete-copy text-3xl font-medium">
        {paused ? (
          <Trans>A good pause</Trans>
        ) : lit ? (
          <Trans>That’s the lot</Trans>
        ) : (
          <Trans>Nothing due</Trans>
        )}
      </h2>
      <p className="complete-copy max-w-[30ch] text-md text-muted">
        {paused ? (
          deckName ? (
            <Plural
              value={moreDue}
              one={`${done} reviewed from ${deckName}. # more is ready when you are.`}
              other={`${done} reviewed from ${deckName}. # more are ready when you are.`}
            />
          ) : (
            <Plural
              value={moreDue}
              one={`${done} reviewed. # more is ready when you are.`}
              other={`${done} reviewed. # more are ready when you are.`}
            />
          )
        ) : lit ? (
          deckName ? (
            <Trans>
              {done} reviewed from {deckName}. The rest can wait a while.
            </Trans>
          ) : (
            <Trans>{done} reviewed. The rest can wait a while.</Trans>
          )
        ) : (
          <Trans>Come back later, or add something new.</Trans>
        )}
      </p>
      {streak && <StreakWeek summary={streak} className="complete-copy mt-6" />}
      <div className="complete-copy mt-6 flex flex-wrap items-center justify-center gap-2">
        {action}
      </div>
    </section>
  );
}

export function ReviewError({ retry, action }: { retry: () => void; action?: ReactNode }) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-5 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <CircleAlert className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-2xl font-medium">
        <Trans>Review couldn’t load</Trans>
      </h2>
      <p className="mt-2 max-w-[30ch] text-md text-muted">
        <Trans>Check your connection, then try again.</Trans>
      </p>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="primary" onClick={retry}>
          <Trans>Try again</Trans>
        </Button>
        {action}
      </div>
    </section>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <Skeleton className="flex-1 rounded-xl @3xl:max-h-[600px] @3xl:min-h-[460px]" />
    </div>
  );
}
