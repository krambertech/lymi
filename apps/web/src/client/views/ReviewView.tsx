import type { Rating } from "@lymi/core";
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
  deckName?: string | undefined;
  flare?: boolean | undefined;
  onClose?: (() => void) | undefined;
}

/** Progress strip, then the small lantern and deck name. The lantern flares when a card lands well. */
export function ReviewHeader({ done, total, deckName, flare, onClose }: ReviewHeaderProps) {
  const remaining = Math.max(total - done, 0);
  return (
    <header className="grid shrink-0 gap-3 pt-2 @3xl:pt-4">
      <div className="flex min-h-10 items-center gap-3 text-sm text-muted">
        <Progress value={total ? done / total : 0} label="Session progress" className="flex-1" />
        <span className="min-w-[5.5rem] text-right tabular-nums">
          {remaining} {remaining === 1 ? "card" : "cards"} left
        </span>
        <IconButton label="Leave review" size="sm" onClick={onClose}>
          <X />
        </IconButton>
      </div>
      <div className="flex items-center justify-center gap-2.5 text-sm font-medium text-text-2">
        <Lantern className="size-7" flicker glow flare={flare} />
        {deckName ?? "All decks"}
      </div>
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
    // The whole plate is a pointer target for convenience; the accessible control is the button at the foot.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Space is handled by the route; the button below is the keyboard path
    <section
      aria-label={`${recog ? "Recognition" : "Production"} card for ${front}`}
      className={clsx(
        "edge relative flex min-h-0 flex-1 flex-col overflow-y-auto rounded-xl bg-plate p-5 @3xl:p-6",
        !revealed && "cursor-pointer hoverable:hover:edge-2",
        className,
      )}
      onClick={(event) => {
        if (
          !revealed &&
          !(event.target as HTMLElement).closest("button, a, input, select, textarea")
        ) {
          onReveal();
        }
      }}
    >
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {recog ? "Recognise" : "Produce"}
          {card.language && <span> · {card.language.toUpperCase()}</span>}
        </span>
        <StateChip state={item.fsrsState} size="sm" />
      </div>

      <div className="mt-10 grid gap-3 @3xl:mt-12">
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
            "mt-7 grid gap-3 border-t border-edge pt-5",
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

      {!revealed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReveal();
          }}
          className="mt-auto flex min-h-11 items-center justify-center gap-2 self-center rounded-sm px-3 py-2 text-sm text-muted transition-[color,scale] duration-150 hoverable:hover:text-text active:scale-[0.96]"
        >
          Tap card to reveal
          <span className="hidden @2xl:contents">
            <Kbd>Space</Kbd>
          </span>
        </button>
      )}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {revealed ? `Answer: ${back}` : ""}
      </p>
    </section>
  );
}

export interface GradeBarProps {
  id?: string | undefined;
  enabled: boolean;
  pending?: boolean | undefined;
  pendingRating?: Rating | null | undefined;
  error?: string | null | undefined;
  onGrade: (r: Rating) => void;
  className?: string | undefined;
}

/** Four equally weighted recall grades. Icons add a quick cue without replacing the labels. */
export function GradeBar({
  id,
  enabled,
  pending,
  pendingRating,
  error,
  onGrade,
  className,
}: GradeBarProps) {
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
          return (
            <button
              key={g.rating}
              type="button"
              disabled={!enabled || pending}
              aria-busy={saving || undefined}
              onClick={() => onGrade(g.rating)}
              className={clsx(
                "edge relative grid h-[72px] min-w-0 content-center gap-1.5 rounded-lg bg-plate px-1 text-sm font-medium text-text-2",
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
  history?: number[] | undefined;
  action?: ReactNode | undefined;
}

/** The end. The lantern brightens and the seven lights show the week. Cards counted, never points. */
export function SessionDone({ done, moreDue = 0, history, action }: SessionDoneProps) {
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
        {paused ? "A good pause" : lit ? "That’s the lot" : "Nothing due"}
      </h2>
      <p className="complete-copy max-w-[28ch] text-md text-muted">
        {paused
          ? `${done} reviewed. ${moreDue} more ${moreDue === 1 ? "is" : "are"} ready when you are.`
          : lit
            ? `${done} reviewed. The rest can wait a while.`
            : "Come back later, or add something new."}
      </p>
      {history && <SevenLights days={history} className="complete-copy mt-6" />}
      <div className="complete-copy mt-6 flex gap-2">{action}</div>
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
