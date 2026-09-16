import { useLingui } from "@lingui/react/macro";
import { clsx } from "clsx";
import { Play } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";

interface Card {
  term: string;
  meaning: string | null;
}

interface Props {
  cards: Card[];
  /** The language tag of the terms, so a screen reader pronounces them. */
  language?: string | null | undefined;
  /** A column drifting up beside the invitation, or a row drifting across under it. */
  direction: "up" | "across";
  className?: string | undefined;
}

/** Fewer cards than this would show the loop repeating, so they stand still instead. */
const MIN_TO_MOVE = 4;
const SECONDS_PER_CARD = { up: 7, across: 5.5 };
const GAP = { up: "1rem", across: "0.75rem" };

/**
 * A deck's cards drifting past, slowly enough to read. Hover pauses it, a tap or Enter toggles it,
 * and under reduced motion or with too few cards to loop it stands still; the row then scrolls by hand.
 */
export function CardStream({ cards, language, direction, className }: Props) {
  const { t } = useLingui();
  const [paused, setPaused] = useState(false);
  const moving = cards.length >= MIN_TO_MOVE;
  const up = direction === "up";
  const style = {
    "--stream-duration": `${cards.length * SECONDS_PER_CARD[direction]}s`,
    "--stream-gap": GAP[direction],
  } as CSSProperties;

  const track = (copy: "first" | "second") => (
    <ul
      aria-label={copy === "first" ? t`Cards from this deck` : undefined}
      aria-hidden={copy === "second" || undefined}
      className={clsx(
        "flex shrink-0 gap-(--stream-gap)",
        up ? "flex-col" : "flex-row",
        // A row that scrolls by hand keeps the page's inset at both ends.
        !up && (moving ? "motion-reduce:px-5" : "px-5"),
        copy === "second" && "motion-reduce:hidden",
      )}
    >
      {cards.map((card) => (
        <li
          key={`${card.term}:${card.meaning ?? ""}`}
          className={clsx(
            // The scroller is exactly as tall as a card and an overflowing axis clips the other, so
            // the hairline sits inside rather than as an outer ring that loses its top and bottom.
            "edge-inset grid shrink-0 content-start gap-1 bg-plate",
            up
              ? "w-full rounded-lg px-6 py-5 [&:nth-child(4n+1)]:-translate-x-6 [&:nth-child(4n+3)]:translate-x-6"
              : "w-52 snap-start rounded-lg px-4.5 py-4",
          )}
        >
          <span
            lang={language ?? undefined}
            className={clsx(
              "hyphenate line-clamp-2 break-words font-medium tracking-[-0.015em]",
              up ? "text-2xl leading-[1.2]" : "text-xl leading-[1.2]",
            )}
          >
            {card.term}
          </span>
          {card.meaning && (
            <span className={clsx("line-clamp-2 text-text-2", up ? "text-md" : "text-base")}>
              {card.meaning}
            </span>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div style={style} className={clsx("stream relative", paused && "stream-paused", className)}>
      <div
        className={clsx(
          "size-full overflow-hidden",
          up &&
            "[mask-image:linear-gradient(to_bottom,transparent,black_14%,black_86%,transparent)]",
          !up && "snap-x snap-mandatory scroll-px-5",
          !up &&
            (moving
              ? "[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]"
              : "overflow-x-auto"),
        )}
      >
        {moving ? (
          <div
            className={clsx(
              "flex gap-(--stream-gap)",
              up ? "stream-up mx-auto w-full max-w-[22rem] flex-col" : "stream-across w-max",
            )}
          >
            {track("first")}
            {track("second")}
          </div>
        ) : (
          <div
            className={up ? "mx-auto grid h-full max-w-[22rem] content-center" : "mx-auto w-max"}
          >
            {track("first")}
          </div>
        )}
      </div>
      {moving && (
        <button
          type="button"
          aria-pressed={paused}
          aria-label={t`Pause the cards`}
          onClick={() => setPaused((p) => !p)}
          className="absolute inset-0 cursor-pointer rounded-lg motion-reduce:hidden"
        >
          {paused && (
            <span className="edge absolute bottom-3 end-3 grid size-8 place-items-center rounded-full bg-plate text-muted">
              <Play aria-hidden="true" strokeWidth={1.75} className="size-4" />
            </span>
          )}
        </button>
      )}
    </div>
  );
}
