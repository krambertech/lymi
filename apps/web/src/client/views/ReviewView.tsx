import { formatInterval, type Rating } from "@lymi/core";
import { clsx } from "clsx";
import { Volume2, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "../components/Button";
import { Chip, SourceChip, StateChip } from "../components/Chip";
import { Kbd } from "../components/Kbd";
import { Lantern } from "../components/Lantern";
import { Progress } from "../components/Progress";
import { SevenLights } from "../components/SevenLights";
import { Skeleton } from "../components/Skeleton";
import type { QueueItem } from "../lib/api";

export const GRADES: { rating: Rating; label: string; key: string }[] = [
  { rating: 1, label: "Again", key: "1" },
  { rating: 2, label: "Hard", key: "2" },
  { rating: 3, label: "Good", key: "3" },
  { rating: 4, label: "Easy", key: "4" },
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
  return (
    <div className="grid gap-4 pt-2 @3xl:pt-4">
      <div className="flex items-center gap-3 text-sm text-muted">
        <Progress value={total ? done / total : 0} label="Session progress" className="flex-1" />
        <span className="tabular-nums">
          {Math.min(done + 1, Math.max(total, 1))} / {total}
        </span>
        <IconButton label="Leave review" size="sm" onClick={onClose}>
          <X />
        </IconButton>
      </div>
      <div className="flex items-center justify-center gap-2.5 text-md font-medium text-text-2">
        <Lantern className="size-7" flicker glow flare={flare} />
        {deckName ?? "All decks"}
      </div>
    </div>
  );
}

export interface ReviewCardProps {
  item: QueueItem;
  revealed: boolean;
  onReveal: () => void;
  onPlayAudio?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * The card. A flat plate with one hairline edge. Before reveal it is the word alone, large.
 * After reveal the meaning and example unfold under a rule, each labelled with its source.
 */
export function ReviewCard({ item, revealed, onReveal, onPlayAudio, className }: ReviewCardProps) {
  const { card, direction } = item;
  const recog = direction === "recognition";
  const front = recog ? card.term : (card.meaning ?? card.term);
  const back = recog ? (card.meaning ?? "No meaning yet") : card.term;
  return (
    // The whole plate is a pointer target for convenience; the accessible control is the button at the foot.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Space and Enter are handled by the route, the button below is the keyboard path
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    <div
      className={clsx(
        "edge relative flex flex-1 flex-col rounded-xl bg-plate p-5 @3xl:p-6",
        !revealed && "cursor-pointer",
        className,
      )}
      onClick={() => {
        if (!revealed) onReveal();
      }}
    >
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          {recog ? "Recognise" : "Produce"}
          {card.language && <span> · {card.language.toUpperCase()}</span>}
        </span>
        <StateChip state={item.fsrsState} size="sm" />
      </div>

      <div className="mt-9 grid gap-3 @3xl:mt-11">
        <p
          lang={recog ? (card.language ?? undefined) : undefined}
          className="text-4xl font-medium tracking-[-0.03em] text-text @3xl:text-5xl"
        >
          {front}
        </p>
        {recog && card.pronunciation && (
          <p className="flex items-center gap-2.5 text-md text-muted">
            <span>{card.pronunciation}</span>
            {onPlayAudio && (
              <IconButton
                label="Play pronunciation"
                size="sm"
                variant="secondary"
                round
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayAudio();
                }}
              >
                <Volume2 />
              </IconButton>
            )}
          </p>
        )}
      </div>

      <div
        className={clsx(
          "mt-7 grid gap-3 border-t border-edge pt-5 transition-[opacity,translate] duration-200 ease-out motion-reduce:translate-y-0",
          revealed ? "opacity-100" : "translate-y-1 opacity-0",
        )}
        aria-hidden={!revealed}
      >
        <p className={clsx("leading-[1.35] text-text", recog ? "text-xl" : "text-3xl font-medium")}>
          {back}
        </p>
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

      {!revealed && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReveal();
          }}
          className="mt-auto flex min-h-10 items-center justify-center gap-2 self-center rounded-sm px-3 py-2 text-sm text-muted transition-[color,scale] duration-150 hoverable:hover:text-text active:scale-[0.97]"
        >
          Show meaning
          <span className="hidden @2xl:contents">
            <Kbd>Space</Kbd>
          </span>
        </button>
      )}
    </div>
  );
}

export interface GradeBarProps {
  item: QueueItem | undefined;
  enabled: boolean;
  pending?: boolean | undefined;
  onGrade: (r: Rating) => void;
  className?: string | undefined;
}

/** Four grades, Good in amber. Each shows when the card comes back. 60 px tall for thumbs. */
export function GradeBar({ item, enabled, pending, onGrade, className }: GradeBarProps) {
  const now = new Date();
  return (
    <fieldset className={clsx("grid grid-cols-4 gap-2", className)}>
      <legend className="sr-only">Grade</legend>
      {GRADES.map((g) => {
        const good = g.rating === 3;
        return (
          <button
            key={g.rating}
            type="button"
            disabled={!enabled || pending}
            onClick={() => onGrade(g.rating)}
            className={clsx(
              "relative grid h-[60px] content-center gap-px rounded-lg text-base font-medium tabular-nums transition-[scale,background-color,opacity] duration-150 ease-out",
              "active:scale-[0.97] disabled:opacity-45",
              good
                ? "bg-amber text-amber-ink enabled:hoverable:hover:bg-amber-hover"
                : "edge bg-plate text-text-2 enabled:hoverable:hover:bg-hover",
            )}
          >
            {g.label}
            <span className="hidden @3xl:contents">
              <Kbd
                tone={good ? "on-primary" : "default"}
                className="absolute right-1.5 top-1.5 h-4 min-w-4 rounded-full px-1.5 text-2xs"
              >
                {g.key}
              </Kbd>
            </span>
            <small
              className={clsx(
                "text-2xs font-normal tabular-nums",
                good ? "text-amber-ink" : "text-muted",
              )}
            >
              {item ? formatInterval(now, new Date(item.next[g.rating])) : "—"}
            </small>
          </button>
        );
      })}
    </fieldset>
  );
}

export interface SessionDoneProps {
  done: number;
  history?: number[] | undefined;
  action?: ReactNode | undefined;
}

/** The end. The lantern brightens and the seven lights show the week. Cards counted, never points. */
export function SessionDone({ done, history, action }: SessionDoneProps) {
  const lit = done > 0;
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
      <Lantern
        className="mb-4 size-32 @3xl:size-36"
        flicker
        glow
        litUp={lit}
        variant={lit ? "lit" : "unlit"}
      />
      <h2 className="text-3xl font-medium">{lit ? "That’s the lot" : "Nothing due"}</h2>
      <p className="max-w-[28ch] text-md text-muted">
        {lit
          ? `${done} reviewed. The rest can wait a while.`
          : "Come back later, or add something new."}
      </p>
      {history && <SevenLights days={history} className="mt-6" />}
      <div className="mt-6 flex gap-2">{action}</div>
    </section>
  );
}

export function ReviewSkeleton() {
  return (
    <div className="mt-4 flex flex-1 flex-col gap-3.5">
      <Skeleton className="flex-1 rounded-xl" />
      <div className="grid grid-cols-4 gap-2">
        <Skeleton className="h-[60px] rounded-lg" />
        <Skeleton className="h-[60px] rounded-lg" />
        <Skeleton className="h-[60px] rounded-lg" />
        <Skeleton className="h-[60px] rounded-lg" />
      </div>
    </div>
  );
}
