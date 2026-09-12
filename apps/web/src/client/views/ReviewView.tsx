import { formatInterval, type Rating } from "@lymi/core";
import { clsx } from "clsx";
import {
  Brain,
  Check,
  CircleAlert,
  Loader2,
  type LucideIcon,
  RotateCcw,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button, IconButton } from "../components/Button";
import { Chip, SourceChip, StateChip } from "../components/Chip";
import { Kbd } from "../components/Kbd";
import { Lantern } from "../components/Lantern";
import { Progress } from "../components/Progress";
import { SevenLights } from "../components/SevenLights";
import { Skeleton } from "../components/Skeleton";
import type { QueueItem } from "../lib/api";

export const GRADES: {
  rating: Rating;
  label: string;
  key: string;
  icon: LucideIcon;
  iconClass: string;
}[] = [
  { rating: 1, label: "Forgot", key: "1", icon: RotateCcw, iconClass: "text-grade-forgot" },
  { rating: 2, label: "Hard", key: "2", icon: Brain, iconClass: "text-grade-hard" },
  { rating: 3, label: "Good", key: "3", icon: Check, iconClass: "text-grade-good" },
  { rating: 4, label: "Easy", key: "4", icon: Zap, iconClass: "text-grade-easy" },
];

export interface ReviewHeaderProps {
  done: number;
  total: number;
  flare?: boolean | undefined;
  onClose?: (() => void) | undefined;
}

/**
 * The count and the exit on one line, the session track under them.
 *
 * The deck name is deliberately absent. It is chosen two taps earlier, it cannot change for the
 * length of the session, and a long one squeezes the track down to nothing — so it moves to the
 * end screen, where it is a fact about what was reviewed rather than a caption on every card.
 * The lantern stays: the flare on a good answer is the one warm thing on this screen.
 *
 * The row starts on the card's text edge and the track spans the card's outer edge, so the row
 * lines up with the word and the track lines up with the plate.
 */
export function ReviewHeader({ done, total, flare, onClose }: ReviewHeaderProps) {
  return (
    <header className="grid shrink-0 gap-2.5 pt-2 @3xl:pt-4">
      <div className="flex min-h-10 items-center gap-2.5 pl-5 text-sm text-text-2 @3xl:pl-6">
        <Lantern className="size-5" flicker glow flare={flare} />
        <span className="tabular-nums">
          {done} of {total}
        </span>
        <span className="flex-1" />
        <IconButton label="Leave review" size="sm" onClick={onClose} className="-mr-2">
          <X />
        </IconButton>
      </div>
      <Progress value={total ? done / total : 0} label="Session progress" />
    </header>
  );
}

export interface ReviewCardProps {
  item: QueueItem;
  revealed: boolean;
  animateReveal?: boolean | undefined;
  onReveal: () => void;
  onPlayAudio?: (() => void) | undefined;
  audioState?: "idle" | "loading" | "playing" | undefined;
  className?: string | undefined;
}

/**
 * The card. A flat plate with one hairline edge. Before reveal it is the word alone, large.
 * After reveal the meaning and example unfold under a rule, each labelled with its source.
 */
export function ReviewCard({
  item,
  revealed,
  animateReveal = true,
  onReveal,
  onPlayAudio,
  audioState = "idle",
  className,
}: ReviewCardProps) {
  const { card, direction } = item;
  const recog = direction === "recognition";
  const front = recog ? card.term : (card.meaning ?? card.term);
  const back = recog ? (card.meaning ?? "No meaning yet") : card.term;
  return (
    // The whole plate reveals the answer, so the control is a button covering the plate rather than
    // a caption at its foot: pressing the card is what a card affords, and the most-pressed control
    // on the screen should not look like a footnote. It sits above the text and below the
    // pronunciation button, which is the one thing inside the card you can press for another reason.
    <section
      aria-label={`${recog ? "Recognition" : "Production"} card for ${front}`}
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
          aria-label="Tap card to reveal"
          className="absolute inset-0 z-10 rounded-xl"
        />
      )}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {recog ? "Recognise" : "Produce"}
          {card.language && <span> · {card.language.toUpperCase()}</span>}
        </span>
        <StateChip state={item.fsrsState} size="sm" />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 py-2">
        <div className="grid gap-3">
          <p
            lang={recog ? (card.language ?? undefined) : undefined}
            className="hyphens-auto text-4xl font-medium tracking-[-0.03em] text-text [overflow-wrap:anywhere] @3xl:text-5xl"
          >
            {front}
          </p>
          {recog && (card.pronunciation || onPlayAudio) && (
            <p className="flex items-center gap-2.5 text-md text-muted">
              {card.pronunciation && <span>{card.pronunciation}</span>}
              {onPlayAudio && (
                <IconButton
                  label={audioState === "playing" ? "Replay pronunciation" : "Play pronunciation"}
                  size="sm"
                  variant="secondary"
                  round
                  className="z-20"
                  disabled={audioState === "loading"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAudio();
                  }}
                >
                  {audioState === "loading" ? (
                    <Loader2 className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Volume2 aria-hidden="true" />
                  )}
                </IconButton>
              )}
            </p>
          )}
        </div>

        {revealed && (
          <div
            className={clsx(
              "grid gap-3 border-t border-edge pt-5",
              animateReveal && "answer-enter",
            )}
          >
            <p
              className={clsx(
                "hyphens-auto leading-[1.35] text-text [overflow-wrap:anywhere]",
                recog ? "text-xl" : "text-3xl font-medium",
              )}
              lang={recog ? undefined : (card.language ?? undefined)}
            >
              {back}
            </p>
            {!recog && (card.pronunciation || onPlayAudio) && (
              <p className="flex items-center gap-2.5 text-md text-muted">
                {card.pronunciation && <span>{card.pronunciation}</span>}
                {onPlayAudio && (
                  <IconButton
                    label={audioState === "playing" ? "Replay pronunciation" : "Play pronunciation"}
                    size="sm"
                    variant="secondary"
                    round
                    disabled={audioState === "loading"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayAudio();
                    }}
                  >
                    {audioState === "loading" ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Volume2 aria-hidden="true" />
                    )}
                  </IconButton>
                )}
              </p>
            )}
            {card.example && (
              <p className="text-md leading-relaxed text-text-2" lang={card.language ?? undefined}>
                {card.example}
              </p>
            )}
            {card.notes && <p className="text-sm text-muted">{card.notes}</p>}
            <div className="mt-1 flex flex-wrap gap-1.5">
              {card.meaningSource && <SourceChip source={card.meaningSource} field="meaning" />}
              {card.exampleSource && card.example && (
                <SourceChip source={card.exampleSource} field="example" />
              )}
              {card.source && <Chip size="sm">{card.source}</Chip>}
            </div>
          </div>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {revealed ? `Answer: ${back}` : ""}
      </p>
    </section>
  );
}

export interface GradeBarProps {
  id?: string | undefined;
  /** Before the answer is showing the strip holds the hint instead of the grades. */
  revealed: boolean;
  /** The four dates FSRS would set, keyed by rating. Shown on hover, on pointer machines only. */
  next?: Record<Rating, string> | undefined;
  pending?: boolean | undefined;
  pendingRating?: Rating | null | undefined;
  error?: string | null | undefined;
  onGrade: (r: Rating) => void;
  className?: string | undefined;
}

/**
 * Four equally weighted recall grades, in a strip that is the same height whether or not the
 * answer is showing: the grades replace the hint in place, so nothing moves under the eye at the
 * moment the answer lands.
 *
 * What each grade schedules is printed only where a pointer can ask for it. On a phone there is no
 * hover and four dates under four labels is clutter, so the labels stand alone — but the date is
 * in every button's accessible name at every size, because hiding it behind hover would leave a
 * screen reader with three unexplained synonyms for "correct".
 */
export function GradeBar({
  id,
  revealed,
  next,
  pending,
  pendingRating,
  error,
  onGrade,
  className,
}: GradeBarProps) {
  const now = new Date();
  if (!revealed) {
    return (
      <div className={clsx("grid h-[72px] shrink-0 place-items-center", className)}>
        {/* Touch wording on a phone, the shortcut where there is a keyboard to press it with. */}
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          <span className="@2xl:hidden">Tap the card when you have it</span>
          <span className="hidden @2xl:inline">Reveal the card when you have it</span>
          <span className="hidden @2xl:inline-flex">
            <Kbd>Space</Kbd>
          </span>
        </p>
      </div>
    );
  }
  return (
    <fieldset id={id} className={clsx("scroll-mt-24 shrink-0", className)}>
      <legend className="sr-only">Choose a recall grade</legend>
      {error && (
        <p className="mb-2 text-center text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-4 gap-2">
        {GRADES.map((g) => {
          const saving = pending && pendingRating === g.rating;
          const GradeIcon = g.icon;
          const schedules = next ? formatInterval(now, new Date(next[g.rating])) : undefined;
          return (
            <button
              key={g.rating}
              type="button"
              disabled={pending}
              aria-busy={saving || undefined}
              // The visible date is a hover affordance; the name is how everyone else gets it.
              aria-label={schedules ? `${g.label}, next in ${schedules}` : undefined}
              onClick={() => onGrade(g.rating)}
              className={clsx(
                "edge group relative grid h-[72px] min-w-0 content-center gap-1 rounded-lg bg-plate px-1 text-sm font-medium text-text-2",
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
                {g.label}
              </span>
              {schedules && (
                <span
                  aria-hidden="true"
                  className={clsx(
                    "hidden h-4 text-xs tabular-nums leading-4 text-muted opacity-0 transition-opacity duration-150",
                    "hoverable:block group-hover:opacity-100 group-focus-visible:opacity-100",
                    saving && "!opacity-0",
                  )}
                >
                  {schedules}
                </span>
              )}
              <span className="hidden @3xl:contents">
                <Kbd
                  tone="default"
                  className="absolute right-1.5 top-1.5 h-4 min-w-4 rounded-full px-1.5 text-2xs"
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
          );
        })}
      </div>
    </fieldset>
  );
}

export interface SessionDoneProps {
  done: number;
  moreDue?: number | undefined;
  /** Named here rather than over every card, because here it is a fact about what was reviewed. */
  deckName?: string | undefined;
  history?: number[] | undefined;
  action?: ReactNode | undefined;
}

/**
 * The end. The lantern brightens and the seven lights show the week. Cards counted, never points.
 *
 * A session is one batch of at most fifty, so more can be due when this screen appears. That is a
 * pause with a way on, not a failure to finish: the batch really did end, and the next one is a
 * decision rather than an endless list.
 */
export function SessionDone({ done, moreDue = 0, deckName, history, action }: SessionDoneProps) {
  const lit = done > 0;
  const paused = lit && moreDue > 0;
  const from = deckName ? ` from ${deckName}` : "";
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
        {paused ? "A good pause" : lit ? "That’s the lot" : "Nothing due"}
      </h2>
      <p className="complete-copy max-w-[30ch] text-md text-muted">
        {paused
          ? `${done} reviewed${from}. ${moreDue} more ${moreDue === 1 ? "is" : "are"} ready when you are.`
          : lit
            ? `${done} reviewed${from}. The rest can wait a while.`
            : "Come back later, or add something new."}
      </p>
      {history && <SevenLights days={history} className="complete-copy mt-6" />}
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
      <h2 className="text-2xl font-medium">Review couldn’t load</h2>
      <p className="mt-2 max-w-[30ch] text-md text-muted">Check your connection, then try again.</p>
      <div className="mt-6 flex items-center gap-2">
        <Button variant="primary" onClick={retry}>
          Try again
        </Button>
        {action}
      </div>
    </section>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3.5 pb-3">
      <Skeleton className="flex-1 rounded-xl" />
      <Skeleton className="mx-auto h-4 w-32 rounded-sm" />
    </div>
  );
}
