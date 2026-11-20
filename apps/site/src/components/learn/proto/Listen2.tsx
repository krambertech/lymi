/** Listening, round two: one timeline for the whole passage, all questions at once. Not for shipping. */
import { clsx } from "clsx";
import { Check, Pause, Play, RotateCcw, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { playSound, stopSound, usePlaying } from "../../../lib/learn/player";
import { Button } from "../../Button";
import { JAAN, JAAN_QS, type Question } from "./data";
import timing from "./jaan-timing.json";
import { Card, Dots } from "./parts";

export interface Recording {
  src: string;
  key: string;
  marks: readonly number[];
  duration: number;
}
export const JAAN_REC: Recording = { src: "/audio/estonian-lessons/proto/jaan.mp3", key: "jaan", ...timing };
const { marks, duration } = JAAN_REC;
const LETTERS = ["A", "B", "C", "D"];
const clock = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`;
const lineIndex = (id: string) => JAAN.findIndex((l) => l.id === id);

/** The passage as one clip: play, pause, seek, and the time now. */
export function useTimeline(onHeard: () => void, rec: Recording = JAAN_REC) {
  const { src: SRC, key: KEY, marks, duration } = rec;
  const [t, setT] = useState(0);
  const until = useRef<number | null>(null);
  const playing = usePlaying(KEY);
  const play = (from: number, to: number | null = null) => {
    onHeard();
    until.current = to;
    void playSound(
      SRC,
      KEY,
      (now) => {
        setT(now);
        if (until.current !== null && now >= until.current) stopSound();
      },
      from,
    ).then(() => setT((now) => (now >= duration - 0.4 ? duration : now)));
  };
  return {
    rec,
    t,
    playing,
    play,
    toggle() {
      if (playing) return stopSound();
      play(t >= duration - 0.4 ? 0 : t);
    },
    /** One sentence, from its mark to the next. */
    sentence(i: number) {
      play(marks[i] ?? 0, marks[i + 1] ?? null);
    },
  };
}

export type Timeline = ReturnType<typeof useTimeline>;

export function TimelinePlayer({ tl, label = "Passage", small }: { tl: Timeline; label?: string; small?: boolean }) {
  const { marks, duration } = tl.rec;
  const track = useRef<HTMLDivElement>(null);
  const share = Math.min(1, tl.t / duration);
  const seekTo = (clientX: number) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    let at = Math.max(0, Math.min(1, (clientX - box.left) / box.width)) * duration;
    // A tap close to a sentence's start begins at that sentence.
    const near = marks.find((m) => Math.abs(m - at) < duration * 0.035);
    if (near !== undefined) at = near;
    tl.play(at);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") tl.play(Math.min(duration, tl.t + 2));
    else if (event.key === "ArrowLeft") tl.play(Math.max(0, tl.t - 2));
    else return;
    event.preventDefault();
  };
  return (
    <div className="flex w-full items-center gap-4">
      <button
        type="button"
        aria-label={tl.playing ? "Pause" : "Play"}
        onClick={tl.toggle}
        className={clsx(
          "grid shrink-0 cursor-pointer place-items-center rounded-full bg-(--form) text-plate transition-[scale,box-shadow] duration-150 active:scale-[0.95]",
          small ? "size-10" : "size-12",
          tl.playing && "shadow-[0_0_0_5px_var(--form-faint)]",
        )}
      >
        {tl.playing ? (
          <Pause aria-hidden="true" className="size-5 fill-current" />
        ) : (
          <Play aria-hidden="true" className="ms-0.5 size-5 fill-current" />
        )}
      </button>
      <div className="grid min-w-0 flex-1 gap-1">
        <div
          ref={track}
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(tl.t)}
          aria-valuetext={`${clock(tl.t)} of ${clock(duration)}`}
          onClick={(event) => seekTo(event.clientX)}
          onKeyDown={onKey}
          className="relative h-8 cursor-pointer rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
        >
          <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-edge-strong" />
          <span
            className="absolute start-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--form)"
            style={{ width: `${share * 100}%` }}
          />
          {marks.slice(1).map((m) => (
            <span
              key={m}
              aria-hidden="true"
              className="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink-faint"
              style={{ insetInlineStart: `${(m / duration) * 100}%` }}
            />
          ))}
          <span
            aria-hidden="true"
            className={clsx(
              "absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--form) ring-3 ring-plate transition-opacity",
              tl.t === 0 && !tl.playing && "opacity-0",
            )}
            style={{ insetInlineStart: `${share * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-ink-muted tabular-nums">
          <span>{clock(tl.t)}</span>
          <span>{clock(duration)}</span>
        </div>
      </div>
    </div>
  );
}

type Mark = "right" | "wrong" | "out" | "chosen" | undefined;

/** An answer with its letter. */
function Lettered({ letter, label, mark, onPick }: { letter: string; label: ReactNode; mark: Mark; onPick: () => void }) {
  const done = mark === "right" || mark === "wrong" || mark === "out";
  return (
    <button
      type="button"
      onClick={onPick}
      aria-disabled={done || undefined}
      aria-pressed={mark === "chosen" || undefined}
      data-mark={mark === "right" || mark === "wrong" ? mark : undefined}
      className={clsx(
        "learn-answer relative flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-tile border border-edge-strong bg-plate py-2 ps-2 pe-3 text-start text-lg font-medium transition-[background-color,border-color,opacity] duration-150",
        !done && mark !== "chosen" && "hoverable:hover:bg-plate-hover",
        mark === "chosen" && "border-(--form) bg-(--form-soft)! ring-1 ring-(--form)",
        mark === "out" && "opacity-50",
        done && "cursor-default",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "grid size-8 shrink-0 place-items-center rounded-md text-sm font-semibold",
          mark === "right"
            ? "bg-success text-plate"
            : mark === "wrong"
              ? "bg-danger text-plate"
              : mark === "chosen"
                ? "bg-(--form) text-plate"
                : "bg-plate-nested text-ink-secondary",
        )}
      >
        {mark === "right" ? (
          <Check className="size-4" strokeWidth={3} />
        ) : mark === "wrong" ? (
          <X className="size-4" strokeWidth={3} />
        ) : (
          letter
        )}
      </span>
      <span className="min-w-0">
        <span className="sr-only">{letter}. </span>
        {label}
      </span>
    </button>
  );
}

function QuestionBlock({
  q,
  n,
  markOf,
  onPick,
  footer,
}: {
  q: Question;
  n: number;
  markOf: (id: string) => Mark;
  onPick: (id: string) => void;
  footer?: ReactNode;
}) {
  return (
    <fieldset className="m-0 grid min-w-0 gap-2.5 border-0 p-0">
      <legend className="mb-2.5 text-lg font-medium">
        <span className="me-2 text-ink-muted tabular-nums">{n}.</span>
        {q.q}
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {q.options.map((o, i) => (
          <Lettered key={o.id} letter={LETTERS[i] ?? ""} label={o.label} mark={markOf(o.id)} onPick={() => onPick(o.id)} />
        ))}
      </div>
      {footer}
    </fieldset>
  );
}

/** The passage written out after the questions, each line from its mark. */
function Transcript2({ tl, lit }: { tl: Timeline; lit?: ReadonlySet<number> }) {
  return (
    <div className="grid w-full gap-2 border-t border-edge pt-4">
      <span className="text-sm font-medium text-ink-muted">What Jaan said</span>
      <p lang="et" className="text-xl/[1.8] max-sm:text-lg/[1.8]">
        {JAAN.map((l, i) => {
          const now = tl.playing && tl.t >= (marks[i] ?? 0) && tl.t < (marks[i + 1] ?? duration);
          return (
            <span key={l.id}>
              <button
                type="button"
                title={l.en}
                onClick={() => tl.sentence(i)}
                className={clsx(
                  "cursor-pointer rounded-sm px-0.5 text-start transition-colors [box-decoration-break:clone] hoverable:hover:bg-(--form-soft)",
                  now && "bg-(--form-soft)",
                  lit?.has(i) && "underline decoration-danger decoration-2 underline-offset-4",
                )}
              >
                {l.et}
              </button>{" "}
            </span>
          );
        })}
      </p>
      <p className="text-md text-ink-secondary">{JAAN.map((l) => l.en).join(" ")}</p>
    </div>
  );
}

function Status({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="text-sm text-ink-muted">
      {children}
    </p>
  );
}

/** A: listen, answer all, one Check; the text after. */
export function Listen2A() {
  const [heard, setHeard] = useState(false);
  const tl = useTimeline(() => setHeard(true));
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const right = JAAN_QS.filter((q) => chosen[q.id] === q.answer).length;
  const missed = new Set(JAAN_QS.filter((q) => checked && chosen[q.id] !== q.answer).map((q) => lineIndex(q.evidence)));
  return (
    <Card title="Listen: meet Jaan" aside={checked ? <Dots results={JAAN_QS.map((q) => chosen[q.id] === q.answer)} now={-1} total={JAAN_QS.length} /> : undefined}>
      <p className="text-md text-ink-secondary">Listen as many times as you like, then answer.</p>
      <TimelinePlayer tl={tl} />
      <div className="grid w-full gap-6 border-t border-edge pt-5">
        {JAAN_QS.map((q, n) => (
          <QuestionBlock
            key={q.id}
            q={q}
            n={n + 1}
            markOf={(id) =>
              checked
                ? id === q.answer
                  ? "right"
                  : id === chosen[q.id]
                    ? "wrong"
                    : "out"
                : chosen[q.id] === id
                  ? "chosen"
                  : undefined
            }
            onPick={(id) => {
              if (checked) return;
              if (!heard) return setNote("Listen first.");
              setNote(null);
              setChosen((c) => ({ ...c, [q.id]: id }));
            }}
          />
        ))}
      </div>
      {note && <Status>{note}</Status>}
      {checked ? (
        <>
          <p className="text-xl font-semibold">
            {right} of {JAAN_QS.length} right
          </p>
          <Transcript2 tl={tl} lit={missed} />
          <Button
            onClick={() => {
              setChecked(false);
              setChosen({});
            }}
          >
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            Try again
          </Button>
        </>
      ) : (
        <div className="flex w-full justify-end">
          <Button
            variant="primary"
            onClick={() => {
              if (!heard) return setNote("Listen first.");
              if (Object.keys(chosen).length < JAAN_QS.length) return setNote("Answer every question first.");
              setNote(null);
              setChecked(true);
            }}
          >
            Check
          </Button>
        </div>
      )}
    </Card>
  );
}

/** B: each answer marks as you pick it, with the moment that answered it to hear again. */
export function Listen2B() {
  const [heard, setHeard] = useState(false);
  const tl = useTimeline(() => setHeard(true));
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [nudged, setNudged] = useState(false);
  const done = Object.keys(picked).length === JAAN_QS.length;
  const right = JAAN_QS.filter((q) => picked[q.id] === q.answer).length;
  return (
    <Card
      title="Listen: meet Jaan"
      aside={<Dots results={JAAN_QS.map((q) => (picked[q.id] ? picked[q.id] === q.answer : undefined))} now={-1} total={JAAN_QS.length} />}
    >
      <p className="text-md text-ink-secondary">Listen as many times as you like, then answer.</p>
      <TimelinePlayer tl={tl} />
      {nudged && !heard && <Status>Listen first.</Status>}
      <div className="grid w-full gap-6 border-t border-edge pt-5">
        {JAAN_QS.map((q, n) => {
          const p = picked[q.id];
          const at = marks[lineIndex(q.evidence)] ?? 0;
          return (
            <QuestionBlock
              key={q.id}
              q={q}
              n={n + 1}
              markOf={(id) => (!p ? undefined : id === q.answer ? "right" : id === p ? "wrong" : "out")}
              onPick={(id) => {
                if (p) return;
                if (!heard) return setNudged(true);
                setPicked((was) => ({ ...was, [q.id]: id }));
              }}
              footer={
                p && (
                  <button
                    type="button"
                    onClick={() => tl.sentence(lineIndex(q.evidence))}
                    className="inline-flex cursor-pointer items-center gap-2 justify-self-start rounded-full py-1 ps-1 pe-3 text-sm font-medium ring-1 ring-edge-strong hoverable:hover:bg-plate-hover"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-(--tray) text-(--form)">
                      <Play aria-hidden="true" className="size-2.5 fill-current" />
                    </span>
                    <span className={p === q.answer ? "text-success" : "text-danger"}>
                      {p === q.answer ? "Right." : "Not this one."}
                    </span>
                    <span className="text-ink-secondary">Hear it at {clock(at)}</span>
                  </button>
                )
              }
            />
          );
        })}
      </div>
      {done && (
        <>
          <p className="text-xl font-semibold">
            {right} of {JAAN_QS.length} right
          </p>
          <Transcript2 tl={tl} />
          <Button onClick={() => setPicked({})}>
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            Try again
          </Button>
        </>
      )}
    </Card>
  );
}
