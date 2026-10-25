import { plural } from "@lingui/core/macro";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import type { EndScreen, Offer } from "@lymi/client/review-end";
import {
  drawsTermReading,
  gradeAllowed,
  isolate,
  type KnownReadings,
  type Rating,
  type ReviewAid,
  shownTranslation,
  termShowsPronunciation,
  textDirection,
} from "@lymi/core";
import {
  END_OF_REVIEW as AT,
  EASE_OUT,
  endEmbers,
  INSTANT,
  LANTERN_FLIGHT,
  lanternFor,
  REVEAL_GLIDE,
  streakFlameFor,
} from "@lymi/design";
import { clsx } from "clsx";
import { BookMarked, Library, Lock, type LucideIcon, Pointer, Signpost, X } from "lucide-react";
import {
  AnimatePresence,
  animate as animateValue,
  motion,
  useIsPresent,
  useMotionValue,
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
import { PRIVATE_TEXT } from "@/lib/replay";
import { AudioButton, AudioPlace } from "../components/audio-button";
import { Button, IconButton } from "../components/button";
import { CardNotes } from "../components/card-notes";
import { CardPicture } from "../components/card-picture";
import { AiCardChip, Chip, StateChip } from "../components/chip";
import { ErrorState } from "../components/empty-state";
import { ErrorTip } from "../components/error-tip";
import { ExampleAudioButton, ExamplePlace } from "../components/example-audio";
import { ExampleLines } from "../components/example-lines";
import { Flame } from "../components/flame";
import { GRADES } from "../components/grade";
import {
  HOOK_OFFER_BOX,
  HookOffer,
  HookOfferFace,
  type HookOfferProps,
} from "../components/hook-offer";
import { Kbd } from "../components/kbd";
import { Lantern } from "../components/lantern";
import { embersEnd, LanternLight, RoomLight } from "../components/lantern-light";
import { Progress } from "../components/progress";
import {
  type AidStep,
  RecallAidNext,
  RecallAidShow,
  RecallAidShown,
} from "../components/recall-aid";
import { RollingNumber } from "../components/rolling-number";
import { SevenLights } from "../components/seven-lights";
import { Skeleton } from "../components/skeleton";
import { StateIcon, stateKey } from "../components/state-mark";
import { lastDays, type StreakSummary } from "../components/streak";
import { StreakStart } from "../components/streak-week";
import { TermText } from "../components/term-text";
import { TurnSpark } from "../components/turn-spark";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import type { QueueItem } from "../lib/api";
import { intervalLabel } from "../lib/i18n";
import { lastInputWasKey } from "../lib/last-input";
import { modeLabel } from "../lib/review-modes";
import { useReduceMotion } from "../lib/use-reduce-motion";

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
  /** The cards have not arrived, so there is no count yet: a "0/0" read as an empty review. */
  loading?: boolean | undefined;
  onClose?: (() => void) | undefined;
}

/** The lantern is one object carried between the header and the end of a review. */
const LANTERN_LAYOUT = "review-lantern";

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
  loading = false,
  onClose,
}: ReviewHeaderProps) {
  const { t } = useLingui();
  const reduce = useReduceMotion();
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
          animate={animateCount}
          className="min-w-0 flex-1"
        />
        {loading ? (
          <Skeleton className="h-4 w-9 shrink-0" />
        ) : (
          <span className="shrink-0 text-sm font-medium tabular-nums text-text-2">
            {/* The slash is read aloud as a fraction, so a screen reader gets the sentence instead. */}
            <span aria-hidden="true">
              <RollingNumber value={done} animate={animateCount} />/{size}
            </span>
            <span className="sr-only">
              <Trans>
                {done} of {size}
              </Trans>
            </span>
          </span>
        )}
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

/**
 * A pointing hand at the foot of an unrevealed card, for the learner who has not yet found that
 * the plate is the button. It taps three times, then rests. When it appears is `useRevealHint`'s
 * decision.
 */
function TapHint({ lifted, aided }: { lifted: boolean; aided: boolean }) {
  const reduce = useReduceMotion();
  return (
    <motion.div
      aria-hidden="true"
      className={clsx(
        "pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1 px-5 text-muted",
        // Clear of the aid's pill for the whole card, so it reads as its own line.
        lifted ? "bottom-20" : "bottom-5",
      )}
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
          {aided ? (
            <Trans>Tap to reveal the answer</Trans>
          ) : (
            <Trans>Try to remember, then tap to reveal</Trans>
          )}
        </span>
        <span className="hidden @2xl:inline">
          {aided ? (
            <Trans>Reveal the answer</Trans>
          ) : (
            <Trans>Try to remember, then reveal the answer</Trans>
          )}
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
  /** The deck's section the card is in, named under the answer in place of the card's source. */
  section?: string | undefined;
  /** The learner's Known pairs, whose readings fade in the example. */
  knownReadings?: KnownReadings | undefined;
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
  /** The offer to write a hook, pinned at the plate's foot once the answer shows. Its room is kept from the reveal. */
  offer?: HookOfferProps | undefined;
  /** Help before the reveal, from `aidSteps`, and how many steps the learner has taken. */
  aid?: RecallAidProps | undefined;
  /** The hook's editor, in the hook's own place under the cue, while the learner writes one. */
  hookEditor?: ReactNode | undefined;
  /** A control after the state chip; the chip slides aside as it arrives. */
  headEnd?: ReactNode | undefined;
  /** Give the head a slot for `headEnd`, empty and closed until it holds one. */
  headSlot?: boolean | undefined;
  className?: string | undefined;
}

export interface RecallAidProps {
  steps: readonly AidStep[];
  /** Steps taken before the reveal: the help a grade records. */
  taken: number;
  /** Shown on request after the reveal, which is not help and records nothing. */
  shown: boolean;
  /** The last step taken or shown arrives in motion. Off when a key asked for it. */
  animate: boolean;
  onTake: (input: "keyboard" | "pointer") => void;
  onShow: (input: "keyboard" | "pointer", focused: boolean) => void;
}

/** A tap this soon after taking an aid is the same gesture doubled, not a reveal. */
const AID_TAP_GUARD_MS = 400;

/** The cue's glide up as the answer or an aid arrives under it. */

/** An aid taken away fades where it stood, or goes at once after a key. */
const AID_LEAVE: Variants = {
  gone: (animate: boolean) => ({
    opacity: 0,
    transition: { duration: animate ? 0.14 : 0, ease: EASE_OUT },
  }),
};

/** The Show hook button's height, `sm`, which the aid's place under the cue never drops below. */
const AID_SHOW_HEIGHT = 32;

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
  /** The cue itself, without the aid under it, whose room is `aidRoom` whether shown or not. */
  cue: HTMLElement | null;
  answer: HTMLElement | null;
  extras: HTMLElement | null;
}

/**
 * Whether the cue fits the card before reveal, and the cue with its target after. Example and notes
 * never shrink the type; they scroll. Heights come from the stage the card fills rather than the
 * card, whose own height is still animating while the grade strip opens.
 *
 * `offerFoot` is the fix's room at the foot after the reveal, `pillFoot` the aid pill's before it,
 * and `aidRoom` what the aid's lines take under the cue whether shown or not.
 */
function measureFit(els: FitElements, offerFoot: number, pillFoot: number, aidRoom: number) {
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
  const front = cue.offsetHeight + aidRoom;
  return {
    front,
    frontRoom: cardHeight(room) - chrome - pillFoot,
    back: front + px(columnStyle.rowGap) + must,
    backRoom: cardHeight(room - GRADE_STRIP_HEIGHT) - chrome - offerFoot,
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
  knownReadings,
  revealed,
  animateReveal = true,
  animateIn = false,
  hint = false,
  focusOnMount = false,
  onReveal,
  onPlayAudio,
  audioState = "idle",
  audioError = null,
  offer,
  aid,
  hookEditor,
  headEnd,
  headSlot = false,
  className,
}: ReviewCardProps) {
  const { t, i18n } = useLingui();
  const reduce = useReduceMotion();
  const { card, mode } = item;
  const picture = mode.cue === "image" ? card.image : null;
  const noMeaning = t`No meaning yet`;
  const back = mode.target === "term" ? card.term : (card.meaning ?? noMeaning);
  const front = mode.cue === "meaning" ? (card.meaning ?? card.term) : card.term;
  // Furigana, pinyin or stress marks on the term: on the cue until the card is Known, and always once it is the answer.
  const reading = useMemo(() => termShowsPronunciation(card), [card]);
  // Marks drawn in place are the term's own text, so only a reading drawn over it needs a line for a screen reader.
  const readingOver = useMemo(() => drawsTermReading(card), [card]);
  const cueReading = revealed || stateKey(item.fsrsState) !== "known";
  const term = <TermText card={card} />;
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
  const cueTextRef = useRef<HTMLDivElement>(null);
  const aidLines = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const extrasRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLButtonElement>(null);
  const pillRoom = useRef<HTMLDivElement>(null);
  const tookAidAt = useRef(Number.NEGATIVE_INFINITY);
  // An aid taken away, as Undo does to a hook kept from the fix sheet, leaves in motion unless a key asked.
  const [hadAid, setHadAid] = useState(!!aid);
  const [aidGone, setAidGone] = useState<{ animate: boolean } | null>(null);
  if (hadAid !== !!aid) {
    setHadAid(!!aid);
    setAidGone(aid ? null : { animate: !lastInputWasKey() });
  }
  // Read out once it can be seen, so a screen reader hears of the fix when a sighted learner would.
  const [offerSeen, setOfferSeen] = useState(false);

  useEffect(() => {
    if (focusOnMount) revealRef.current?.focus({ preventScroll: true });
  }, [focusOnMount]);

  const hasOffer = !!offer;
  const offerRoom = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  // Steps down one size at a time before the first paint, so the card never shows a size it leaves.
  useLayoutEffect(() => {
    if (fit.settled) return;
    const m = measureFit(
      {
        section: sectionRef.current,
        inner: innerRef.current,
        head: headRef.current,
        column: columnRef.current,
        cue: cueTextRef.current,
        answer: answerRef.current,
        extras: extrasRef.current,
      },
      offerRoom.current?.offsetHeight ?? 0,
      pillRoom.current?.offsetHeight ?? 0,
      aidLines.current && cueRef.current
        ? Math.max(aidLines.current.offsetHeight, AID_SHOW_HEIGHT) +
            px(getComputedStyle(cueRef.current).rowGap)
        : 0,
    );
    if (!m) {
      setFit({ ...fit, settled: true });
      return;
    }
    const fits = m.front <= m.frontRoom && m.back <= m.backRoom;
    setFit(
      !fits && fit.step < TEXT_STEPS ? { ...fit, step: fit.step + 1 } : { ...fit, settled: true },
    );
  }, [fit]);

  // An offer arriving takes room from the answer; a parked one keeps its room until the grade.
  const offerMeasured = useRef(hasOffer);
  useEffect(() => {
    if (!hasOffer || offerMeasured.current) return;
    offerMeasured.current = true;
    setFit(UNMEASURED);
  }, [hasOffer]);

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
  const shownAfter = !!aid && revealed && aid.shown;
  // Taken before the reveal or shown after it, the aid has one place: under the cue, where it stays.
  const aidsOnShow = aid
    ? shownAfter
      ? aid.steps.length
      : Math.min(aid.taken, aid.steps.length)
    : 0;
  const aidAnimate = aid?.animate ?? true;
  const spokenAid = aidsOnShow > 0 ? aid?.steps[aidsOnShow - 1]?.text : undefined;
  // The last movement in the cue's block: the aid leaving or arriving, or else the reveal.
  const cueGlide = aidGone
    ? aidGone.animate
    : revealed
      ? shownAfter
        ? aidAnimate
        : animateReveal
      : aidsOnShow > 0
        ? aidAnimate
        : animateReveal;
  // The answer moves only when the aid over it arrives or leaves after the reveal.
  const answerGlide = aidGone ? aidGone.animate : shownAfter && aidAnimate;
  const hasExtras = !!(card.example || card.notes);
  const translation = shownTranslation(card);
  const languageCode =
    card.language && card.language.toLowerCase() !== deck?.language?.toLowerCase()
      ? card.language.toUpperCase()
      : null;
  const tail = [mode.cue === "image" ? i18n._(modeLabel(mode)) : null, languageCode].filter(
    (part): part is string => !!part,
  );
  // Only the AI is marked: the learner's words and the lesson's are the ordinary case, CONTEXT.md.
  const aiWritten =
    card.meaningSource === "ai" ||
    (card.exampleSource === "ai" && !!card.example) ||
    (card.exampleTranslationSource === "ai" && !!translation) ||
    (card.notesSource === "ai" && !!card.notes) ||
    (card.pronunciationSource === "ai" && !!card.pronunciation);
  // Where the card sits: its section, or the source it came from when it has none. Sources written
  // before sections existed tend to restate the section, so the two never show together.
  const place = section
    ? { Icon: Signpost, label: t`Section`, name: section }
    : card.source
      ? { Icon: Library, label: t`Source`, name: card.source }
      : null;
  const chips = aiWritten || !!place;

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
  const audioPlace = () => onPlayAudio && <AudioPlace />;

  const extrasLines = (measure: boolean) => (
    <>
      {card.example && (
        <motion.div variants={answerLine}>
          <ExampleLines
            example={card.example}
            language={card.language}
            known={knownReadings}
            translation={translation}
            after={
              measure ? (
                <ExamplePlace card={card} />
              ) : (
                <ExampleAudioButton card={card} surface="review" />
              )
            }
            className="hyphenate whitespace-pre-line text-md leading-relaxed text-text-2 [overflow-wrap:anywhere]"
          />
        </motion.div>
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
    // Under the rule: a reading under a term cue reads the term out. Where it is drawn on the
    // term, the line is only for a screen reader.
    const pronunciation =
      card.pronunciation &&
      (reading ? (
        readingOver && (
          <p className="sr-only" lang={card.language ?? undefined}>
            {card.pronunciation}
          </p>
        )
      ) : (
        <motion.p
          variants={answerLine}
          className="text-md text-muted [overflow-wrap:anywhere]"
          lang={card.language ?? undefined}
        >
          {card.pronunciation}
        </motion.p>
      ));
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
                dir={textDirection(card.language)}
              >
                {term}
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
                  dir="auto"
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
                dir="auto"
              >
                {back}
              </motion.p>
              {mode.cue === "term" && pronunciation}
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
                    {term}
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
              {extrasLines(measure)}
            </div>
          )}
          {chips && (
            <motion.div variants={answerLine} className="mt-1 flex items-center gap-1.5">
              {place && (
                <Chip size="sm" className="min-w-0 max-w-full">
                  <place.Icon className="size-3 shrink-0" aria-hidden="true" />
                  <span className="sr-only">{place.label}</span>
                  <span className="truncate">{place.name}</span>
                </Chip>
              )}
              {aiWritten && <AiCardChip />}
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
      {/* The fades sit inside the padding, so they only ever soften text that has scrolled under an edge; under the offer the text shows through its frost, cut off at its foot. */}
      <div
        ref={scrollerRef}
        className={clsx(
          "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain",
          // Scroll padding as tall as the offer, so a focused control never scrolls in under it.
          offer && revealed
            ? "scroll-pb-13 [mask-image:linear-gradient(transparent,#000_1rem,#000_calc(100%-0.5rem),transparent_calc(100%-0.5rem))]"
            : "[mask-image:linear-gradient(transparent,#000_1rem,#000_calc(100%-1.25rem),transparent)]",
        )}
      >
        <div ref={innerRef} className="relative flex shrink-0 grow flex-col p-5 @3xl:p-6">
          {!revealed && (
            <button
              ref={revealRef}
              type="button"
              onClick={(e) => {
                // Only a pointer doubles a tap; Space or Enter on the card is always meant.
                if (e.detail > 0 && performance.now() - tookAidAt.current < AID_TAP_GUARD_MS)
                  return;
                onReveal();
              }}
              aria-label={t`Reveal the card`}
              data-reveal=""
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
              {/* The section waits for the answer, at the foot: before it, a lesson's topic is a hint. */}
              {deck && (
                <>
                  <BookMarked className="size-3.5 shrink-0" aria-hidden="true" />
                  <span dir="auto" className="min-w-0 truncate font-medium text-text-2">
                    {deck.name}
                  </span>
                </>
              )}
              {/* A text cue says what to recall by itself; only a picture needs its mode named.
                  The deck implies its language, so the code shows only for a card that differs. */}
              {tail.length > 0 && (
                <>
                  {deck && <span aria-hidden="true">·</span>}
                  <span className="max-w-full shrink-0 truncate">{tail.join(" · ")}</span>
                </>
              )}
            </span>
            {headSlot ? (
              <span className="flex shrink-0 items-center">
                <StateChip state={item.fsrsState} size="lg" inReview />
                {/* Opens as the control arrives, so the chip slides aside rather than waiting beside a gap. */}
                <span
                  className={clsx(
                    "relative z-20 flex justify-end overflow-hidden transition-[width] duration-200 ease-out motion-reduce:transition-none",
                    headEnd ? "w-[38px] -me-1.5" : "w-0",
                  )}
                >
                  {headEnd}
                </span>
              </span>
            ) : (
              <StateChip state={item.fsrsState} size="lg" inReview />
            )}
          </div>

          <div
            ref={columnRef}
            className={clsx(
              PRIVATE_TEXT,
              "relative flex flex-1 flex-col justify-center gap-5 py-2",
              // A fade that stays filled would trap the speaker's z-20 under the reveal layer.
              animateIn && "enter-fade [animation-fill-mode:backwards]!",
            )}
          >
            <motion.div
              ref={cueRef}
              // Always on, because Motion reads `layout` only at mount; the transition says whether it glides.
              layout="position"
              transition={{ layout: cueGlide ? REVEAL_GLIDE : INSTANT }}
              className="relative grid grid-cols-[minmax(0,1fr)] gap-3"
            >
              <div ref={cueTextRef} className="grid grid-cols-[minmax(0,1fr)] gap-3">
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
                      dir={mode.cue === "term" ? textDirection(card.language) : "auto"}
                      className={clsx(
                        "hyphenate whitespace-pre-line font-medium tracking-[-0.03em] text-text [overflow-wrap:anywhere]",
                        CUE_SIZE[step],
                      )}
                    >
                      {mode.cue === "term" ? <TermText card={card} hidden={!cueReading} /> : front}
                      {mode.cue === "term" && audio("z-20")}
                    </p>
                    {/* A drawn reading is hidden from a screen reader, which hears the reading here while
                        it shows on the cue; after the reveal the answer's line says it. */}
                    {mode.cue === "term" && readingOver && cueReading && !revealed && (
                      <p className="sr-only" lang={card.language ?? undefined}>
                        {card.pronunciation}
                      </p>
                    )}
                  </>
                )}
              </div>
              {/* Popped out of the flow as it leaves, so the cue glides back while the lines fade. */}
              <AnimatePresence mode="popLayout" initial={false} custom={aidGone?.animate ?? false}>
                {aid && aidsOnShow > 0 && (
                  <motion.div
                    key="aid"
                    className="min-h-8"
                    variants={AID_LEAVE}
                    custom={aidGone?.animate ?? false}
                    exit="gone"
                  >
                    <RecallAidShown steps={aid.steps} taken={aidsOnShow} animate={aidAnimate} />
                  </motion.div>
                )}
              </AnimatePresence>
              {aid && revealed && aidsOnShow === 0 && (
                <RecallAidShow
                  steps={aid.steps}
                  animate={animateReveal}
                  onShow={(e) =>
                    aid.onShow(
                      e.detail > 0 ? "pointer" : "keyboard",
                      e.currentTarget === document.activeElement,
                    )
                  }
                />
              )}
              {hookEditor}
              {aid && (
                // The aid's lines, out of the flow, so the fit keeps their room before they show.
                <div
                  aria-hidden="true"
                  inert
                  className="pointer-events-none invisible absolute inset-x-0 top-0 h-0 overflow-hidden"
                >
                  <div ref={aidLines}>
                    <RecallAidShown steps={aid.steps} taken={aid.steps.length} animate={false} />
                  </div>
                </div>
              )}
            </motion.div>

            {revealed ? (
              <motion.div
                ref={answerRef}
                // Glides, rather than jumps, when the aid over it arrives or leaves; on like the cue's.
                layout="position"
                // Under reduced motion the answer crossfades whole: no rise, blur or stagger.
                {...(reduce
                  ? {
                      initial: animateReveal ? { opacity: 0 } : false,
                      animate: { opacity: 1 },
                      transition: {
                        duration: 0.2,
                        ease: EASE_OUT,
                        layout: answerGlide ? REVEAL_GLIDE : INSTANT,
                      },
                    }
                  : {
                      variants: answerGroup,
                      initial: animateReveal ? "hidden" : false,
                      animate: "shown",
                      transition: { layout: answerGlide ? REVEAL_GLIDE : INSTANT },
                    })}
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
          {!revealed && aid && (
            // Out of the way of taps meant for the card: only the pill itself can be pressed.
            <div
              ref={pillRoom}
              className={clsx(
                "pointer-events-none relative z-20 [&_button]:pointer-events-auto",
                animateIn && "enter-fade",
              )}
            >
              <RecallAidNext
                steps={aid.steps}
                taken={aid.taken}
                onTake={(e) => {
                  tookAidAt.current = performance.now();
                  // The spent pill turns inert, so focus moves on to what comes next: the card.
                  const focused = e.currentTarget === document.activeElement;
                  // Enter or Space on the pill clicks with no pointer count: a key, which never animates.
                  aid.onTake(e.detail === 0 ? "keyboard" : "pointer");
                  if (focused) revealRef.current?.focus({ preventScroll: true });
                }}
              />
            </div>
          )}
          <AnimatePresence>
            {!revealed && hint && <TapHint lifted={!!aid} aided={!!aid && aid.taken > 0} />}
          </AnimatePresence>
        </div>
        {/* The offer's room, its 44 px over the 8 px inset, so the last line scrolls clear above it. */}
        {offer && revealed && <div aria-hidden="true" className="h-13 shrink-0" />}
      </div>
      {/* Floating over the scroller's foot, so a long card scrolls on under its frost, and inset so its corners follow the plate's. */}
      {offer && revealed && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-2 pb-2"
          // A sibling of the scroller, so a wheel over it is handed on to the card under it.
          onWheel={(e) => scrollerRef.current?.scrollBy({ top: e.deltaY, left: 0 })}
        >
          <HookOffer
            {...offer}
            onShown={() => {
              setOfferSeen(true);
              offer.onShown?.();
            }}
          />
        </div>
      )}
      {/* A still copy, out of the flow, so the fit knows the offer's room before the reveal. */}
      {offer && (
        <div
          ref={offerRoom}
          aria-hidden="true"
          inert
          className="pointer-events-none invisible absolute inset-x-0 bottom-0 px-2 pb-2"
        >
          <div className={HOOK_OFFER_BOX}>
            <HookOfferFace />
          </div>
        </div>
      )}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {spokenAid && (!revealed || shownAfter)
          ? t`Memory hook: ${spokenAid}`
          : revealed
            ? offer && offerSeen
              ? t`Answer: ${back}. You can add a memory hook.`
              : t`Answer: ${back}`
            : ""}
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
  const reduce = useReduceMotion();
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
      transition={REVEAL_GLIDE}
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
  /** What the learner used before the reveal; a grade it rules out keeps its slot but is out. */
  aid?: ReviewAid | undefined;
  /** Presses on this card of the key of a grade that is out, so its tip says why each time. */
  lockedNudge?: number | undefined;
  onGrade: (r: Rating) => void;
  className?: string | undefined;
}

/** The popover's own gap, and about the height of a two-line tip over it. */
const TIP_GAP = 8;
const TIP_ROOM = 96;

/**
 * How far over its tile the tip sits: clear of a toast in the tip's way, so it never covers Undo.
 * In a review toasts stand just over the grade strip, which is where the tip would go.
 */
function clearOfToasts(tile: HTMLElement | null) {
  const box = tile?.getBoundingClientRect();
  if (!box) return TIP_GAP;
  let top = box.top;
  for (const toast of document.querySelectorAll('[data-slot="toast"]:not([data-ending-style])')) {
    const r = toast.getBoundingClientRect();
    const inTheWay =
      r.height > 0 &&
      r.top < box.top &&
      r.bottom > box.top - TIP_GAP - TIP_ROOM &&
      r.left < box.right &&
      r.right > box.left;
    if (inTheWay) top = Math.min(top, r.top);
  }
  return box.top - top + TIP_GAP;
}

/**
 * A grade the learner cannot give now, greyed in its slot with a lock where its key would be. It
 * never grades: hover names why in a tooltip, and a tap, click or its key shows the same reason in
 * a tip over it, never both at once.
 */
function LockedGrade({
  label,
  icon: Icon,
  nudge,
}: {
  label: string;
  icon: LucideIcon;
  /** Presses of its key on this card, where there is no tap to show the tip. */
  nudge: number;
}) {
  const { t } = useLingui();
  const button = useRef<HTMLButtonElement>(null);
  const reasonId = useId();
  const [pressed, setPressed] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const why = t`You can’t choose Easy after peeking at your hook.`;
  const shown = pressed + nudge;
  return (
    <>
      <Tooltip open={hovered && !tipOpen} onOpenChange={setHovered}>
        <TooltipTrigger
          render={
            <button
              ref={button}
              type="button"
              aria-label={t`${label}, locked`}
              aria-disabled="true"
              aria-describedby={reasonId}
              onClick={(e) => {
                setPressed((n) => n + 1);
                // A pointer leaves focus here, where the grade keys would not reach the review; a key keeps it.
                if (e.detail > 0)
                  e.currentTarget.closest("fieldset")?.focus({ preventScroll: true });
              }}
              className="edge relative grid h-[72px] min-w-0 cursor-default content-center gap-1 rounded-lg px-1 text-sm font-medium text-muted @2xl:text-base"
            />
          }
        >
          <span className="mx-auto grid size-5 place-items-center">
            <Icon className="size-[18px]" aria-hidden="true" strokeWidth={1.75} />
          </span>
          <span>{label}</span>
          <Lock
            className="absolute end-2.5 top-2.5 size-3 text-muted"
            aria-hidden="true"
            strokeWidth={2}
          />
        </TooltipTrigger>
        <TooltipContent side="top">{why}</TooltipContent>
      </Tooltip>
      <span id={reasonId} className="sr-only">
        {why}
      </span>
      <ErrorTip
        anchor={button}
        message={shown > 0 ? why : null}
        nudge={shown}
        reason={Lock}
        sideOffset={() => clearOfToasts(button.current)}
        onOpenChange={setTipOpen}
      />
    </>
  );
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
  aid,
  lockedNudge = 0,
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
                if (!gradeAllowed(g.rating, aid)) {
                  return (
                    <motion.div key={g.rating} variants={gradeRise} className="grid min-w-0">
                      <LockedGrade label={label} icon={GradeIcon} nudge={lockedNudge} />
                    </motion.div>
                  );
                }
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
                        "hoverable:hover:edge-2 hoverable:hover:veil hoverable:hover:text-text active:scale-[0.96] motion-reduce:active:scale-100",
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
  const reduce = !!useReduceMotion();
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [landed, setLanded] = useState(reduce);
  const [ticked, setTicked] = useState(reduce);
  const [skipped, setSkipped] = useState(false);
  const lanternPlace = useRef<HTMLDivElement>(null);
  const room = useRef<HTMLDivElement>(null);
  const instant = reduce || skipped;
  // The day just turned: a spark carries it from the flame to today's light and on to the run.
  const turned = screen.streak && !reduce;

  const counted = screen.heading !== "nothing_due";
  const week = landed ? streak : streakBefore;
  const runWeek = ticked ? streak : streakBefore;
  const days = week ? lastDays(week) : undefined;
  const flame = runWeek ? streakFlameFor(runWeek) : "lit";
  const lit = !lanternFor(streak).out;
  const embers = useMemo(
    () => (lit && !reduce ? endEmbers(screen.embers) : []),
    [lit, reduce, screen.embers],
  );
  // Only the day turning ticks the run; any other end shows the run as it stands.
  const run = screen.streak ? runWeek?.current : (streak ?? week)?.current;
  const goal = (streak ?? week)?.today.goal;
  const proceed = screen.offers.find((o) => o.kind === "continue");
  const note = proceed?.note;
  // Only Review forgotten sits above Done, so Done and Continue keep their places on every end.
  const ways = screen.offers.flatMap((offer) =>
    offer.kind === "forgotten"
      ? [
          {
            key: offer.kind,
            label: t`${plural(offer.count, { one: "Review # forgotten card", other: "Review # forgotten cards" })}`,
            onClick: () => onOffer?.(offer),
          },
        ]
      : [],
  );
  const actionsAt = AT.actions + ways.length * AT.actionStep;
  const end = Math.max(actionsAt + RISE_MS, embers.length ? AT.embers + embersEnd(embers) : 0);

  useEffect(() => {
    if (focusOnMount) heading.current?.focus({ preventScroll: true });
  }, [focusOnMount]);
  useEffect(() => {
    if (instant) {
      setLanded(true);
      setTicked(true);
      return;
    }
    const timers = [
      window.setTimeout(() => setLanded(true), AT.land),
      window.setTimeout(() => setTicked(true), AT.tick),
    ];
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
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
      className={clsx("isolate flex flex-1 flex-col", skipped && "seq-skip")}
    >
      {/* No scroll box of its own: the page scrolls, so the lantern’s light is never cut off at a box edge. */}
      <div
        ref={room}
        className="relative m-auto flex w-full max-w-sm flex-col items-center py-4 text-center @3xl:py-8"
      >
        {turned && !skipped && <TurnSpark lantern={lanternPlace} room={room} />}
        {lit && (
          <RoomLight anchor={lanternPlace} poolAt={AT.pool} dim={!embers.length} skip={skipped} />
        )}
        <div ref={lanternPlace} className="mb-1 size-32 @3xl:size-44">
          <motion.div
            {...(reduce ? {} : { layoutId: LANTERN_LAYOUT })}
            transition={LANTERN_FLIGHT}
            className={clsx("relative isolate size-full", reduce && "enter-fade")}
          >
            <LanternLight
              lit={lit}
              dim={!embers.length}
              poolAt={AT.pool}
              embers={embers}
              embersAt={AT.embers}
            >
              <Lantern
                className="size-full"
                {...lanternFor(streak)}
                from={lanternFrom}
                flicker
                glow
              />
            </LanternLight>
          </motion.div>
        </div>

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
              <Trans>Nothing left in {{ scopeName: isolate(scopeName) }}</Trans>
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
              {/* While the goal is open the count says it, so Continue's count explains itself. */}
              {!screen.satisfied && goal ? (
                <Plural value={goal} one="of # review today" other="of # reviews today" />
              ) : (
                <Plural value={attempts} one="review today" other="reviews today" />
              )}
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
              rest={days.rest}
              goals={days.goals}
              dates={days.dates}
              size="lg"
              sequence={AT.lights}
              flare={landed && turned}
            />
            <p className="seq flex items-center gap-2 text-md text-text-2" style={at(AT.run)}>
              <span data-run-flame className={clsx("flex", ticked && turned && "flame-catch")}>
                <Flame className="h-5 w-4" state={flame} flicker={flame === "full"} />
              </span>
              {run ? (
                <>
                  <span className="inline-flex overflow-hidden font-semibold tabular-nums text-text">
                    <span key={run} className={clsx("block", ticked && turned && "run-catch")}>
                      {run}
                    </span>
                  </span>
                  <Plural value={run} one="day in a row" other="days in a row" />
                </>
              ) : (
                <span className="font-medium text-text">
                  <StreakStart summary={streak ?? week} />
                </span>
              )}
            </p>
          </div>
        )}

        {/* Unpressable while still invisible: the tap that finishes the sequence must not also press a hidden button. */}
        <div
          className={clsx("mt-6 grid w-full gap-2.5 @3xl:mt-8", !instant && "pointer-events-none")}
        >
          {/* One shape for every way on, the count said in words so it never reads as a shortcut; Done is always last and primary. */}
          {ways.map((way, i) => (
            <Button
              key={way.key}
              size="lg"
              onClick={way.onClick}
              className="seq w-full"
              style={at(AT.actions + i * AT.actionStep)}
            >
              <StateIcon state="forgot" className="size-4" />
              {way.label}
            </Button>
          ))}
          <div className="seq grid gap-2" style={at(actionsAt)}>
            {!counted ? (
              <>
                {addCards}
                {done("primary")}
              </>
            ) : (
              <>
                {proceed && (
                  <Button size="lg" onClick={() => onOffer?.(proceed)} className="w-full">
                    <Trans>Continue</Trans>
                    {note && (
                      <span className="font-normal tabular-nums text-muted">
                        {note.kind === "goal" ? (
                          <Plural value={note.count} one="# to goal" other="# to goal" />
                        ) : note.kind === "cards" ? (
                          <Plural value={note.count} one="# card left" other="# cards left" />
                        ) : (
                          <Trans>other decks</Trans>
                        )}
                      </span>
                    )}
                  </Button>
                )}
                {done("primary")}
              </>
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
