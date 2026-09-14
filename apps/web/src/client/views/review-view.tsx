import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { Rating } from "@lymi/core";
import { clsx } from "clsx";
import { BookMarked, CircleAlert, Loader2, Pointer, Volume2, X } from "lucide-react";
import {
  AnimatePresence,
  animate as animateValue,
  motion,
  useAnimate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button, buttonClass, IconButton } from "../components/button";
import { CardPicture } from "../components/card-picture";
import { Chip, SourceChip, StateChip } from "../components/chip";
import { ErrorTip } from "../components/error-tip";
import { Flame } from "../components/flame";
import { GRADES } from "../components/grade";
import { Kbd } from "../components/kbd";
import { Lantern } from "../components/lantern";
import { Progress } from "../components/progress";
import { SevenLights } from "../components/seven-lights";
import { Skeleton } from "../components/skeleton";
import { StateIcon } from "../components/state-mark";
import { lastDays, type StreakSummary } from "../components/streak";
import type { QueueItem } from "../lib/api";
import { lanternFor, streakFlameFor } from "../lib/flame";
import { intervalLabel } from "../lib/i18n";
import type { EndScreen, Offer } from "../lib/review-complete";
import { modeLabel } from "../lib/review-modes";

export interface ReviewHeaderProps {
  /** Today's accepted grades in every scope, Forgot and returns included. */
  attempts: number;
  goal: number;
  /** A round's own progress, which the track and count show instead of the goal's. */
  round?: { done: number; size: number } | undefined;
  /** Roll the count when it changes. Off when the grade came from the keyboard. */
  animateCount?: boolean | undefined;
  /** Today's streak, which the lantern shows. Omitted, it is the brand flame. */
  streak?: StreakSummary | undefined;
  /** The review has stopped: the lantern has moved to the end screen and the track steps back. */
  complete?: boolean | undefined;
  onClose?: (() => void) | undefined;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** The lantern is one object carried between the header and the end of a review. */
const LANTERN_LAYOUT = "review-lantern";
const LANTERN_FLIGHT = { type: "spring", visualDuration: 0.6, bounce: 0 } as const;

/**
 * The lantern, today's attempts against the goal, and the exit, on one line.
 *
 * The deck name is not here, because a long one squeezes the track down to nothing; each card
 * names its own deck. The lantern stays: every accepted grade, Forgot included, feeds its flame.
 *
 * The lantern's drawing starts about a quarter of the way into its box, so the negative margin
 * puts the metal, not the box, on the card's outer edge.
 */
export function ReviewHeader({
  attempts,
  goal,
  round,
  animateCount = true,
  streak,
  complete = false,
  onClose,
}: ReviewHeaderProps) {
  const { t } = useLingui();
  const reduce = useReducedMotion();
  const done = round ? round.done : attempts;
  const size = round ? round.size : goal;
  return (
    <header className="flex min-h-14 shrink-0 items-center gap-3 pt-2 @3xl:pt-4">
      {/* The slot keeps its place while the lantern is away, so the header never shifts. */}
      <span className="-ms-[11.5px] -me-2 size-11 shrink-0">
        {!complete && (
          <motion.span
            {...(reduce ? {} : { layoutId: LANTERN_LAYOUT })}
            transition={LANTERN_FLIGHT}
            className="block size-full"
          >
            <Lantern className="size-full" {...lanternFor(streak)} fed={attempts} flicker glow />
          </motion.span>
        )}
      </span>
      <motion.span
        className="flex min-w-0 flex-1 items-center gap-3"
        initial={false}
        animate={{ opacity: complete ? 0 : 1 }}
        transition={{ duration: complete ? 0.16 : 0.24, ease: EASE_OUT }}
        aria-hidden={complete || undefined}
      >
        <Progress
          value={size ? Math.min(1, done / size) : 0}
          label={round ? t`Round progress` : t`Daily goal progress`}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 text-sm font-medium tabular-nums text-text-2">
          <Trans>
            <RollingCount value={done} animate={animateCount} /> of {size}
          </Trans>
        </span>
      </motion.span>
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
  /** The deck the card came from, named first on the card. A review can mix every deck. */
  deck?: { name: string; language?: string | null | undefined } | undefined;
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
 * The card. A flat plate with one hairline edge. Before reveal it is the cue alone, large: the
 * word, the meaning, or the picture. After reveal the cue glides up, the rule draws across, and
 * the target rises in under it with the rest of the card as context, each line labelled with its
 * source. A picture that cannot load gives way to its description, so the card can still be graded.
 */
export function ReviewCard({
  item,
  deck,
  revealed,
  animateReveal = true,
  hint = false,
  onReveal,
  onPlayAudio,
  audioState = "idle",
  audioError = null,
  className,
}: ReviewCardProps) {
  const { t, i18n } = useLingui();
  const { card, mode } = item;
  const picture = mode.cue === "image" ? card.image : null;
  const noMeaning = t`No meaning yet`;
  const back = mode.target === "term" ? card.term : (card.meaning ?? noMeaning);
  const front = mode.cue === "meaning" ? (card.meaning ?? card.term) : card.term;
  const audio = (className?: string) =>
    onPlayAudio && (
      <AudioButton
        state={audioState}
        error={audioError}
        onPlay={onPlayAudio}
        className={className}
      />
    );
  const label =
    mode.cue === "term"
      ? t`Recognition card for ${front}`
      : mode.cue === "meaning"
        ? t`Production card for ${front}`
        : t`Picture card`;
  const pronunciation = card.pronunciation && (
    <motion.p variants={answerLine} className="text-md text-muted">
      {card.pronunciation}
    </motion.p>
  );

  return (
    // The whole plate reveals the answer, so the control is a button covering the plate rather than
    // a caption at its foot: pressing the card is what a card affords, and the most-pressed control
    // on the screen should not look like a footnote. It sits above the text and below the
    // pronunciation button, which is the one thing inside the card you can press for another reason.
    <section
      aria-label={label}
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
          aria-label={t`Reveal the card`}
          className="absolute inset-0 z-10 rounded-xl"
        />
      )}
      <div className="flex items-center justify-between gap-3 text-sm text-muted @3xl:text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          {deck && (
            <>
              <BookMarked className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate font-medium text-text-2">{deck.name}</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span className="shrink-0">
            {i18n._(modeLabel(mode))}
            {/* The deck implies its language, so the code shows only for a card that differs. */}
            {card.language && card.language.toLowerCase() !== deck?.language?.toLowerCase() && (
              <span> · {card.language.toUpperCase()}</span>
            )}
          </span>
        </span>
        <StateChip state={item.fsrsState} size="lg" inReview />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 py-2">
        <motion.div
          layout={animateReveal ? "position" : false}
          transition={{ layout: { duration: 0.34, ease: EASE_OUT } }}
          className="grid gap-3"
        >
          {mode.cue === "image" ? (
            card.image ? (
              // One size before and after reveal, on the start edge like the text under it.
              <CardPicture image={card.image} maxHeight="min(30dvh, 240px)" />
            ) : (
              // A queue fetched before the picture was archived; the server no longer asks this mode.
              <p className="text-xl text-muted">
                <Trans>This card’s picture was removed.</Trans>
              </p>
            )
          ) : (
            <>
              <p
                lang={mode.cue === "term" ? (card.language ?? undefined) : undefined}
                className="hyphens-auto text-4xl font-medium tracking-[-0.03em] text-text [overflow-wrap:anywhere] @3xl:text-5xl"
              >
                {front}
                {mode.cue === "term" && audio("z-20")}
              </p>
              {mode.cue === "term" && card.pronunciation && (
                <p className="text-md text-muted">{card.pronunciation}</p>
              )}
            </>
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
              {mode.target === "term" ? (
                <>
                  <motion.p
                    variants={answerLine}
                    className="hyphens-auto text-3xl font-medium leading-[1.2] text-text [overflow-wrap:anywhere]"
                    lang={card.language ?? undefined}
                  >
                    {card.term}
                    {audio()}
                  </motion.p>
                  {pronunciation}
                  {picture && card.meaning && (
                    <motion.p
                      variants={answerLine}
                      className="hyphens-auto text-xl leading-[1.35] text-text-2 [overflow-wrap:anywhere]"
                    >
                      {card.meaning}
                    </motion.p>
                  )}
                </>
              ) : (
                <>
                  <motion.p
                    variants={answerLine}
                    className={clsx(
                      "hyphens-auto leading-[1.3] text-text [overflow-wrap:anywhere]",
                      picture ? "text-2xl font-medium" : "text-xl",
                    )}
                  >
                    {back}
                  </motion.p>
                  {picture && (
                    <>
                      <motion.p
                        variants={answerLine}
                        className="hyphens-auto text-xl leading-[1.35] text-text-2 [overflow-wrap:anywhere]"
                        lang={card.language ?? undefined}
                      >
                        {card.term}
                        {audio()}
                      </motion.p>
                      {pronunciation}
                    </>
                  )}
                </>
              )}
              {!picture && card.image && (
                <motion.div variants={answerLine} className="py-1">
                  <CardPicture
                    image={card.image}
                    maxHeight="min(16dvh, 120px)"
                    fallback="placeholder"
                  />
                </motion.div>
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

export interface ReviewCompleteProps {
  /** What the end says and offers, from `reviewEnd`. */
  end: EndScreen;
  /** Today's attempts in every scope. */
  attempts: number;
  goal: number;
  /** Today's attempts when this stretch of the review began, where the count rolls up from. */
  from?: number | undefined;
  /** Attempts in this stretch, the large number when the end counts the round. */
  roundCount?: number | undefined;
  /** The deck a deck review is of, which Nothing left names when the end is about it alone. */
  deckName?: string | undefined;
  /** The streak with this review in it. */
  streak?: StreakSummary | undefined;
  /** The streak as it stood before, so today's light fills and the run ticks on screen. */
  streakBefore?: StreakSummary | undefined;
  /** The flame the lantern had in the header, so it rises from there rather than from rest. */
  lanternFrom?: number | "out" | "brand" | undefined;
  onOffer?: ((offer: Offer) => void) | undefined;
  /** Done, and for nothing due, Add cards before it. */
  actions?: ReactNode | undefined;
  /** Move focus to the heading, so it is announced and Tab starts at the choices. */
  focusOnMount?: boolean | undefined;
}

/** When each part of the end arrives, in ms after the last grade; DESIGN.md, "Motion". */
const AT = {
  pool: 280,
  embers: 620,
  heading: 640,
  count: 820,
  countRoll: 960,
  lights: 1180,
  run: 1300,
  land: 1780,
  actions: 2000,
  actionStep: 90,
} as const;

/** Embers off the flame: where each drifts to, when it leaves and how long it lasts. */
const EMBERS = [
  { x: -16, y: -118, at: 0, dur: 1500, size: 5 },
  { x: 12, y: -150, at: 90, dur: 1800, size: 4 },
  { x: -4, y: -184, at: 200, dur: 2200, size: 3.5 },
  { x: 24, y: -108, at: 300, dur: 1400, size: 4.5 },
  { x: -26, y: -150, at: 420, dur: 1800, size: 3 },
  { x: 6, y: -132, at: 540, dur: 1600, size: 4 },
  { x: -10, y: -96, at: 680, dur: 1300, size: 3.5 },
  { x: 18, y: -170, at: 800, dur: 2000, size: 3 },
  { x: -18, y: -124, at: 950, dur: 1500, size: 4 },
] as const;

const at = (ms: number) => ({ "--at": `${ms}ms` }) as CSSProperties;
/** The `.seq` rise in `styles.css`. */
const RISE_MS = 560;
const EMBERS_END = AT.embers + Math.max(...EMBERS.map((e) => e.at + e.dur));

/** The end of a review, played as one sequence that any tap or key finishes; DESIGN.md, "Motion". */
export function ReviewComplete({
  end: screen,
  attempts,
  goal,
  from = attempts,
  roundCount = 0,
  deckName,
  streak,
  streakBefore = streak,
  lanternFrom,
  onOffer,
  actions,
  focusOnMount = false,
}: ReviewCompleteProps) {
  const { t } = useLingui();
  const reduce = !!useReducedMotion();
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [landed, setLanded] = useState(reduce);
  const [skipped, setSkipped] = useState(false);
  const instant = reduce || skipped;

  const counted = screen.heading !== "nothing_due";
  const byRound = screen.count === "round";
  const count = byRound ? roundCount : attempts;
  const celebrating = screen.celebration !== "none";
  const week = landed ? streak : streakBefore;
  const days = week ? lastDays(week) : undefined;
  const flame = week ? streakFlameFor(week) : "lit";
  const lit = !!streak && streak.current > 0;
  // Only the goal's own stretch ticks the run; any other end shows the run as it stands.
  const run = screen.celebration === "full" ? week?.current : (streak ?? week)?.current;
  const ways = screen.offers.map((offer) => {
    const n = offer.count;
    const name = offer.kind === "deck" ? offer.name : "";
    const label =
      offer.kind === "forgotten"
        ? t`${plural(n, { one: "Review # forgotten card", other: "Review # forgotten cards" })}`
        : offer.kind === "deck"
          ? t`${plural(n, { one: `Review # card in ${name}`, other: `Review # cards in ${name}` })}`
          : t`${plural(n, { one: "Review # more card", other: "Review # more cards" })}`;
    return {
      key: offer.kind === "deck" ? `deck-${offer.id}` : offer.kind,
      icon: offer.kind === "forgotten" ? <StateIcon state="forgot" className="size-4" /> : null,
      label,
      onClick: () => onOffer?.(offer),
    };
  });
  const actionsAt = AT.actions + ways.length * AT.actionStep;
  const end = Math.max(actionsAt + RISE_MS, celebrating && lit && !reduce ? EMBERS_END : 0);

  useEffect(() => {
    if (focusOnMount) heading.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  useEffect(() => {
    if (instant) {
      setLanded(true);
      return;
    }
    const timer = window.setTimeout(() => setLanded(true), AT.land);
    return () => window.clearTimeout(timer);
  }, [instant]);
  // The sequence is a moment, never a wait: the first tap or key finishes it.
  useEffect(() => {
    if (instant) return;
    const skip = () => setSkipped(true);
    const done = window.setTimeout(skip, end);
    window.addEventListener("pointerdown", skip, { once: true });
    window.addEventListener("keydown", skip, { once: true });
    return () => {
      window.clearTimeout(done);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, [instant, end]);

  return (
    <section
      aria-labelledby={headingId}
      className={clsx("flex flex-1 flex-col", skipped && "seq-skip")}
    >
      {/* No scroll box of its own: the page scrolls, so the lantern’s light is never cut off at a box edge. */}
      <div className="m-auto flex w-full max-w-sm flex-col items-center py-4 text-center @3xl:py-8">
        <motion.div
          {...(reduce ? {} : { layoutId: LANTERN_LAYOUT })}
          transition={LANTERN_FLIGHT}
          className={clsx(
            "relative isolate mb-1 size-32 @3xl:size-44",
            reduce && "complete-lantern",
          )}
        >
          {lit && (
            <div
              aria-hidden="true"
              className={clsx(
                "light-pool pointer-events-none absolute -inset-[85%] -z-10 rounded-full",
                !celebrating && "opacity-50",
              )}
              style={at(AT.pool)}
            >
              <div className="light-pool-breath size-full rounded-full" />
            </div>
          )}
          <Lantern className="size-full" {...lanternFor(streak)} from={lanternFrom} flicker glow />
          {celebrating && lit && !reduce && (
            <div aria-hidden="true" className="pointer-events-none absolute start-1/2 top-[52%]">
              {EMBERS.map((e) => (
                <i
                  key={e.at}
                  className="ember absolute -ms-0.5 -mt-0.5 block rounded-full bg-flame-core shadow-[0_0_4px_1px_var(--amber),0_0_10px_var(--glow)]"
                  style={
                    {
                      width: e.size,
                      height: e.size,
                      "--x": `${e.x}px`,
                      "--y": `${e.y}px`,
                      "--dur": `${e.dur}ms`,
                      "--at": `${AT.embers + e.at}ms`,
                    } as CSSProperties
                  }
                />
              ))}
            </div>
          )}
        </motion.div>

        <h2
          ref={heading}
          id={headingId}
          tabIndex={-1}
          className="seq text-balance text-3xl font-medium tracking-[-0.02em] outline-none"
          style={at(AT.heading)}
        >
          {screen.heading === "goal_reached" ? (
            <Trans>Daily goal reached</Trans>
          ) : screen.heading === "nothing_left" ? (
            !screen.namesDeck ? (
              <Trans>Nothing left today</Trans>
            ) : deckName ? (
              <Trans>Nothing left in {deckName}</Trans>
            ) : (
              <Trans>Nothing left in this deck</Trans>
            )
          ) : screen.heading === "nothing_due" ? (
            <Trans>Nothing due</Trans>
          ) : (
            <Trans>Round done</Trans>
          )}
        </h2>

        {counted ? (
          <p className="mt-3 grid justify-items-center gap-1 @3xl:mt-4">
            <span
              className="seq-count block text-6xl font-medium leading-none tracking-[-0.04em] text-text @3xl:text-7xl"
              style={at(AT.count)}
            >
              <CountUp
                from={byRound ? 0 : from}
                to={count}
                delay={AT.countRoll}
                instant={instant}
              />
            </span>
            <span className="seq text-md text-text-2" style={at(AT.count + 80)}>
              {byRound ? (
                <Plural value={count} one="review in this round" other="reviews in this round" />
              ) : (
                <Plural value={count} one="review today" other="reviews today" />
              )}
            </span>
          </p>
        ) : (
          <p className="seq mt-2 max-w-[32ch] text-pretty text-md text-text-2" style={at(AT.count)}>
            <Trans>Come back later, or add something new.</Trans>
          </p>
        )}

        {week && days && (
          <div className="mt-6 grid justify-items-center gap-3 @3xl:mt-8">
            <SevenLights
              days={days.attempts}
              satisfied={days.satisfied}
              goals={days.goals}
              dates={days.dates}
              size="lg"
              sequence={AT.lights}
              flare={landed && !reduce && celebrating}
            />
            <p className="seq flex items-center gap-2 text-md text-text-2" style={at(AT.run)}>
              <Flame className="h-5 w-4" state={flame} flicker={flame === "full"} />
              <span className="inline-flex overflow-hidden font-semibold tabular-nums text-text">
                <span
                  key={run}
                  className={clsx(
                    "block",
                    landed && !reduce && screen.celebration === "full" && "streak-tick",
                  )}
                >
                  {run}
                </span>
              </span>
              <Plural value={run ?? 0} one="day in a row" other="days in a row" />
            </p>
          </div>
        )}

        {/* A round's own count is the large number, so the day it belongs to sits here. */}
        {counted && byRound && (
          <p
            className="seq mt-4 max-w-[32ch] text-pretty text-sm text-muted"
            style={at(AT.run + 120)}
          >
            {attempts >= goal ? (
              <Plural value={attempts} one="# review today" other="# reviews today" />
            ) : (
              <Trans>
                {attempts} of {goal} reviews today
              </Trans>
            )}
          </p>
        )}

        {/* Unpressable while still invisible: the tap that finishes the sequence must not also press a hidden button. */}
        <div
          className={clsx("mt-6 grid w-full gap-2.5 @3xl:mt-8", !instant && "pointer-events-none")}
        >
          {/* One shape for every way on, the count said in words so it never reads as a shortcut; Done is the amber one. */}
          {ways.map((way, i) => (
            <button
              key={way.key}
              type="button"
              onClick={way.onClick}
              className={buttonClass("secondary", "lg", "seq w-full")}
              style={at(AT.actions + i * AT.actionStep)}
            >
              {way.icon}
              {way.label}
            </button>
          ))}
          {actions && (
            <div className="seq grid gap-2" style={at(actionsAt)}>
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Rolls a number up from where this stretch began, so what the review added is seen happen. */
function CountUp({
  from,
  to,
  delay,
  instant,
}: {
  from: number;
  to: number;
  delay: number;
  instant: boolean;
}) {
  const { i18n } = useLingui();
  const value = useMotionValue(instant ? to : from);
  const text = useTransform(value, (v) => i18n.number(Math.round(v)));
  useEffect(() => {
    if (instant) {
      value.jump(to);
      return;
    }
    const controls = animateValue(value, to, {
      delay: delay / 1000,
      duration: Math.min(1.2, 0.5 + Math.abs(to - value.get()) * 0.02),
      ease: [0.25, 1, 0.5, 1],
    });
    return () => controls.stop();
  }, [value, to, delay, instant]);
  // The box holds the final width, so the digits never shift the line while they roll.
  return (
    <motion.span
      className="inline-block text-center tabular-nums"
      style={{ minWidth: `${i18n.number(to).length * 0.62}em` }}
    >
      {text}
    </motion.span>
  );
}

export function ReviewError({
  retry,
  action,
  title,
  body,
}: {
  retry: () => void;
  action?: ReactNode;
  title?: ReactNode;
  body?: ReactNode;
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-5 grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
        <CircleAlert className="size-5" aria-hidden="true" />
      </span>
      <h2 className="text-2xl font-medium">{title ?? <Trans>Couldn’t load your cards</Trans>}</h2>
      <p className="mt-2 max-w-[30ch] text-md text-muted">
        {body ?? <Trans>Check your connection and try again.</Trans>}
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
