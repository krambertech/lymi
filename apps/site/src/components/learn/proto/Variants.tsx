/** The prototype's options for each new lesson type. Not for shipping. */
import { clsx } from "clsx";
import { ArrowRight, Eye, EyeOff, MessageCircle, RotateCcw } from "lucide-react";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useState } from "react";
import { playInTurn, playSound, stopSound, usePlaying } from "../../../lib/learn/player";
import { Button } from "../../Button";
import { Listen } from "../Sound";
import { Word } from "../Word";
import { QuestionBlock, type Recording, type Timeline, TimelinePlayer, useTimeline } from "./Listen2";
import { PlayMark } from "../Sound";
import mariTiming from "./mari-timing.json";
import {
  DIALOGUE,
  GAPS,
  JAAN,
  JAAN_QS,
  type Line,
  MARI,
  MARI_FIND,
  MARI_QS,
  type Question,
  type Turn,
  src,
} from "./data";
import {
  Badge,
  Bars,
  Card,
  Dots,
  key,
  markFor,
  Nudge,
  Option,
  PassagePlayer,
  SentenceChip,
  Transcript,
  Verdict,
} from "./parts";

const lineById = (lines: readonly Line[], id: string) => lines.find((l) => l.id === id) as Line;

function NextButton({ last, onClick }: { last: boolean; onClick: () => void }) {
  return (
    <div className="flex w-full justify-end pt-1">
      <Button variant="primary" onClick={onClick}>
        {last ? "See how you did" : "Next"}
        <ArrowRight aria-hidden="true" data-icon="inline-end" />
      </Button>
    </div>
  );
}

function Again({ onClick }: { onClick: () => void }) {
  return (
    <Button onClick={onClick}>
      <RotateCcw aria-hidden="true" data-icon="inline-start" />
      Try again
    </Button>
  );
}

function Score({ right, total, children }: { right: number; total: number; children?: ReactNode }) {
  return (
    <div className="grid gap-1">
      <p className="text-xl font-semibold">
        {right} of {total} right
      </p>
      {children && <p className="text-md text-ink-secondary">{children}</p>}
    </div>
  );
}

/** One question at a time, as in today's quizzes. */
function useRounds(total: number) {
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  return {
    round,
    picked,
    results,
    finished: round >= total,
    pick(id: string, right: boolean) {
      if (picked !== null) return;
      setPicked(id);
      setResults((was) => [...was, right]);
    },
    next() {
      setPicked(null);
      setRound((r) => r + 1);
    },
    restart() {
      setPicked(null);
      setRound(0);
      setResults([]);
    },
  };
}

function QuestionOptions({
  q,
  picked,
  onPick,
  chosen,
  row,
}: {
  q: Question;
  picked: string | null | undefined;
  onPick: (id: string) => void;
  /** Chosen but not yet checked. */
  chosen?: string | undefined;
  row?: boolean;
}) {
  return (
    <fieldset className={clsx("m-0 grid w-full min-w-0 gap-2 border-0 p-0", row && "sm:grid-cols-3")}>
      <legend className="sr-only">Answers</legend>
      {q.options.map((o) => (
        <Option
          key={o.id}
          label={o.label}
          mark={markFor(o.id, q.answer, picked)}
          chosen={chosen === o.id && picked == null}
          className={clsx(row && "sm:text-md")}
          onPick={() => onPick(o.id)}
        />
      ))}
    </fieldset>
  );
}

// ─── 1. Listen, then answer ─────────────────────────────────────────────────

/** A: one player, text hidden, one question at a time; the text and the lines you missed after. */
export function ListenA() {
  const r = useRounds(JAAN_QS.length);
  const [heard, setHeard] = useState(false);
  const [nudged, setNudged] = useState(false);
  const q = JAAN_QS[r.round];
  const missed = new Set(JAAN_QS.filter((_, i) => r.results[i] === false).map((x) => x.evidence));
  return (
    <Card title="Listen: meet Jaan" aside={<Dots results={r.results} now={r.round} total={JAAN_QS.length} />}>
      <div className="w-full border-b border-edge pb-4">
        <PassagePlayer lines={JAAN} prefix="la" onHeard={() => setHeard(true)} />
      </div>
      {!r.finished && q && (
        <>
          <p className="text-xl font-medium">{q.q}</p>
          <Nudge shown={nudged && !heard} />
          <QuestionOptions
            q={q}
            picked={r.picked}
            onPick={(id) => (heard ? r.pick(id, id === q.answer) : setNudged(true))}
          />
          {r.picked && <Verdict right={r.picked === q.answer} />}
          {r.picked && <NextButton last={r.round === JAAN_QS.length - 1} onClick={r.next} />}
        </>
      )}
      {r.finished && (
        <>
          <Score right={r.results.filter(Boolean).length} total={JAAN_QS.length}>
            Here is what Jaan said. A line that held an answer you missed is marked.
          </Score>
          <Transcript lines={JAAN} prefix="la" lit={missed} />
          <Again
            onClick={() => {
              r.restart();
              setHeard(false);
            }}
          />
        </>
      )}
    </Card>
  );
}

/** B: every sentence on its own row, text on a switch; all questions at once, one Check. */
export function ListenB() {
  const [shown, setShown] = useState(false);
  const [heard, setHeard] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const right = JAAN_QS.filter((q) => chosen[q.id] === q.answer).length;
  return (
    <Card
      title="Listen: meet Jaan"
      aside={
        <button
          type="button"
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-plate px-3 py-1.5 text-sm font-medium hoverable:hover:bg-plate-hover"
        >
          {shown ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
          {shown ? "Hide text" : "Show text"}
        </button>
      }
    >
      <PassagePlayer lines={JAAN} prefix="lb" onHeard={() => setHeard(true)} />
      <Transcript lines={JAAN} prefix="lb" hidden={!shown} />
      <div className="grid w-full gap-5 border-t border-edge pt-5">
        {JAAN_QS.map((q, i) => (
          <div key={q.id} className="grid gap-2.5">
            <p className="text-lg font-medium">
              <span className="me-2 text-ink-muted tabular-nums">{i + 1}.</span>
              {q.q}
            </p>
            <QuestionOptions
              q={q}
              row
              picked={checked ? (chosen[q.id] ?? "none") : null}
              chosen={chosen[q.id]}
              onPick={(id) => {
                if (checked) return;
                if (!heard) return setNote("Listen first.");
                setNote(null);
                setChosen((c) => ({ ...c, [q.id]: id }));
              }}
            />
          </div>
        ))}
      </div>
      {note && (
        <p role="status" className="text-sm text-ink-muted">
          {note}
        </p>
      )}
      {checked ? (
        <>
          <Score right={right} total={JAAN_QS.length} />
          <Again
            onClick={() => {
              setChecked(false);
              setChosen({});
            }}
          />
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

/** C: read the questions first; each answer marks at once and shows the line that held it. */
export function ListenC() {
  const [heard, setHeard] = useState(false);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [nudged, setNudged] = useState(false);
  const done = Object.keys(picked).length === JAAN_QS.length;
  const right = JAAN_QS.filter((q) => picked[q.id] === q.answer).length;
  return (
    <Card
      title="Listen: meet Jaan"
      aside={<Dots results={JAAN_QS.map((q) => (picked[q.id] ? picked[q.id] === q.answer : undefined))} now={-1} total={JAAN_QS.length} />}
    >
      <p className="text-md text-ink-secondary">Read the questions, then listen. Answer as you hear.</p>
      <PassagePlayer lines={JAAN} prefix="lc" onHeard={() => setHeard(true)} />
      <Nudge shown={nudged && !heard} />
      <div className="grid w-full gap-5 border-t border-edge pt-5">
        {JAAN_QS.map((q, i) => {
          const p = picked[q.id];
          return (
            <div key={q.id} className={clsx("grid gap-2.5 transition-opacity", !heard && "opacity-70")}>
              <p className="text-lg font-medium">
                <span className="me-2 text-ink-muted tabular-nums">{i + 1}.</span>
                {q.q}
              </p>
              <QuestionOptions
                q={q}
                row
                picked={p}
                onPick={(id) => {
                  if (p) return;
                  if (!heard) return setNudged(true);
                  setPicked((was) => ({ ...was, [q.id]: id }));
                }}
              />
              {p && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-ink-muted">{p === q.answer ? "Right. Jaan said" : "Jaan said"}</span>
                  <SentenceChip line={lineById(JAAN, q.evidence)} prefix="lc" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {done && (
        <>
          <Score right={right} total={JAAN_QS.length}>
            The whole passage, to read and hear again:
          </Score>
          <Transcript lines={JAAN} prefix="lc" />
          <Again
            onClick={() => {
              setPicked({});
            }}
          />
        </>
      )}
    </Card>
  );
}

// ─── 2. A passage with gaps ─────────────────────────────────────────────────

function GapSlot({
  answer,
  filled,
  checked,
  active,
  onClick,
  label,
}: {
  answer: string;
  filled: string | null;
  checked: boolean;
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  const right = filled === answer;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      data-mark={checked && filled ? (right ? "right" : "wrong") : undefined}
      className={clsx(
        "learn-gap mx-0.5 inline-flex min-w-[3.2ch] cursor-pointer items-baseline justify-center gap-1.5 rounded-t-sm px-1 align-baseline transition-colors",
        active && !checked && "bg-(--form-soft)",
      )}
      style={active && !checked ? { borderBottomColor: "var(--form)" } : undefined}
    >
      {checked && filled && !right && <s className="text-[0.7em]">{filled}</s>}
      <span className={clsx(checked && filled && !right && "text-success")}>{checked && filled && !right ? answer :(filled ?? "   ")}</span>
    </button>
  );
}

/** A: tap a gap, pick its word under the passage; each gap marks at once. The passage can be heard at the end. */
export function GapsA() {
  const [fills, setFills] = useState<Record<string, string>>({});
  const firstOpen = GAPS.find((g) => !fills[g.id])?.id ?? null;
  const [active, setActive] = useState<string | null>("g1");
  const current = GAPS.find((g) => g.id === (active && !fills[active] ? active : firstOpen));
  const lastFilled = GAPS.find((g) => g.id === active && fills[g.id]);
  const done = !firstOpen;
  const right = GAPS.filter((g) => fills[g.id] === g.answer).length;
  return (
    <Card
      title="Fill the gaps"
      aside={<Dots results={GAPS.map((g) => (fills[g.id] ? fills[g.id] === g.answer : undefined))} now={GAPS.findIndex((g) => g.id === current?.id)} total={GAPS.length} />}
    >
      <p lang="et" className="max-w-[34ch] text-2xl/[1.75] font-medium tracking-tight max-sm:text-xl/[1.75]">
        {GAPS.map((g, i) => (
          <span key={g.id}>
            {g.before}{" "}
            <GapSlot
              label={`Gap ${i + 1}`}
              answer={g.answer}
              filled={fills[g.id] ?? null}
              checked={!!fills[g.id]}
              active={current?.id === g.id}
              onClick={() => setActive(g.id)}
            />{" "}
            {g.after}{" "}
          </span>
        ))}
      </p>
      {lastFilled && (
        <Verdict right={fills[lastFilled.id] === lastFilled.answer}>
          {lastFilled.why} <span lang="et" className="text-ink">{lastFilled.before} {lastFilled.answer} {lastFilled.after}</span>
        </Verdict>
      )}
      {!done && current && (
        <div className="grid w-full gap-2.5 border-t border-edge pt-4">
          <p className="text-sm text-ink-muted">
            Gap {GAPS.indexOf(current) + 1} of {GAPS.length}
          </p>
          <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
            <legend className="sr-only">Pick the word</legend>
            {current.options.map((o) => (
              <BigChip
                key={o}
                label={o}
                onPick={() => {
                  setFills((f) => ({ ...f, [current.id]: o }));
                  setActive(current.id);
                }}
              />
            ))}
          </fieldset>
        </div>
      )}
      {done && (
        <>
          <Score right={right} total={GAPS.length} />
          <HearPassage prefix="ga" />
          <Again
            onClick={() => {
              setFills({});
              setActive("g1");
            }}
          />
        </>
      )}
    </Card>
  );
}

function BigChip({ label, onPick, used, mark }: { label: string; onPick: () => void; used?: boolean; mark?: "right" | "wrong" }) {
  return (
    <button
      type="button"
      lang="et"
      onClick={onPick}
      aria-disabled={used || undefined}
      data-mark={mark}
      className={clsx(
        "learn-answer relative min-w-20 cursor-pointer rounded-tile border border-edge-strong bg-plate px-4 py-2 text-2xl font-semibold tracking-tight transition-[background-color,opacity,scale] duration-150 active:scale-[0.97] hoverable:hover:bg-plate-hover",
        used && "border-dashed text-transparent hoverable:hover:bg-plate",
      )}
    >
      {label}
      {mark && <Badge mark={mark} big />}
    </button>
  );
}

/** The finished passage, read aloud on request. */
function HearPassage({ prefix }: { prefix: string }) {
  const playing = GAPS.map((g) => usePlaying(key(prefix, g.id))).some(Boolean);
  return (
    <button
      type="button"
      onClick={() =>
        playing ? stopSound() : void playInTurn(GAPS.map((g) => ({ src: src(g.id), key: key(prefix, g.id) })))
      }
      className="edge-lift inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-full bg-plate ps-1.5 pe-4 text-md font-medium hoverable:hover:bg-plate-hover"
    >
      <span className="grid size-7 place-items-center rounded-full bg-(--form) text-plate">
        {playing ? <Bars /> : <span className="ms-px text-[0.65rem]">▶</span>}
      </span>
      {playing ? "Stop" : "Hear the passage"}
    </button>
  );
}

const BANK = ["loen", "on", "oled", "ei", "elame", "loeb", "olen"];

interface Drag {
  word: string;
  /** "bank", or the gap it was lifted from. */
  from: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  moved: boolean;
}

/** B: drag words from the bank into the gaps (or tap a word, then a gap), then Check them all. */
export function GapsB() {
  const [fills, setFills] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const used = new Set(Object.values(fills));
  const target = active ?? GAPS.find((g) => !fills[g.id])?.id;
  const right = GAPS.filter((g) => fills[g.id] === g.answer).length;

  const gapAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest("[data-gap]") as HTMLElement | null)?.dataset.gap ?? null;

  const place = (word: string, from: string, to: string | null) =>
    setFills((was) => {
      const next = { ...was };
      if (from !== "bank") delete next[from];
      if (to) {
        const bumped = next[to];
        next[to] = word;
        // Dropped on a filled gap from another gap: the two words swap.
        if (bumped && from !== "bank") next[from] = bumped;
      }
      return next;
    });

  const lift = (word: string, from: string) => (event: ReactPointerEvent<HTMLElement>) => {
    if (checked || event.button !== 0) return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ word, from, x: event.clientX, y: event.clientY, dx: event.clientX - box.left, dy: event.clientY - box.top, moved: false });
  };
  const move = (event: ReactPointerEvent) => {
    if (!drag) return;
    const moved = drag.moved || Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 6;
    setDrag({ ...drag, x: event.clientX, y: event.clientY, moved });
    if (moved) setOver(gapAt(event.clientX, event.clientY));
  };
  const drop = (event: ReactPointerEvent) => {
    if (!drag) return;
    const to = gapAt(event.clientX, event.clientY);
    if (drag.moved) {
      place(drag.word, drag.from, to);
      setActive(null);
    } else if (drag.from === "bank") {
      // A tap: the word goes to the chosen gap, or the first open one.
      if (!used.has(drag.word) && target) place(drag.word, "bank", target);
      setActive(null);
    } else {
      // A tap on a filled gap takes its word back and opens that gap.
      place(drag.word, drag.from, null);
      setActive(drag.from);
    }
    setDrag(null);
    setOver(null);
  };
  const handlers = { onPointerMove: move, onPointerUp: drop, onPointerCancel: () => (setDrag(null), setOver(null)) };

  return (
    <Card title="Fill the gaps">
      <div className="grid w-full gap-2 rounded-lg bg-plate-nested p-3">
        <span className="text-sm text-ink-muted">Drag each word to its gap · two are spare</span>
        <div className="flex flex-wrap gap-2">
          {BANK.map((w) => {
            const lifted = drag?.moved && drag.word === w;
            const gone = used.has(w) && !(lifted && drag?.from === "bank");
            return (
              <span
                key={w}
                lang="et"
                role="button"
                tabIndex={gone || checked ? -1 : 0}
                aria-disabled={gone || undefined}
                onPointerDown={gone ? undefined : lift(w, "bank")}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !gone && target && !checked) {
                    event.preventDefault();
                    place(w, "bank", target);
                    setActive(null);
                  }
                }}
                {...handlers}
                className={clsx(
                  "learn-answer relative min-w-20 touch-none rounded-tile border border-edge-strong bg-plate px-4 py-2 text-center text-2xl font-semibold tracking-tight select-none",
                  gone || lifted
                    ? "border-dashed text-transparent"
                    : "cursor-grab hoverable:hover:bg-plate-hover",
                )}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
      <p lang="et" className="max-w-[34ch] text-2xl/[1.75] font-medium tracking-tight max-sm:text-xl/[1.75]">
        {GAPS.map((g, i) => {
          const filled = fills[g.id];
          const liftedHere = drag?.moved && drag.from === g.id;
          const isRight = filled === g.answer;
          return (
            <span key={g.id}>
              {g.before}{" "}
              <span
                data-gap={g.id}
                role="button"
                tabIndex={checked ? -1 : 0}
                aria-label={`Gap ${i + 1}${filled ? `: ${filled}` : ""}`}
                aria-pressed={!checked && target === g.id}
                onPointerDown={filled && !checked ? lift(filled, g.id) : undefined}
                onClick={() => !filled && !checked && setActive(g.id)}
                {...handlers}
                data-mark={checked && filled ? (isRight ? "right" : "wrong") : undefined}
                className={clsx(
                  "learn-gap mx-0.5 inline-flex min-w-[3.4ch] touch-none items-baseline justify-center gap-1.5 rounded-t-sm px-1 align-baseline transition-colors select-none",
                  !checked && "cursor-pointer",
                  !checked && filled && !liftedHere && "cursor-grab text-(--form)",
                  (over === g.id || (!drag && !checked && target === g.id)) && "bg-(--form-soft)",
                )}
                style={
                  checked
                    ? undefined
                    : filled && !liftedHere
                      ? { borderBottomStyle: "solid", borderBottomColor: "var(--form)" }
                      : drag?.moved
                        ? { borderBottomColor: "var(--form)" }
                        : undefined
                }
              >
                {checked && filled && !isRight && <s className="text-[0.7em]">{filled}</s>}
                <span className={clsx(checked && !isRight && "text-success", liftedHere && "opacity-0")}>
                  {checked && !isRight ? g.answer : (filled ?? "   ")}
                </span>
              </span>{" "}
              {g.after}{" "}
            </span>
          );
        })}
      </p>
      {drag?.moved && (
        <span
          aria-hidden="true"
          lang="et"
          className="pointer-events-none fixed z-50 rounded-tile border border-(--form) bg-plate px-4 py-2 text-2xl font-semibold tracking-tight shadow-[var(--learn-pop)]"
          style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, rotate: "-2deg" }}
        >
          {drag.word}
        </span>
      )}
      {note && (
        <p role="status" className="text-sm text-ink-muted">
          {note}
        </p>
      )}
      {checked ? (
        <>
          <Score right={right} total={GAPS.length}>
            {right < GAPS.length ? "The right word stands where you missed one." : "Every gap right."}
          </Score>
          <div className="flex flex-wrap gap-2">
            <HearPassage prefix="gb" />
            <Again
              onClick={() => {
                setFills({});
                setChecked(false);
              }}
            />
          </div>
        </>
      ) : (
        <div className="flex w-full items-center justify-between gap-3">
          <span className="text-sm text-ink-muted">Drag a word out of a gap to take it back.</span>
          <Button
            variant="primary"
            onClick={() => {
              if (Object.keys(fills).length < GAPS.length) return setNote("Fill every gap first.");
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

/** C: one line at a time, heard first; the passage builds above it. */
export function GapsC() {
  const r = useRounds(GAPS.length);
  const [heard, setHeard] = useState(false);
  const [nudged, setNudged] = useState(false);
  const g = GAPS[r.round];
  const done = GAPS.slice(0, r.round + (r.picked ? 1 : 0));
  return (
    <Card title="Listen and fill" aside={<Dots results={r.results} now={r.round} total={GAPS.length} />}>
      {done.length > 0 && (
        <div className="grid w-full gap-1 border-b border-edge pb-3">
          {done.map((d) =>
            d.id === g?.id ? null : <DoneLine key={d.id} id={d.id} text={`${d.before} ${d.answer} ${d.after}`} />,
          )}
        </div>
      )}
      {!r.finished && g && (
        <>
          <Listen src={src(g.id)} onPlay={() => setHeard(true)} />
          <Nudge shown={nudged && !heard} />
          <p lang="et" className="flex flex-wrap items-baseline gap-x-2 text-[clamp(1.75rem,6vw,2.5rem)] leading-tight font-semibold tracking-tight">
            {g.before}
            <span
              data-mark={r.picked ? (r.picked === g.answer ? "right" : "wrong") : undefined}
              className="learn-gap inline-block min-w-[2.5ch] text-center"
            >
              {r.picked ?? " "}
            </span>
            {g.after}
          </p>
          <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
            <legend className="sr-only">Fill the gap</legend>
            {g.options.map((o) => (
              <BigChip
                key={o}
                label={o}
                mark={r.picked ? (o === g.answer ? "right" : o === r.picked ? "wrong" : undefined) : undefined}
                onPick={() => {
                  if (r.picked) return;
                  if (!heard) return setNudged(true);
                  r.pick(o, o === g.answer);
                }}
              />
            ))}
          </fieldset>
          {r.picked && <Verdict right={r.picked === g.answer}>{g.why}</Verdict>}
          {r.picked && (
            <NextButton
              last={r.round === GAPS.length - 1}
              onClick={() => {
                r.next();
                const n = GAPS[r.round + 1];
                if (n) void playSound(src(n.id));
              }}
            />
          )}
        </>
      )}
      {r.finished && (
        <>
          <Score right={r.results.filter(Boolean).length} total={GAPS.length} />
          <Again
            onClick={() => {
              r.restart();
              setHeard(false);
            }}
          />
        </>
      )}
    </Card>
  );
}

function DoneLine({ id, text }: { id: string; text: string }) {
  const playing = usePlaying(key("gc", id));
  return (
    <button
      type="button"
      lang="et"
      onClick={() => void playSound(src(id), key("gc", id))}
      className="flex cursor-pointer items-center gap-2 text-start text-lg text-ink-secondary hoverable:hover:text-ink"
    >
      <span className={clsx("grid size-6 place-items-center rounded-full", playing ? "bg-(--form) text-plate" : "bg-(--tray) text-(--form)")}>
        {playing ? <Bars /> : <span className="text-[0.6rem]">▶</span>}
      </span>
      {text}
    </button>
  );
}

// ─── 3. Read, then answer ───────────────────────────────────────────────────

const MARI_REC: Recording = { src: "/audio/estonian-lessons/proto/mari.mp3", key: "mari", ...mariTiming };

/** Mari's text. Its words open their cards only once the questions are answered. */
function MariText({ big, glossed, tl }: { big?: boolean; glossed: boolean; tl: Timeline }) {
  const W = ({ w }: { w: string }) => (glossed ? <Word w={w} /> : <>{w}</>);
  const words: Record<string, ReactNode> = {
    r2: <>Ma olen <W w="õpetaja" />.</>,
    r4: <>Ma loen <W w="palju" />.</>,
    r5: <>Minu <W w="vend" /> Peeter ei loe.</>,
    r6: <>Ta <W w="kuulab" /> <W w="muusikat" />.</>,
  };
  const { marks, duration } = MARI_REC;
  return (
    <p lang="et" className={clsx("max-w-[46ch] leading-[1.7] text-ink", big ? "text-2xl max-sm:text-xl" : "text-xl max-sm:text-lg")}>
      {MARI.map((l, i) => {
        const now = tl.playing && tl.t >= (marks[i] ?? 0) && tl.t < (marks[i + 1] ?? duration);
        return (
          <span key={l.id}>
            <span className={clsx("rounded-sm transition-colors duration-200 [box-decoration-break:clone]", now && "bg-(--form-soft)")}>
              {words[l.id] ?? l.et}
            </span>{" "}
          </span>
        );
      })}
    </p>
  );
}

function GlossNote({ glossed }: { glossed: boolean }) {
  return (
    <p className="text-sm text-ink-muted">
      {glossed ? "Rest on a coloured word to see what it means." : "Word meanings open once you have answered."}
    </p>
  );
}

/** A: the text on the page, read like prose; then every question at once, lettered, and one Check. */
export function ReadA() {
  const tl = useTimeline(() => {}, MARI_REC);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const right = MARI_QS.filter((q) => chosen[q.id] === q.answer).length;
  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <span className="text-sm font-medium text-ink-muted">Mari writes</span>
        <MariText big glossed={checked} tl={tl} />
        <GlossNote glossed={checked} />
        <div className="max-w-md pt-1">
          <TimelinePlayer tl={tl} label="Hear it read" small />
        </div>
      </div>
      <Card
        title="What did you read?"
        aside={checked ? <Dots results={MARI_QS.map((q) => chosen[q.id] === q.answer)} now={-1} total={MARI_QS.length} /> : undefined}
      >
        <div className="grid w-full gap-6">
          {MARI_QS.map((q, n) => (
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
              onPick={(id) => !checked && setChosen((c) => ({ ...c, [q.id]: id }))}
            />
          ))}
        </div>
        {note && (
          <p role="status" className="text-sm text-ink-muted">
            {note}
          </p>
        )}
        {checked ? (
          <>
            <Score right={right} total={MARI_QS.length} />
            <Again
              onClick={() => {
                setChosen({});
                setChecked(false);
              }}
            />
          </>
        ) : (
          <div className="flex w-full justify-end">
            <Button
              variant="primary"
              onClick={() => {
                if (Object.keys(chosen).length < MARI_QS.length) return setNote("Answer every question first.");
                setNote(null);
                setChecked(true);
              }}
            >
              Check
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/** B: text and questions side by side on a wide screen, the text staying in view; one Check. */
export function ReadB() {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const tl = useTimeline(() => {}, MARI_REC);
  const [note, setNote] = useState<string | null>(null);
  const right = MARI_QS.filter((q) => chosen[q.id] === q.answer).length;
  return (
    <div className="relative left-1/2 grid w-[min(1040px,calc(100vw-40px))] -translate-x-1/2 items-start gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="grid gap-3 md:sticky md:top-24">
        <span className="text-sm font-medium text-ink-muted">Mari writes</span>
        <MariText glossed={checked} tl={tl} />
        <GlossNote glossed={checked} />
        <div className="max-w-md pt-1">
          <TimelinePlayer tl={tl} label="Hear it read" small />
        </div>
      </div>
      <Card title="What did you read?">
        {MARI_QS.map((q, i) => (
          <div key={q.id} className="grid w-full gap-2.5">
            <p className="text-lg font-medium">
              <span className="me-2 text-ink-muted tabular-nums">{i + 1}.</span>
              {q.q}
            </p>
            <QuestionOptions
              q={q}
              picked={checked ? (chosen[q.id] ?? "none") : null}
              chosen={chosen[q.id]}
              onPick={(id) => !checked && setChosen((c) => ({ ...c, [q.id]: id }))}
            />
          </div>
        ))}
        {note && (
          <p role="status" className="text-sm text-ink-muted">
            {note}
          </p>
        )}
        {checked ? (
          <>
            <Score right={right} total={MARI_QS.length} />
            <Again
              onClick={() => {
                setChosen({});
                setChecked(false);
              }}
            />
          </>
        ) : (
          <div className="flex w-full justify-end">
            <Button
              variant="primary"
              onClick={() => {
                if (Object.keys(chosen).length < MARI_QS.length) return setNote("Answer every question first.");
                setNote(null);
                setChecked(true);
              }}
            >
              Check
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/** C: the answer is a sentence in the text: tap it. */
export function ReadC() {
  const r = useRounds(MARI_FIND.length);
  const q = MARI_FIND[r.round];
  const tl = useTimeline(() => {}, MARI_REC);
  return (
    <Card title="Find it in the text" aside={<Dots results={r.results} now={r.round} total={MARI_FIND.length} />}>
      {!r.finished && q && <p className="text-xl font-medium">{q.q}</p>}
      <p lang="et" className="text-xl/[1.9] max-sm:text-lg/[1.9]">
        {MARI.map((l) => {
          const mark = q && r.picked ? (l.id === q.answer ? "right" : l.id === r.picked ? "wrong" : undefined) : undefined;
          return (
            <span key={l.id}>
              <button
                type="button"
                disabled={r.finished}
                onClick={() => q && r.pick(l.id, l.id === q.answer)}
                className={clsx(
                  "cursor-pointer rounded-sm px-1 py-0.5 text-start transition-colors [box-decoration-break:clone]",
                  !r.picked && !r.finished && "hoverable:hover:bg-(--form-soft)",
                  mark === "right" && "bg-success-soft text-ink ring-1 ring-success",
                  mark === "wrong" && "bg-danger-soft text-ink ring-1 ring-danger ring-dashed",
                )}
              >
                {l.et}
              </button>{" "}
            </span>
          );
        })}
      </p>
      {!r.finished && q && r.picked && (
        <>
          <Verdict right={r.picked === q.answer}>{lineById(MARI, q.answer).en}</Verdict>
          <NextButton last={r.round === MARI_FIND.length - 1} onClick={r.next} />
        </>
      )}
      {r.finished && (
        <>
          <Score right={r.results.filter(Boolean).length} total={MARI_FIND.length} />
          <div className="w-full max-w-md">
            <TimelinePlayer tl={tl} label="Hear it read" small />
          </div>
          <Again onClick={r.restart} />
        </>
      )}
    </Card>
  );
}

// ─── 4. Dialogue ────────────────────────────────────────────────────────────

const YOUR_TURNS = DIALOGUE.filter((t) => t.who === "you");
type YourTurn = Extract<Turn, { who: "you" }>;
const rightReply = (t: YourTurn) => t.options.find((o) => o.ok)?.et ?? "";

function useDialogue(prefix: string) {
  const [started, setStarted] = useState(false);
  const [at, setAt] = useState(0);
  const [picks, setPicks] = useState<Record<string, number>>({});
  const current = DIALOGUE[at];
  const finished = started && at >= DIALOGUE.length;
  const firstYou = DIALOGUE.findIndex((t) => t.who === "you");

  const playMari = (from: number, to: number) =>
    DIALOGUE.slice(from, to)
      .filter((t) => t.who === "mari")
      .map((t) => ({ src: src(t.id), key: key(prefix, t.id) }));

  function resolve(index: number) {
    const turn = DIALOGUE[index] as YourTurn;
    const nextYou = DIALOGUE.findIndex((t, i) => i > index && t.who === "you");
    const to = nextYou === -1 ? DIALOGUE.length : nextYou;
    setAt(to);
    void playInTurn([{ src: src(turn.id), key: key(prefix, turn.id) }, ...playMari(index + 1, to)]);
  }

  return {
    started,
    at,
    picks,
    current,
    finished,
    results: YOUR_TURNS.map((t) => (picks[t.id] === undefined ? undefined : !!t.options[picks[t.id] as number]?.ok)),
    start() {
      setStarted(true);
      setAt(firstYou);
      void playInTurn(playMari(0, firstYou));
    },
    pick(i: number) {
      const turn = current as YourTurn;
      if (picks[turn.id] !== undefined) return;
      setPicks((p) => ({ ...p, [turn.id]: i }));
      if (turn.options[i]?.ok) setTimeout(() => resolve(at), 650);
    },
    proceed() {
      resolve(at);
    },
    restart() {
      setStarted(false);
      setAt(0);
      setPicks({});
    },
    playAll() {
      void playInTurn(
        DIALOGUE.map((t) => ({ src: src(t.id), key: key(prefix, t.id) })),
      );
    },
  };
}

function RoleCard() {
  return (
    <p className="flex items-start gap-2.5 text-md text-ink-secondary">
      <MessageCircle aria-hidden="true" className="mt-0.5 size-4.5 shrink-0 text-(--form)" />
      <span>
        You are <b className="font-medium text-ink">Jaan</b>, a doctor from Tartu. Mari speaks first; pick what you say back.
      </span>
    </p>
  );
}

function MariBubble({ turn, prefix, hideText }: { turn: Extract<Turn, { who: "mari" }>; prefix: string; hideText?: boolean }) {
  const playing = usePlaying(key(prefix, turn.id));
  const [shown, setShown] = useState(!hideText);
  return (
    <div className="flex max-w-[88%] items-start gap-2.5">
      <span aria-hidden="true" className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-full bg-(--tray) text-sm font-semibold text-(--form)">
        M
      </span>
      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => void playSound(src(turn.id), key(prefix, turn.id))}
          className="flex cursor-pointer items-center gap-3 rounded-2xl rounded-ss-sm bg-plate-nested py-2 ps-2 pe-4 text-start"
        >
          <PlayMark playing={playing} />
          {shown ? (
            <span lang="et" className="text-lg font-medium">
              {turn.et}
            </span>
          ) : (
            <span aria-label="Mari's words, hidden" className="flex h-6 items-center gap-[3px]">
              {Array.from({ length: Math.round(turn.et.length / 1.6) }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: decorative bars
                <i key={i} className="block w-[3px] rounded-full bg-ink-faint" style={{ height: `${30 + ((i * 37) % 70)}%` }} />
              ))}
            </span>
          )}
        </button>
        {shown ? null : (
          <button type="button" onClick={() => setShown(true)} className="cursor-pointer justify-self-start ps-1 text-sm font-medium text-(--form) underline-offset-2 hover:underline">
            Show what she said
          </button>
        )}
      </div>
    </div>
  );
}

function YourBubble({ text, prefix, id }: { text: string; prefix: string; id: string }) {
  const playing = usePlaying(key(prefix, id));
  return (
    <button
      type="button"
      lang="et"
      onClick={() => void playSound(src(id), key(prefix, id))}
      className={clsx(
        "max-w-[80%] cursor-pointer justify-self-end rounded-2xl rounded-ee-sm bg-(--form-soft) px-3.5 py-2.5 text-start text-lg font-medium transition-shadow",
        playing && "ring-2 ring-(--form)",
      )}
    >
      {text}
    </button>
  );
}

function Replies({ d }: { d: ReturnType<typeof useDialogue> }) {
  const turn = d.current as YourTurn;
  const p = d.picks[turn.id];
  const pickedReply = p === undefined ? undefined : turn.options[p];
  return (
    <div className="grid w-full gap-2.5 border-t border-edge pt-4">
      <span className="text-sm font-medium text-ink-muted">Your reply</span>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="sr-only">Your reply</legend>
        {turn.options.map((o, i) => (
          <Option
            key={o.et}
            lang="et"
            label={o.et}
            mark={p === undefined ? undefined : o.ok ? "right" : i === p ? "wrong" : "out"}
            onPick={() => d.pick(i)}
          />
        ))}
      </fieldset>
      {pickedReply && <Verdict right={!!pickedReply.ok}>{pickedReply.why}</Verdict>}
      {pickedReply && !pickedReply.ok && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={d.proceed}>
            Say it
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      )}
    </div>
  );
}

function DialogueEnd({ d }: { d: ReturnType<typeof useDialogue> }) {
  return (
    <div className="grid w-full gap-3 border-t border-edge pt-4">
      <Score right={d.results.filter(Boolean).length} total={YOUR_TURNS.length}>
        replies right the first time.
      </Score>
      <div className="flex flex-wrap gap-2">
        <Button onClick={d.playAll}>Hear the whole conversation</Button>
        <Again onClick={d.restart} />
      </div>
    </div>
  );
}

function Chat({ prefix, hideText }: { prefix: string; hideText?: boolean }) {
  const d = useDialogue(prefix);
  return (
    <Card title="Talk: meeting Mari" aside={<Dots results={d.results} now={YOUR_TURNS.findIndex((t) => t === d.current)} total={YOUR_TURNS.length} />}>
      <RoleCard />
      {!d.started ? (
        <Button variant="primary" onClick={d.start}>
          Start the conversation
        </Button>
      ) : (
        <>
          <div className="grid w-full gap-3">
            {DIALOGUE.slice(0, d.at).map((t) =>
              t.who === "mari" ? (
                <MariBubble key={t.id} turn={t} prefix={prefix} hideText={hideText} />
              ) : (
                <YourBubble key={t.id} id={t.id} text={rightReply(t)} prefix={prefix} />
              ),
            )}
          </div>
          {d.finished ? <DialogueEnd d={d} /> : <Replies d={d} />}
        </>
      )}
    </Card>
  );
}

/** A: a chat. Mari's lines arrive written and spoken; your replies are picked under the chat. */
export function DialogueA() {
  return <Chat prefix="da" />;
}

/** The same chat set to sound only: a harder dialogue. Mari's words show on request. */
export function DialogueC() {
  return <Chat prefix="dc" hideText />;
}

/** B: a script, one line after another, your lines picked where they stand. */
export function DialogueB() {
  const d = useDialogue("db");
  return (
    <Card title="Talk: meeting Mari" aside={<Dots results={d.results} now={YOUR_TURNS.findIndex((t) => t === d.current)} total={YOUR_TURNS.length} />}>
      <RoleCard />
      {!d.started ? (
        <Button variant="primary" onClick={d.start}>
          Start the conversation
        </Button>
      ) : (
        <ol className="m-0 grid w-full list-none gap-0 p-0">
          {DIALOGUE.slice(0, Math.min(d.at + 1, DIALOGUE.length)).map((t, i) => (
            <li key={t.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 border-b border-edge py-3 last:border-b-0 max-sm:grid-cols-1 max-sm:gap-y-1">
              <span className={clsx("pt-1 text-sm font-semibold", t.who === "mari" ? "text-ink-secondary" : "text-(--form)")}>
                {t.who === "mari" ? "Mari" : "You"}
              </span>
              {t.who === "mari" ? (
                <ScriptLine id={t.id} et={t.et} en={t.en} />
              ) : i < d.at ? (
                <ScriptLine id={t.id} et={rightReply(t)} en={t.en} />
              ) : (
                <div className="grid gap-2">
                  <span className="text-lg text-ink-faint">…</span>
                  <ScriptReplies d={d} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {d.finished && <DialogueEnd d={d} />}
    </Card>
  );
}

function ScriptLine({ id, et, en }: { id: string; et: string; en: string }) {
  const playing = usePlaying(key("db", id));
  return (
    <button type="button" onClick={() => void playSound(src(id), key("db", id))} className="flex cursor-pointer items-start gap-2.5 text-start">
      <span className={clsx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", playing ? "bg-(--form) text-plate" : "edge-lift bg-plate text-ink")}>
        {playing ? <Bars /> : <span className="ms-px text-[0.6rem]">▶</span>}
      </span>
      <span>
        <span lang="et" className="block text-lg font-medium">
          {et}
        </span>
        <span className="block text-sm text-ink-muted">{en}</span>
      </span>
    </button>
  );
}

function ScriptReplies({ d }: { d: ReturnType<typeof useDialogue> }) {
  const turn = d.current as YourTurn;
  const p = d.picks[turn.id];
  const pickedReply = p === undefined ? undefined : turn.options[p];
  return (
    <>
      <fieldset className="m-0 grid gap-2 border-0 p-0">
        <legend className="sr-only">Your line</legend>
        {turn.options.map((o, i) => (
          <Option
            key={o.et}
            lang="et"
            label={o.et}
            mark={p === undefined ? undefined : o.ok ? "right" : i === p ? "wrong" : "out"}
            onPick={() => d.pick(i)}
          />
        ))}
      </fieldset>
      {pickedReply && <Verdict right={!!pickedReply.ok}>{pickedReply.why}</Verdict>}
      {pickedReply && !pickedReply.ok && (
        <div className="flex justify-end">
          <Button variant="primary" onClick={d.proceed}>
            Say it
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      )}
    </>
  );
}
