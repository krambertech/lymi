import { Trans, useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { X } from "lucide-react";
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { playSound } from "../../lib/learn/player";
import {
  lineReducer,
  orderMatches,
  orderTiles,
  sentenceEnd,
  sentenceWords,
} from "../../lib/learn/practice";
import { Button } from "../Button";
import { fromKeyboard, targetAt, useLift } from "./lift";
import { Feedback, type RoundProps, useAutoplay, useNudge } from "./Quiz";
import { Listen } from "./Sound";

export interface OrderItem {
  /** Every right order, as sentences. The first is shown when the learner's order was wrong. */
  answers: readonly string[];
  /** The sentence, recorded; it plays after Check. */
  src: string;
  /**
   * What the sentence means, in the reader's language. With it, the learner builds from the meaning
   * and hears the sentence only after Check; without it, they listen first.
   */
  meaning?: ReactNode;
  /** The tiles, when the first answer's words can't be: a name at the start, say. */
  tiles?: readonly string[];
  /** Tiles that belong in no right order. */
  spare?: readonly string[];
  /** A line after the answer, such as why the verb comes second. */
  explain?: ReactNode;
}

/** Where a tile dragged to the point would land among the line's other tiles. */
function landingIndex(line: HTMLElement, x: number, y: number): number {
  const tiles = [...line.querySelectorAll<HTMLElement>("[data-at]")];
  return tiles.filter((tile) => {
    const box = tile.getBoundingClientRect();
    if (y > box.bottom) return true;
    return y >= box.top && x > box.left + box.width / 2;
  }).length;
}

/**
 * Build a sentence from word tiles, heard or from its meaning. Tap a tile to add it, tap it in the
 * sentence to take it back, drag to reorder, or move it with the arrow keys. Check accepts every
 * order the item lists, then plays the sentence.
 */
export function OrderRound({ item, state, heard, answer, autoplay }: RoundProps<OrderItem>) {
  const { t } = useLingui();
  const { nudge, note: listenNote } = useNudge();
  const round = state.status === "asking" || state.status === "answered" ? state.round : -1;
  const fromMeaning = item.meaning !== undefined;
  useAutoplay(item.src, autoplay && !fromMeaning, round);
  // biome-ignore lint/correctness/useExhaustiveDependencies: each round built from its meaning opens answerable
  useEffect(() => {
    if (fromMeaning) heard();
  }, [fromMeaning, round]);

  const tiles = item.tiles
    ? [...item.tiles, ...(item.spare ?? [])]
    : orderTiles(item.answers, item.spare);
  // The bank lists tiles alphabetically, so it never gives the order away, and stays put as tiles
  // leave it.
  const bank = tiles
    .map((word, tile) => ({ word, tile }))
    .sort((a, b) => a.word.localeCompare(b.word, "et"));
  const [line, dispatch] = useReducer(lineReducer, []);
  const [note, setNote] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [landing, setLanding] = useState<number | null>(null);
  const lineRef = useRef<HTMLFieldSetElement>(null);
  const focusTile = useRef<number | null>(null);
  const done = state.status === "answered";
  const words = line.map((tile) => tiles[tile] ?? "");
  const end = sentenceEnd(item.answers[0] ?? "");

  // Arrow keys keep focus on the tile they move.
  useEffect(() => {
    if (focusTile.current === null) return;
    lineRef.current
      ?.querySelector<HTMLButtonElement>(`[data-tile="${focusTile.current}"]`)
      ?.focus({ preventScroll: true });
    focusTile.current = null;
  });

  const ready = () => {
    if (state.status === "asking" && !state.heard) {
      nudge();
      return false;
    }
    return true;
  };
  const add = (tile: number, at?: number) => {
    if (done || !ready()) return;
    dispatch({ type: "added", tile, ...(at === undefined ? {} : { at }) });
    setNote(null);
    const word = tiles[tile] ?? "";
    setSaid(t`${word} added`);
  };
  const remove = (tile: number) => {
    if (done) return;
    dispatch({ type: "removed", tile });
    const word = tiles[tile] ?? "";
    setSaid(t`${word} taken out`);
  };
  const move = (tile: number, to: number) => {
    if (done) return;
    dispatch({ type: "moved", tile, to });
    const word = tiles[tile] ?? "";
    const place = to + 1;
    setSaid(t`${word}, word ${place}`);
  };

  const { lift, start, handlers } = useLift<number>({
    disabled: done,
    onTap: (tile) => (line.includes(tile) ? remove(tile) : add(tile)),
    onMove: (_, x, y) =>
      setLanding(
        targetAt(x, y, "data-line") !== null && lineRef.current
          ? landingIndex(lineRef.current, x, y)
          : null,
      ),
    onDrop: (tile, x, y) => {
      setLanding(null);
      const onLine = targetAt(x, y, "data-line") !== null && lineRef.current;
      if (!onLine) return line.includes(tile) && remove(tile);
      const at = landingIndex(lineRef.current as HTMLElement, x, y);
      if (line.includes(tile)) move(tile, at);
      else add(tile, at);
    },
  });
  const lifted = lift?.moved ? lift.value : null;
  const shown = line.filter((tile) => tile !== lifted);

  const check = () => {
    if (done || !ready()) return;
    if (line.length === 0) return setNote(t`Tap the words in order first.`);
    if (!item.spare?.length && line.length < tiles.length) return setNote(t`Use every word.`);
    answer(words.join(" "), orderMatches(words, item.answers));
    void playSound(item.src);
  };

  const right = done && state.right;
  // Once right, the other orders that also work; once wrong, the ones besides the order shown.
  const builtOrder = words.join(" ").toLowerCase();
  const others = right
    ? item.answers.filter((other) => sentenceWords(other).join(" ").toLowerCase() !== builtOrder)
    : item.answers.slice(1);
  return (
    <>
      {fromMeaning ? (
        <div className="grid gap-1">
          <p className="text-sm text-ink-muted">
            <Trans>Say it in Estonian:</Trans>
          </p>
          <p className="text-xl font-medium">{item.meaning}</p>
        </div>
      ) : (
        <Listen src={item.src} onPlay={heard} />
      )}
      {listenNote}
      <fieldset
        ref={lineRef}
        data-line=""
        className={clsx(
          "relative m-0 flex min-h-16 w-full min-w-0 flex-wrap items-center gap-2 border-x-0 border-t-0 border-b-2 p-0 pb-2.5 transition-colors duration-150",
          done
            ? right
              ? "border-success"
              : "border-danger border-dashed"
            : landing !== null
              ? "border-(--form)"
              : "border-dashed border-ink-faint",
        )}
      >
        <legend className="sr-only">{t`Your sentence`}</legend>
        {shown.length === 0 && landing === null && (
          <span className="text-md text-ink-muted">
            <Trans>Tap the words in order</Trans>
          </span>
        )}
        {line.map((tile) => {
          // A dragged tile stays mounted, out of the flow, so its pointer capture lasts the drag.
          const away = tile === lifted;
          const i = shown.indexOf(tile);
          return (
            <Fragment key={tile}>
              {!away && landing === i && <Slot />}
              <button
                type="button"
                data-tile={tile}
                data-at={away ? undefined : i}
                data-mark={done ? (right ? "right" : "wrong") : undefined}
                aria-disabled={done || undefined}
                onPointerDown={start(tile)}
                {...handlers}
                onClick={(event) => fromKeyboard(event) && remove(tile)}
                onKeyDown={(event: KeyboardEvent) => {
                  if (done) return;
                  const step = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
                  if (!step) return;
                  event.preventDefault();
                  focusTile.current = tile;
                  move(tile, Math.max(0, i + step));
                }}
                className={clsx(
                  tileClass(done),
                  away && "pointer-events-none absolute start-0 top-0 opacity-0",
                )}
              >
                {tiles[tile]}
              </button>
            </Fragment>
          );
        })}
        {landing !== null && landing >= shown.length && <Slot />}
        {shown.length > 0 && (
          <span aria-hidden="true" className="-ms-1.5 text-2xl font-semibold">
            {end}
          </span>
        )}
      </fieldset>
      {!done && (
        <div className="grid w-full gap-2 rounded-lg bg-plate-nested p-3">
          <p className="text-sm text-ink-muted">
            <Trans>Tap a word to add it; drag or use the arrow keys to move it.</Trans>
          </p>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {bank.map(({ word, tile }) => (
              <li key={tile}>
                {line.includes(tile) ? (
                  <span
                    aria-hidden="true"
                    lang="et"
                    className="block rounded-tile border border-dashed border-edge-strong px-3.5 py-1.5 text-xl font-semibold tracking-tight text-transparent select-none"
                  >
                    {word}
                  </span>
                ) : (
                  <button
                    type="button"
                    lang="et"
                    onPointerDown={start(tile)}
                    {...handlers}
                    onClick={(event) => fromKeyboard(event) && add(tile)}
                    className={clsx(
                      tileClass(false),
                      lifted === tile && "border-dashed text-transparent",
                    )}
                  >
                    {word}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {lift?.moved && (
        <span
          aria-hidden="true"
          lang="et"
          className="learn-lifted rounded-tile border border-(--form) bg-plate px-3.5 py-1.5 text-xl font-semibold tracking-tight"
          style={{ left: lift.x - lift.dx, top: lift.y - lift.dy }}
        >
          {tiles[lift.value]}
        </span>
      )}
      <p aria-live="polite" className="sr-only">
        {said}
      </p>
      {note && (
        <p role="status" className="text-sm text-ink-muted">
          {note}
        </p>
      )}
      {done ? (
        <div className="grid w-full gap-2.5">
          {right ? (
            <Feedback right>{item.explain}</Feedback>
          ) : (
            <p className="flex items-start gap-2 font-medium text-danger">
              <X aria-hidden="true" className="mt-1 size-4 shrink-0" strokeWidth={2.5} />
              <span>
                <Trans>
                  It was{" "}
                  <b lang="et" className="font-semibold text-ink">
                    {item.answers[0]}
                  </b>
                </Trans>{" "}
                {item.explain && (
                  <span className="font-normal text-ink-secondary">{item.explain}</span>
                )}
              </span>
            </p>
          )}
          {others.length > 0 && (
            <div className="text-md text-ink-secondary">
              <Trans>Also right:</Trans>{" "}
              {others.map((other, i) => (
                <Fragment key={other}>
                  {i > 0 && " · "}
                  <span lang="et" className="font-medium text-ink">
                    {other}
                  </span>
                </Fragment>
              ))}
            </div>
          )}
          {fromMeaning && <Listen src={item.src}>{t`Hear it`}</Listen>}
        </div>
      ) : (
        <div className="flex w-full justify-end">
          <Button variant="primary" onClick={check}>
            <Trans>Check</Trans>
          </Button>
        </div>
      )}
    </>
  );
}

function Slot() {
  return <span aria-hidden="true" className="learn-slot h-11 w-14 rounded-tile" />;
}

const tileClass = (done: boolean) =>
  clsx(
    "learn-answer rounded-tile border border-edge-strong bg-plate px-3.5 py-1.5 text-xl font-semibold tracking-tight select-none",
    !done &&
      "cursor-grab touch-none transition-[background-color,scale] duration-150 active:scale-[0.97] hoverable:hover:bg-plate-hover",
  );
