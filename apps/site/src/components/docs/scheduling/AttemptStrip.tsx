import type { DayTile } from "@lymi/core/simulation";
import { clsx } from "clsx";
import { CornerDownLeft, Sunrise, X } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";

type Kind = DayTile["kind"];

const KIND: Record<Kind, { name: string; stripe: string }> = {
  review: { name: "Review", stripe: "bg-state-known" },
  unseen: { name: "New card", stripe: "bg-state-new" },
  return: { name: "Return", stripe: "bg-state-learning" },
  carry: { name: "Left from yesterday", stripe: "bg-state-learning" },
};

function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  if (kind === "return") return <CornerDownLeft className={className} aria-hidden="true" />;
  if (kind === "carry") return <Sunrise className={className} aria-hidden="true" />;
  return null;
}

interface Props {
  tiles: DayTile[];
  /** Cards to ring from the start, such as the ones a stopped review left waiting. */
  marked?: ReadonlySet<number>;
  label: string;
}

/**
 * One tile per attempt, in order. A card keeps its number all day, so a return reads as the same
 * number coming back. Pointing at, tapping or focusing a tile lights every attempt at that card.
 * The strip is one tab stop, and the arrow keys move along it.
 */
export function AttemptStrip({ tiles, marked, label }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const [focus, setFocus] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  const move = (e: KeyboardEvent<HTMLButtonElement>, from: number) => {
    const columns = list.current
      ? getComputedStyle(list.current).gridTemplateColumns.split(" ").length
      : 10;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns, ArrowUp: -columns }[e.key];
    const to = e.key === "Home" ? 0 : e.key === "End" ? tiles.length - 1 : from + (step ?? 0);
    if (to === from || to < 0 || to >= tiles.length) return;
    e.preventDefault();
    setFocus(to);
    list.current?.querySelectorAll("button")[to]?.focus();
  };

  return (
    <ol
      ref={list}
      aria-label={label}
      className="grid list-none grid-cols-5 gap-1.5 !ps-0 sm:grid-cols-10"
      onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
    >
      {tiles.map((t, i) => {
        const lit = active === null ? marked?.has(t.card) : active === t.card;
        const dim = active !== null && active !== t.card;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: an attempt is its position in the day
          <li key={i} className="!m-0 grid">
            <button
              type="button"
              tabIndex={focus === i ? 0 : -1}
              aria-label={`Attempt ${i + 1}: card ${t.card}, ${KIND[t.kind].name.toLowerCase()}${t.missed ? ", missed" : ""}${marked?.has(t.card) ? ", waiting to return" : ""}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(t.card)}
              onClick={() => setActive(t.card)}
              onFocus={() => {
                setFocus(i);
                setActive(t.card);
              }}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => move(e, i)}
              className={clsx(
                "relative grid aspect-[5/4] min-h-11 cursor-default place-items-center overflow-hidden rounded-xs bg-plate-2",
                lit && "bg-hover shadow-[0_0_0_1.5px_var(--text)]",
                dim && "opacity-40",
              )}
            >
              <span aria-hidden="true" className="text-sm font-medium tabular-nums text-text">
                {t.card}
              </span>
              {t.missed && (
                <X
                  aria-hidden="true"
                  strokeWidth={2.5}
                  className="absolute start-1 top-1 size-3 text-grade-forgot"
                />
              )}
              <KindIcon
                kind={t.kind}
                className="absolute end-1 top-1 size-3 text-state-learning-text"
              />
              <span
                aria-hidden="true"
                className={clsx("absolute inset-x-0 bottom-0 h-1", KIND[t.kind].stripe)}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** What the stripes and marks on a tile mean. */
export function StripLegend({ kinds }: { kinds: Kind[] }) {
  return (
    <ul className="mt-4 flex list-none flex-wrap gap-x-5 gap-y-2 !ps-0 text-xs text-muted">
      {kinds.map((kind) => (
        <li key={kind} className="!m-0 flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="relative grid size-4 place-items-center overflow-hidden rounded-[3px] bg-plate-2"
          >
            <KindIcon kind={kind} className="size-2.5 text-state-learning-text" />
            <span className={clsx("absolute inset-x-0 bottom-0 h-[3px]", KIND[kind].stripe)} />
          </span>
          {KIND[kind].name}
        </li>
      ))}
      <li className="!m-0 flex items-center gap-1.5">
        <X aria-hidden="true" strokeWidth={2.5} className="size-3 text-grade-forgot" />
        Missed
      </li>
    </ul>
  );
}
