/** Shared parts for the lesson-types prototype. Not for shipping. */
import { clsx } from "clsx";
import { Check, Pause, Play, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { playInTurn, playSound, stopSound, usePlaying } from "../../../lib/learn/player";
import { type Line, src } from "./data";

export type Mark = "right" | "wrong" | "out" | undefined;

/** The quiz card: white, its title on the stage's band. */
export function Card({
  title,
  aside,
  children,
}: {
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="learn-quiz grid grid-cols-1 overflow-hidden rounded-xl bg-plate max-sm:-mx-1">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-(--tray) px-5 py-3.5 max-sm:px-4">
        <h3 className="text-lg font-medium">{title}</h3>
        {aside}
      </div>
      <div className="grid grid-cols-1 justify-items-start gap-4 px-5 pt-5 pb-5 max-sm:px-4">
        {children}
      </div>
    </div>
  );
}

export function Dots({ results, now, total }: { results: readonly (boolean | undefined)[]; now: number; total: number }) {
  return (
    <span aria-hidden="true" className="flex items-center gap-1.5 rounded-full bg-plate px-2.5 py-1.5">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        return (
          <i
            // biome-ignore lint/suspicious/noArrayIndexKey: one dot per round
            key={i}
            className={clsx(
              "size-2 rounded-full transition-colors duration-200",
              result === true ? "bg-success" : result === false ? "bg-danger" : "bg-edge-strong",
              result === undefined && i === now && "bg-ink-faint outline-2 outline-offset-2 outline-ink-muted",
            )}
          />
        );
      })}
    </span>
  );
}

export function Badge({ mark, big }: { mark: "right" | "wrong"; big?: boolean }) {
  return (
    <span
      role="img"
      aria-label={mark === "right" ? "Right answer" : "Your answer"}
      className={clsx(
        "absolute grid size-5 place-items-center rounded-full text-plate",
        mark === "right" ? "bg-success" : "bg-danger",
        big ? "-end-2 -top-2 ring-3 ring-plate" : "end-2.5 top-1/2 -translate-y-1/2",
      )}
    >
      {mark === "right" ? (
        <Check aria-hidden="true" className="size-3" strokeWidth={3.2} />
      ) : (
        <X aria-hidden="true" className="size-3" strokeWidth={3.2} />
      )}
    </span>
  );
}

/** An answer in the reader's language, or a sentence in Estonian. */
export function Option({
  label,
  mark,
  lang,
  onPick,
  className,
  chosen,
}: {
  label: ReactNode;
  mark: Mark;
  lang?: string;
  onPick: () => void;
  className?: string;
  chosen?: boolean;
}) {
  return (
    <button
      type="button"
      lang={lang}
      onClick={onPick}
      aria-disabled={mark !== undefined || undefined}
      data-mark={mark === "right" || mark === "wrong" ? mark : undefined}
      className={clsx(
        "learn-answer relative flex min-h-12 w-full cursor-pointer items-center rounded-tile border border-edge-strong bg-plate py-2.5 ps-4 pe-10 text-start text-lg font-medium transition-[background-color,border-color,opacity,scale] duration-150",
        mark === undefined && !chosen && "active:scale-[0.99] hoverable:hover:bg-plate-hover",
        mark === undefined && chosen && "border-(--form) bg-(--form-soft)! ring-1 ring-(--form)",
        mark !== undefined && "cursor-default",
        mark === "out" && "opacity-50",
        className,
      )}
    >
      {label}
      {(mark === "right" || mark === "wrong") && <Badge mark={mark} />}
    </button>
  );
}

export function markFor(id: string, answer: string, picked: string | null | undefined): Mark {
  if (picked === null || picked === undefined) return undefined;
  if (id === answer) return "right";
  if (id === picked) return "wrong";
  return "out";
}

export function Verdict({ right, children }: { right: boolean; children?: ReactNode }) {
  const Icon = right ? Check : X;
  return (
    <p className={clsx("flex items-start gap-2 font-medium", right ? "text-success" : "text-danger")}>
      <Icon aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={2.5} />
      <span>
        {right ? "Right." : "Not this one."}{" "}
        {children && <span className="font-normal text-ink-secondary">{children}</span>}
      </span>
    </p>
  );
}

export function Nudge({ shown }: { shown: boolean }) {
  return shown ? (
    <p role="status" className="text-sm text-ink-muted">
      Listen first.
    </p>
  ) : null;
}

export const key = (prefix: string, id: string) => `${prefix}:${id}`;

/** One sentence's segment in the passage bar; a tap plays that sentence. */
function Segment({
  line,
  prefix,
  index,
  heard,
  onPlayed,
}: {
  line: Line;
  prefix: string;
  index: number;
  heard: boolean;
  onPlayed: (index: number) => void;
}) {
  const playing = usePlaying(key(prefix, line.id));
  useEffect(() => {
    if (playing) onPlayed(index);
  }, [playing, index, onPlayed]);
  return (
    <button
      type="button"
      aria-label={`Sentence ${index + 1}`}
      onClick={() => void playSound(src(line.id), key(prefix, line.id))}
      style={{ flexGrow: line.et.length }}
      className="group grid h-8 min-w-3 cursor-pointer items-center"
    >
      <span
        className={clsx(
          "block h-1.5 rounded-full transition-colors duration-200 group-hover:h-2",
          playing ? "bg-(--form)" : heard ? "bg-(--form-faint)" : "bg-edge-strong",
        )}
      />
    </button>
  );
}

/** Which of the lines is playing now, or -1. */
export function usePlayingLine(lines: readonly Line[], prefix: string): number {
  // A fixed list, so the hooks run in the same order every render.
  const flags = lines.map((line) => usePlaying(key(prefix, line.id)));
  return flags.indexOf(true);
}

/**
 * The passage as one control: play or pause it whole, and a bar with one segment per sentence,
 * each a tap to hear again.
 */
export function PassagePlayer({
  lines,
  prefix,
  onHeard,
}: {
  lines: readonly Line[];
  prefix: string;
  onHeard?: () => void;
}) {
  const now = usePlayingLine(lines, prefix);
  const [heardUpTo, setHeardUpTo] = useState(-1);
  const onPlayed = (i: number) => {
    setHeardUpTo((was) => Math.max(was, i));
    onHeard?.();
  };
  const playing = now >= 0;
  const seconds = Math.round(lines.reduce((sum, line) => sum + line.et.length, 0) / 13);
  return (
    <div className="flex w-full items-center gap-3.5">
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play the passage"}
        onClick={() => {
          if (playing) return stopSound();
          onHeard?.();
          const from = heardUpTo >= lines.length - 1 || heardUpTo < 0 ? 0 : heardUpTo;
          void playInTurn(lines.slice(from).map((line) => ({ src: src(line.id), key: key(prefix, line.id) })));
        }}
        className={clsx(
          "relative grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-(--form) text-plate transition-[scale,box-shadow] duration-150 active:scale-[0.95]",
          playing && "shadow-[0_0_0_5px_var(--form-faint)]",
        )}
      >
        {playing ? (
          <Pause aria-hidden="true" className="size-5 fill-current" />
        ) : (
          <Play aria-hidden="true" className="ms-0.5 size-5 fill-current" />
        )}
      </button>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex gap-1">
          {lines.map((line, i) => (
            <Segment
              key={line.id}
              line={line}
              prefix={prefix}
              index={i}
              heard={i <= heardUpTo}
              onPlayed={onPlayed}
            />
          ))}
        </div>
        <span className="text-sm text-ink-muted tabular-nums">
          {playing
            ? `Sentence ${now + 1} of ${lines.length}`
            : heardUpTo >= 0
              ? "Tap a segment to hear that sentence again"
              : `${lines.length} sentences · about ${seconds} s`}
        </span>
      </div>
    </div>
  );
}

/** The passage written out, each line to hear again, with its meaning under it. */
export function Transcript({
  lines,
  prefix,
  lit,
  hidden,
}: {
  lines: readonly Line[];
  prefix: string;
  /** Lines to mark, such as the ones that held a missed answer. */
  lit?: ReadonlySet<string>;
  /** Text blurred out, to read only when the learner asks. */
  hidden?: boolean;
}) {
  return (
    <ol className="m-0 grid w-full list-none gap-0 p-0">
      {lines.map((line, i) => (
        <TranscriptLine key={line.id} line={line} prefix={prefix} n={i + 1} lit={lit?.has(line.id) ?? false} hidden={hidden ?? false} />
      ))}
    </ol>
  );
}

function TranscriptLine({ line, prefix, n, lit, hidden }: { line: Line; prefix: string; n: number; lit: boolean; hidden: boolean }) {
  const playing = usePlaying(key(prefix, line.id));
  return (
    <li className="border-b border-edge last:border-b-0">
      <button
        type="button"
        onClick={() => void playSound(src(line.id), key(prefix, line.id))}
        className={clsx(
          "grid w-full cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-2.5 text-start transition-colors duration-150 hoverable:hover:bg-plate-hover",
          lit && "bg-danger-soft/60",
        )}
      >
        <span className="text-sm text-ink-muted tabular-nums">{n}</span>
        <span className="min-w-0">
          {hidden ? (
            <span aria-label={`Sentence ${n}, hidden`} className="flex flex-wrap gap-1.5 py-1.5">
              {line.et.split(" ").map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: placeholder bars
                <i key={i} className="block h-3 rounded-full bg-edge-strong" style={{ width: `${w.length * 0.55}em` }} />
              ))}
            </span>
          ) : (
            <>
              <span lang="et" className="block text-lg font-medium tracking-tight">
                {line.et}
              </span>
              <span className="block text-sm text-ink-muted">{line.en}</span>
            </>
          )}
        </span>
        <span
          aria-hidden="true"
          className={clsx(
            "grid size-8 place-items-center rounded-full",
            playing ? "bg-(--form) text-plate" : "edge-lift bg-plate text-ink",
          )}
        >
          {playing ? <Bars /> : <Play className="size-3 fill-current" />}
        </span>
      </button>
    </li>
  );
}

export function Bars() {
  return (
    <span aria-hidden="true" className="learn-eq">
      <i />
      <i />
      <i />
    </span>
  );
}

/** A sentence to hear again, as a small chip. */
export function SentenceChip({ line, prefix }: { line: Line; prefix: string }) {
  const playing = usePlaying(key(prefix, line.id));
  return (
    <button
      type="button"
      lang="et"
      onClick={() => void playSound(src(line.id), key(prefix, line.id))}
      className={clsx(
        "inline-flex cursor-pointer items-center gap-2 rounded-full py-1 ps-1 pe-3 text-md font-medium ring-1 ring-edge-strong transition-colors hoverable:hover:bg-plate-hover",
        playing && "ring-2 ring-(--form)",
      )}
    >
      <span className={clsx("grid size-6 place-items-center rounded-full", playing ? "bg-(--form) text-plate" : "bg-(--tray) text-(--form)")}>
        {playing ? <Bars /> : <Play aria-hidden="true" className="size-2.5 fill-current" />}
      </span>
      {line.et}
    </button>
  );
}
