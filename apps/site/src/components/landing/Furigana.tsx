import { alignReading } from "@lymi/core/reading";
import { clsx } from "clsx";
import { Fragment } from "react";

interface Props {
  term: string;
  /** The term's reading in kana, drawn over its kanji as review draws it. */
  reading: string;
  lang?: string | undefined;
  /** Keeps the readings' room but hides them, as review does for a Known card's cue. */
  hidden?: boolean | undefined;
}

/** A Japanese term with its reading as furigana over the kanji, the product's way. */
export function Furigana({ term, reading, lang, hidden }: Props) {
  return alignReading(term, reading).map((segment, index) =>
    segment.reading === undefined ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
      <Fragment key={index}>{segment.text}</Fragment>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
      <ruby key={index} lang={lang}>
        {segment.text}
        <rp>(</rp>
        {/* Out of the accessible name, so a screen reader says the word once, as written. */}
        {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: rt is never focusable */}
        <rt
          aria-hidden="true"
          className={clsx(
            "text-[0.42em] font-normal tracking-normal transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none",
            hidden && "invisible opacity-0",
          )}
        >
          {segment.reading}
        </rt>
        <rp>)</rp>
      </ruby>
    ),
  );
}
