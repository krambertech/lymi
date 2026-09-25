import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { Rating } from "@lymi/core";
import { clsx } from "clsx";
import { BookMarked, Library, Loader2, Pointer, Signpost, Volume2, X } from "lucide-react";
import {
  AnimatePresence,
  animate as animateValue,
  motion,
  useAnimate,
  useIsPresent,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type Variants,
} from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "../components/button";
import { CardNotes } from "../components/card-notes";
import { CardPicture } from "../components/card-picture";
import { Chip, SourceChip, StateChip } from "../components/chip";
import { ErrorState } from "../components/empty-state";
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
  /** A stretch's own progress, which the track and count show instead of the goal's. */
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
      {/* The screen is chromeless by design, so its heading is for the screen reader alone. */}
      <h1 className="sr-only">
        <Trans>Review</Trans>
      </h1>
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
          label={round ? t`Review progress` : t`Daily goal progress`}
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 text-sm font-medium tabular-nums text-text-2">
          {/* The slash is read aloud as a fraction, so a screen reader gets the sentence instead. */}
          <span aria-hidden="true">
            <RollingCount value={done} animate={animateCount} />/{size}
          </span>
          <span className="sr-only">
            <Trans>
              {done} of {size}
            </Trans>
          </span>
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

const COUNT_ROLL = {
  below: { y: "80%", opacity: 0 },
  shown: { y: 0, opacity: 1 },
  leave: (animate: boolean) =>
    animate
      ? { y: "-80%", opacity: 0, transition: { duration: 0.14, ease: EASE_OUT } }
      : { opacity: 0, transition: { duration: 0 } },
};

/** The count rolls up when a card lands, so the change is seen rather than noticed later. */
function RollingCount({ value, animate }: { value: number; animate: boolean }) {
  return (
    <span className="relative inline-grid overflow-hidden align-bottom">
      {/* `custom` reaches the leaving digit, whose own props are from before this change. */}
      <AnimatePresence initial={false} mode="popLayout" custom={animate}>
        <motion.span
          key={value}
          className="inline-block"
          custom={animate}
          variants={COUNT_ROLL}
          initial={animate ? "below" : false}
          animate="shown"
          exit="leave"
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
          aria-disabled={state === "loading"}
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
          <Trans>Recall the answer, then tap the card</Trans>
        </span>
        <span className="hidden @2xl:inline">
          <Trans>Recall the answer, then reveal the card</Trans>
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
  /** The deck's section the card is in, named after the deck. */
  section?: string | undefined;
  revealed: boolean;
  animateReveal?: boolean | undefined;
  /** The words fade in as the card arrives. Off when the grade before it came from the keyboard. */
  animateIn?: boolean | undefined;
  /** Show how to reveal: the pointing hand with the words under it. */
  hint?: boolean | undefined;
  /** Focus the reveal, for a learner who graded the card before this one from the grade buttons. */
  focusOnMount?: boolean | undefined;
  onReveal: () => void;
  onPlayAudio?: (() => void) | undefined;
  audioState?: "idle" | "loading" | "playing" | undefined;
  /** Why the pronunciation did not play. Shown on the button, never as a line in the card. */
  audioError?: string | null | undefined;
  className?: string | undefined;
}

/** The grade strip's full height, 72 px grades under a 12 px gap, which the card gives up on reveal. */
export const GRADE_STRIP_HEIGHT = 84;

/** Text that does not fit steps down the type scale this many times before the card scrolls. */
const TEXT_STEPS = 2;
const CUE_SIZE = ["text-4xl @3xl:text-5xl", "text-3xl @3xl:text-4xl", "text-2xl @3xl:text-3xl"];
const TERM_SIZE = ["text-3xl", "text-2xl", "text-xl"];
const MEANING_SIZE = ["text-xl", "text-lg", "text-md"];
const PICTURE_TARGET_SIZE = ["text-2xl", "text-xl", "text-lg"];
const CONTEXT_SIZE = ["text-xl", "text-lg", "text-md"];

interface Fit {
  step: number;
  settled: boolean;
}
const UNMEASURED: Fit = { step: 0, settled: false };

const px = (value: string) => Number.parseFloat(value) || 0;

interface FitElements {
  section: HTMLElement | null;
  inner: HTMLElement | null;
  head: HTMLElement | null;
  column: HTMLElement | null;
  cue: HTMLElement | null;
  answer: HTMLElement | null;
  extras: HTMLElement | null;
}

/**
 * Whether the cue fits the card before reveal, and the cue with its target after. Example and notes
 * never shrink the type; they scroll. Heights come from the stage the card fills rather than the
 * card, whose own height is still animating while the grade strip opens.
 */
function measureFit(els: FitElements) {
  const { section, inner, head, column, cue, answer, extras } = els;
  const stage = section?.parentElement;
  if (!section || !stage || !inner || !head || !column || !cue || !answer) return null;
  const style = getComputedStyle(section);
  const stageStyle = getComputedStyle(stage);
  let siblings = 0;
  for (const child of stage.children) {
    if (child === section || !(child instanceof HTMLElement) || "gradeStrip" in child.dataset)
      continue;
    siblings += child.offsetHeight;
  }
  const room =
    stage.clientHeight -
    px(stageStyle.paddingTop) -
    px(stageStyle.paddingBottom) -
    siblings -
    px(style.marginTop) -
    px(style.marginBottom);
  const maxHeight = style.maxHeight === "none" ? Number.POSITIVE_INFINITY : px(style.maxHeight);
  const cardHeight = (height: number) => Math.min(maxHeight, Math.max(px(style.minHeight), height));
  const innerStyle = getComputedStyle(inner);
  const columnStyle = getComputedStyle(column);
  const chrome =
    px(innerStyle.paddingTop) +
    px(innerStyle.paddingBottom) +
    head.offsetHeight +
    px(columnStyle.paddingTop) +
    px(columnStyle.paddingBottom);
  const answerGap = extras?.parentElement ? px(getComputedStyle(extras.parentElement).rowGap) : 0;
  const must = answer.offsetHeight - (extras ? extras.offsetHeight + answerGap : 0);
  return {
    front: cue.offsetHeight,
    frontRoom: cardHeight(room) - chrome,
    back: cue.offsetHeight + px(columnStyle.rowGap) + must,
    backRoom: cardHeight(room - GRADE_STRIP_HEIGHT) - chrome,
  };
}

/**
 * The card. A flat plate with one hairline edge. Before reveal it is the cue alone, large: the
 * word, the meaning, or the picture. After reveal the cue glides up, the rule draws across, and
 * the target rises in under it with the rest of the card as context, each line labelled with its
 * source. A picture that cannot load gives way to its description, so the card can still be graded.
 *
 * A long card keeps its grades in view: its cue and target step down in size, and what still does
 * not fit scrolls inside the plate.
 */
export function ReviewCard({
  item,
  deck,
  section,
  revealed,
  animateReveal = true,
  animateIn = false,
  hint = false,
  focusOnMount = false,
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
  const label =
    mode.cue === "term"
      ? t`Recognition card for ${front}`
      : mode.cue === "meaning"
        ? t`Production card for ${front}`
        : t`Picture card`;

  const [fit, setFit] = useState<Fit>(UNMEASURED);
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const extrasRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusOnMount) revealRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  // Steps down one size at a time before the first paint, so the card never shows a size it leaves.
  useLayoutEffect(() => {
    if (fit.settled) return;
    const m = measureFit({
      section: sectionRef.current,
      inner: innerRef.current,
      head: headRef.current,
      column: columnRef.current,
      cue: cueRef.current,
      answer: answerRef.current,
      extras: extrasRef.current,
    });
    if (!m) {
      setFit({ ...fit, settled: true });
      return;
    }
    const fits = m.front <= m.frontRoom && m.back <= m.backRoom;
    setFit(
      !fits && fit.step < TEXT_STEPS ? { ...fit, step: fit.step + 1 } : { ...fit, settled: true },
    );
  }, [fit]);

  // A new size, or the font arriving, measures again from the largest step.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = section?.parentElement;
    if (!section || !stage) return;
    let last = "";
    const observer = new ResizeObserver(() => {
      // Offset width, so a scrollbar appearing is not a new size to measure for.
      const next = `${section.offsetWidth} ${stage.clientWidth}x${stage.clientHeight}`;
      if (last && next !== last) setFit(UNMEASURED);
      last = next;
    });
    observer.observe(section);
    observer.observe(stage);
    let live = true;
    if (document.fonts?.status === "loading") {
      void document.fonts.ready.then(() => live && setFit(UNMEASURED));
    }
    return () => {
      live = false;
      observer.disconnect();
    };
  }, []);

  const step = fit.step;
  const hasExtras = !!(card.example || card.notes);
  const languageCode =
    card.language && card.language.toLowerCase() !== deck?.language?.toLowerCase()
      ? card.language.toUpperCase()
      : null;
  const tail = [mode.cue === "image" ? i18n._(modeLabel(mode)) : null, languageCode].filter(
    (part): part is string => !!part,
  );
  // Only the AI is marked: the learner's words and the lesson's are the ordinary case, CONTEXT.md.
  const aiMeaning = card.meaningSource === "ai";
  const aiExample = card.exampleSource === "ai" && !!card.example;
  const chips = aiMeaning || aiExample || !!card.source;

  const audio = (className?: string) =>
    onPlayAudio && (
      <AudioButton
        state={audioState}
        error={audioError}
        onPlay={onPlayAudio}
        className={className}
      />
    );
  // The measuring copy holds the button's place without a second live button.
  const audioPlace = () =>
    onPlayAudio && (
      <span className="whitespace-nowrap">
        {"\u2060"}
        <span className="ms-3 inline-flex h-[1lh] items-center align-top">
          <span className="size-8" />
        </span>
      </span>
    );

  const extrasLines = (
    <>
      {card.example && (
        <motion.p
          variants={answerLine}
          className="hyphenate whitespace-pre-line text-md leading-relaxed text-text-2 [overflow-wrap:anywhere]"
          lang={card.language ?? undefined}
        >
          {card.example}
        </motion.p>
      )}
      {card.notes && (
        <motion.div variants={answerLine} className="text-sm text-muted">
          <CardNotes source={card.notes} />
        </motion.div>
      )}
    </>
  );

  /** Everything under the rule. `measure` is the hidden copy that sizes a card before its reveal. */
  const answer = (measure: boolean) => {
    const sound = measure ? audioPlace : audio;
    const pronunciation = card.pronunciation && (
      <motion.p variants={answerLine} className="text-md text-muted [overflow-wrap:anywhere]">
        {card.pronunciation}
      </motion.p>
    );
    return (
      <>
        <motion.div
          variants={answerRule}
          aria-hidden="true"
          className="h-px bg-edge ltr:origin-left rtl:origin-right"
        />
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {mode.target === "term" ? (
            <>
              <motion.p
                variants={answerLine}
                className={clsx(
                  "hyphenate font-medium leading-[1.2] text-text [overflow-wrap:anywhere]",
                  TERM_SIZE[step],
                )}
                lang={card.language ?? undefined}
              >
                {card.term}
                {sound()}
              </motion.p>
              {pronunciation}
              {picture && card.meaning && (
                <motion.p
                  variants={answerLine}
                  className={clsx(
                    "hyphenate whitespace-pre-line leading-[1.35] text-text-2 [overflow-wrap:anywhere]",
                    CONTEXT_SIZE[step],
                  )}
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
                  "hyphenate whitespace-pre-line leading-[1.3] text-text [overflow-wrap:anywhere]",
                  picture ? ["font-medium", PICTURE_TARGET_SIZE[step]] : MEANING_SIZE[step],
                )}
              >
                {back}
              </motion.p>
              {picture && (
                <>
                  <motion.p
                    variants={answerLine}
                    className={clsx(
                      "hyphenate leading-[1.35] text-text-2 [overflow-wrap:anywhere]",
                      CONTEXT_SIZE[step],
                    )}
                    lang={card.language ?? undefined}
                  >
                    {card.term}
                    {sound()}
                  </motion.p>
                  {pronunciation}
                </>
              )}
            </>
          )}
          {!picture &&
            card.image &&
            (measure ? (
              <div className="py-1">
                <div
                  style={{
                    aspectRatio: `${card.image.width} / ${card.image.height}`,
                    width: `min(100%, calc(min(16dvh, 120px) * ${(card.image.width / card.image.height).toFixed(4)}))`,
                  }}
                />
              </div>
            ) : (
              <motion.div variants={answerLine} className="py-1">
                <CardPicture
                  image={card.image}
                  maxHeight="min(16dvh, 120px)"
                  fallback="placeholder"
                />
              </motion.div>
            ))}
          {hasExtras && (
            <div ref={extrasRef} className="grid grid-cols-[minmax(0,1fr)] gap-3">
              {extrasLines}
            </div>
          )}
          {chips && (
            <motion.div variants={answerLine} className="mt-1 flex flex-wrap gap-1.5">
              {aiMeaning && <SourceChip source="ai" field="meaning" size="xs" />}
              {aiExample && <SourceChip source="ai" field="example" size="xs" />}
              {card.source && (
                <Chip size="sm" className="min-w-0 max-w-full">
                  <Library className="size-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{t`Source`}</span>
                  <span className="truncate">{card.source}</span>
                </Chip>
              )}
            </motion.div>
          )}
        </div>
      </>
    );
  };

  return (
    // The whole plate reveals the answer, so the control is a button covering the plate rather than
    // a caption at its foot: pressing the card is what a card affords, and the most-pressed control
    // on the screen should not look like a footnote. It covers everything that scrolls, so a long
    // cue can still be scrolled and pressed anywhere.
    <section
      ref={sectionRef}
      aria-label={label}
      className={clsx(
        "edge relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-plate",
        !revealed && "cursor-pointer hoverable:hover:edge-2",
        className,
      )}
    >
      {/* The fades sit inside the padding, so they only ever soften text that has scrolled under an edge. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [mask-image:linear-gradient(transparent,#000_1rem,#000_calc(100%-1.25rem),transparent)]">
        <div ref={innerRef} className="relative flex shrink-0 grow flex-col p-5 @3xl:p-6">
          {!revealed && (
            <button
              ref={revealRef}
              type="button"
              onClick={onReveal}
              aria-label={t`Reveal the card`}
              className="absolute inset-0 z-10 rounded-xl"
            />
          )}
          <div
            ref={headRef}
            className={clsx(
              "flex items-center justify-between gap-3 text-sm text-muted @3xl:text-xs",
              animateIn && "enter-fade",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5">
              {deck && (
                <>
                  <BookMarked className="size-3.5 shrink-0" aria-hidden="true" />
                  {/* The section is the news, so on a narrow phone the deck name truncates first. */}
                  <span className="min-w-0 truncate font-medium text-text-2">{deck.name}</span>
                </>
              )}
              {section && (
                <>
                  {deck && <span aria-hidden="true">·</span>}
                  <Signpost className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{t`Section`}</span>
                  <span className="min-w-0 max-w-[60%] shrink-0 truncate">{section}</span>
                </>
              )}
              {/* A text cue says what to recall by itself; only a picture needs its mode named.
                  The deck implies its language, so the code shows only for a card that differs. */}
              {tail.length > 0 && (
                <>
                  {(deck || section) && <span aria-hidden="true">·</span>}
                  <span className="max-w-full shrink-0 truncate">{tail.join(" · ")}</span>
                </>
              )}
            </span>
            <StateChip state={item.fsrsState} size="lg" inReview />
          </div>

          <div
            ref={columnRef}
            className={clsx(
              "relative flex flex-1 flex-col justify-center gap-5 py-2",
              animateIn && "enter-fade",
            )}
          >
            <motion.div
              ref={cueRef}
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
                    className={clsx(
                      "hyphenate whitespace-pre-line font-medium tracking-[-0.03em] text-text [overflow-wrap:anywhere]",
                      CUE_SIZE[step],
                    )}
                  >
                    {front}
                    {mode.cue === "term" && audio("z-20")}
                  </p>
                  {mode.cue === "term" && card.pronunciation && (
                    <p className="text-md text-muted [overflow-wrap:anywhere]">
                      {card.pronunciation}
                    </p>
                  )}
                </>
              )}
            </motion.div>

            {revealed ? (
              <motion.div
                ref={answerRef}
                variants={answerGroup}
                initial={animateReveal ? "hidden" : false}
                animate="shown"
                className="grid grid-cols-[minmax(0,1fr)] gap-5"
              >
                {answer(false)}
              </motion.div>
            ) : (
              <div
                aria-hidden="true"
                inert
                className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
              >
                <div ref={answerRef} className="grid grid-cols-[minmax(0,1fr)] gap-5">
                  {answer(true)}
                </div>
              </div>
            )}
          </div>
          <AnimatePresence>{!revealed && hint && <TapHint />}</AnimatePresence>
        </div>
      </div>
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
 * Opens from nothing, which is what shrinks the card above it, and closes to nothing after a grade,
 * which grows the card back. The glide matches the word's inside the card, so the word's two
 * movements land as one. It clips only while opening or closing, so a pressed grade's scale and
 * focus ring are not cut off in between; mounting on each reveal resets that.
 */
function OpeningStrip({ animate: wanted, children }: { animate: boolean; children: ReactNode }) {
  // Height is not a transform, so MotionConfig's reduced motion does not stop it; this does.
  const reduce = useReducedMotion();
  const animate = wanted && !reduce;
  const [opened, setOpened] = useState(!animate);
  // A closing strip is only a picture of the grades: nothing in it can be pressed, focused or read out.
  const present = useIsPresent();
  return (
    <motion.div
      data-grade-strip=""
      className={clsx("shrink-0", (!opened || !present) && "overflow-hidden")}
      variants={{ closed: (animateOut: boolean) => (animateOut && !reduce ? CLOSING : CLOSED) }}
      initial={animate ? { height: 0 } : false}
      animate={{ height: "auto" }}
      exit="closed"
      transition={{ duration: 0.34, ease: EASE_OUT }}
      onAnimationComplete={() => setOpened(true)}
      inert={!present}
      aria-hidden={!present || undefined}
    >
      {children}
    </motion.div>
  );
}

const CLOSING = {
  height: 0,
  opacity: 0,
  transition: { duration: 0.3, ease: EASE_OUT, opacity: { duration: 0.12 } },
};
const CLOSED = { height: 0, opacity: 0, transition: { duration: 0 } };

export interface GradeBarProps {
  id?: string | undefined;
  /** Before the answer is showing there is no strip, and the card takes its room. */
  revealed: boolean;
  /** The grades rise in one after another. Off when the reveal came from the keyboard. */
  animateIn?: boolean | undefined;
  /** The strip closes and the card grows back into its room. Off when the grade came from the keyboard. */
  animateOut?: boolean | undefined;
  /** Take focus as the strip opens, because the reveal button that held it is gone. */
  focusOnReveal?: boolean | undefined;
  /** The four dates FSRS would set, keyed by rating. Announced, not shown. */
  next?: Record<Rating, string> | undefined;
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
  animateOut = false,
  focusOnReveal = false,
  next,
  onGrade,
  className,
}: GradeBarProps) {
  const { t, i18n } = useLingui();
  const now = new Date();
  const group = useRef<HTMLFieldSetElement>(null);
  // The group, not a grade, takes focus: the 1–4 and Space shortcuts skip a focused button.
  useEffect(() => {
    if (revealed && focusOnReveal) group.current?.focus({ preventScroll: true });
  }, [revealed, focusOnReveal]);
  return (
    // `custom` reaches the closing strip, whose own props are from before the grade.
    <AnimatePresence initial={false} custom={animateOut}>
      {revealed && (
        <OpeningStrip key="strip" animate={animateIn}>
          <fieldset
            ref={group}
            id={id}
            tabIndex={-1}
            className={clsx("pt-[12px] outline-none", className)}
          >
            <legend className="sr-only">
              <Trans>Choose a recall grade</Trans>
            </legend>
            <motion.div
              variants={gradeGroup}
              initial={animateIn ? "hidden" : false}
              animate="shown"
              className="grid grid-cols-4 gap-2"
            >
              {GRADES.map((g) => {
                const GradeIcon = g.icon;
                const label = i18n._(g.label);
                const schedules = next
                  ? intervalLabel(i18n, now, new Date(next[g.rating]))
                  : undefined;
                return (
                  <motion.div key={g.rating} variants={gradeRise} className="grid min-w-0">
                    <button
                      type="button"
                      aria-label={schedules ? t`${label}, next in ${schedules}` : undefined}
                      onClick={() => onGrade(g.rating)}
                      className={clsx(
                        "edge relative grid h-[72px] min-w-0 content-center gap-1 rounded-lg bg-plate px-1 text-sm font-medium text-text-2",
                        "transition-[scale,background-color,box-shadow] duration-150 ease-out @2xl:text-base",
                        "hoverable:hover:edge-2 hoverable:hover:bg-hover hoverable:hover:text-text active:scale-[0.96]",
                      )}
                    >
                      <span className={clsx("mx-auto grid size-5 place-items-center", g.iconClass)}>
                        <GradeIcon className="size-[18px]" aria-hidden="true" strokeWidth={1.75} />
                      </span>
                      <span>{label}</span>
                      <span className="hidden @3xl:contents">
                        <Kbd
                          tone="default"
                          className="absolute end-2.5 top-2.5 h-4 min-w-4 rounded-full px-1.5 text-2xs"
                        >
                          {g.key}
                        </Kbd>
                      </span>
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </fieldset>
        </OpeningStrip>
      )}
    </AnimatePresence>
  );
}

export interface ReviewCompleteProps {
  /** What the end says and offers, from `reviewEnd`. */
  end: EndScreen;
  /** Today's attempts in every scope. */
  attempts: number;
  /** Today's attempts at the last end screen, or when the review opened, where the count rolls up from. */
  from?: number | undefined;
  /** The deck or series a scoped review is of, which Nothing left names. */
  scopeName?: string | undefined;
  /** The streak with this review in it. */
  streak?: StreakSummary | undefined;
  /** The streak as it stood before, so today's light fills and the run ticks on screen. */
  streakBefore?: StreakSummary | undefined;
  /** The flame the lantern had in the header, so it rises from there rather than from rest. */
  lanternFrom?: number | "out" | "brand" | undefined;
  onOffer?: ((offer: Offer) => void) | undefined;
  /** Done, as a link or a button in the given weight. */
  done: (variant: "primary" | "secondary") => ReactNode;
  /** The primary action when nothing is due. */
  addCards?: ReactNode | undefined;
  /** Move focus to the heading, so it is announced and Tab starts at the choices. */
  focusOnMount?: boolean | undefined;
}

/** When each part of the end arrives, in ms after the last grade; docs/design/system/motion.md. */
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

/** The last ember leaves by then, however many there are. */
const EMBERS_SPREAD_MS = 1400;
/** Steps through [0, 1) by a golden ratio, so embers never bunch however many there are. */
const spread = (i: number, step: number) => (i * step) % 1;

/** Embers off the flame: where each drifts to, when it leaves and how long it lasts. */
function embersOf(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    x: Math.round((spread(i + 1, 0.618034) - 0.5) * 56),
    y: -Math.round(96 + spread(i + 1, 0.754878) * 90),
    at: Math.round((i * Math.min(EMBERS_SPREAD_MS, 110 * n)) / n),
    dur: Math.round(1300 + spread(i + 1, 0.56984) * 900),
    size: 3 + Math.round(spread(i + 1, 0.414214) * 4) / 2,
  }));
}

const at = (ms: number) => ({ "--at": `${ms}ms` }) as CSSProperties;
/** The `.seq` rise in `styles/entrances.css`. */
const RISE_MS = 560;

/** The end of a review, played as one sequence that any tap or key finishes; docs/design/system/motion.md. */
export function ReviewComplete({
  end: screen,
  attempts,
  from = attempts,
  scopeName,
  streak,
  streakBefore = streak,
  lanternFrom,
  onOffer,
  done,
  addCards,
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
  const week = landed ? streak : streakBefore;
  const days = week ? lastDays(week) : undefined;
  const flame = week ? streakFlameFor(week) : "lit";
  const lit = !lanternFor(streak).out;
  const embers = useMemo(
    () => (lit && !reduce ? embersOf(screen.embers) : []),
    [lit, reduce, screen.embers],
  );
  // Only the day turning ticks the run; any other end shows the run as it stands.
  const run = screen.streak ? week?.current : (streak ?? week)?.current;
  const proceed = screen.offers.find((o) => o.kind === "continue");
  const ways = screen.offers
    .filter((offer) => !(offer.kind === "continue" && screen.continueLeads))
    .map((offer) => ({
      key: offer.kind,
      icon: offer.kind === "forgotten" ? <StateIcon state="forgot" className="size-4" /> : null,
      label:
        offer.kind === "forgotten"
          ? t`${plural(offer.count, { one: "Review # forgotten card", other: "Review # forgotten cards" })}`
          : t`Continue`,
      onClick: () => onOffer?.(offer),
    }));
  const actionsAt = AT.actions + ways.length * AT.actionStep;
  const embersEnd = AT.embers + Math.max(0, ...embers.map((e) => e.at + e.dur));
  const end = Math.max(actionsAt + RISE_MS, embers.length ? embersEnd : 0);

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
                !embers.length && "opacity-50",
              )}
              style={at(AT.pool)}
            >
              <div className="light-pool-breath size-full rounded-full" />
            </div>
          )}
          <Lantern className="size-full" {...lanternFor(streak)} from={lanternFrom} flicker glow />
          {embers.length > 0 && (
            <div aria-hidden="true" className="pointer-events-none absolute start-1/2 top-[52%]">
              {embers.map((e) => (
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
          ) : screen.heading === "day_done" ? (
            <Trans>You’re done for today</Trans>
          ) : screen.heading === "scope_done" ? (
            scopeName ? (
              <Trans>Nothing left in {scopeName}</Trans>
            ) : (
              <Trans>Nothing left in this deck</Trans>
            )
          ) : screen.heading === "nothing_due" ? (
            <Trans>Nothing due</Trans>
          ) : screen.heading === "round_done" ? (
            <Trans>Round done</Trans>
          ) : (
            <Trans>Review done</Trans>
          )}
        </h2>

        {counted ? (
          <p className="mt-3 grid justify-items-center gap-1 @3xl:mt-4">
            <span
              className="seq-count block text-6xl font-medium leading-none tracking-[-0.04em] text-text @3xl:text-7xl"
              style={at(AT.count)}
            >
              <CountUp from={from} to={attempts} delay={AT.countRoll} instant={instant} />
            </span>
            <span className="seq text-md text-text-2" style={at(AT.count + 80)}>
              <Plural value={attempts} one="review today" other="reviews today" />
            </span>
          </p>
        ) : (
          <p className="seq mt-2 max-w-[32ch] text-pretty text-md text-text-2" style={at(AT.count)}>
            <Trans>Come back later, or add new cards.</Trans>
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
              flare={landed && !reduce && screen.streak}
            />
            <p className="seq flex items-center gap-2 text-md text-text-2" style={at(AT.run)}>
              <Flame className="h-5 w-4" state={flame} flicker={flame === "full"} />
              <span className="inline-flex overflow-hidden font-semibold tabular-nums text-text">
                <span
                  key={run}
                  className={clsx("block", landed && !reduce && screen.streak && "streak-tick")}
                >
                  {run}
                </span>
              </span>
              <Plural value={run ?? 0} one="day in a row" other="days in a row" />
            </p>
          </div>
        )}

        {/* While Continue leads, what is left of the day sits under its lights. */}
        {screen.nudge && (
          <p
            className="seq mt-4 max-w-[32ch] text-pretty text-sm text-muted"
            style={at(AT.run + 120)}
          >
            {screen.nudge.kind === "goal" ? (
              <Plural
                value={screen.nudge.count}
                one="# more review to your daily goal"
                other="# more reviews to your daily goal"
              />
            ) : (
              <Plural
                value={screen.nudge.count}
                one="# more card and you’re done for today"
                other="# more cards and you’re done for today"
              />
            )}
          </p>
        )}

        {/* Unpressable while still invisible: the tap that finishes the sequence must not also press a hidden button. */}
        <div
          className={clsx("mt-6 grid w-full gap-2.5 @3xl:mt-8", !instant && "pointer-events-none")}
        >
          {/* One shape for every way on, the count said in words so it never reads as a shortcut; the primary sits last. */}
          {ways.map((way, i) => (
            <Button
              key={way.key}
              size="lg"
              onClick={way.onClick}
              className="seq w-full"
              style={at(AT.actions + i * AT.actionStep)}
            >
              {way.icon}
              {way.label}
            </Button>
          ))}
          <div className="seq grid gap-2" style={at(actionsAt)}>
            {!counted ? (
              <>
                {addCards}
                {done("secondary")}
              </>
            ) : screen.continueLeads && proceed ? (
              <>
                {done("secondary")}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => onOffer?.(proceed)}
                  className="w-full"
                >
                  <Trans>Continue</Trans>
                </Button>
              </>
            ) : (
              done("primary")
            )}
          </div>
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
    <ErrorState
      title={title ?? <Trans>Couldn’t load your cards</Trans>}
      body={body}
      onRetry={retry}
      action={action}
      className="flex-1 px-6 py-12"
    />
  );
}

export function ReviewSkeleton() {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col">
      <Skeleton className="flex-1 rounded-xl @3xl:max-h-[600px] @3xl:min-h-[460px]" />
    </div>
  );
}
