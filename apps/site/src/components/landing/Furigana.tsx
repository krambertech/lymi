import { alignReading, lettersReading } from "@lymi/core/reading";
import { clsx } from "clsx";
import { Fragment } from "react";
import { Pinyin } from "./Pinyin";

interface Props {
  term: string;
  /** The term's reading, kana or pinyin, drawn over its characters as review draws it. */
  reading: string;
  lang?: string | undefined;
  /** Keeps the readings' room but hides them, as review does for a Known card's cue. */
  hidden?: boolean | undefined;
}

/** A term with its reading over its characters: furigana over kanji, pinyin over hanzi. */
export function Furigana({ term, reading, lang, hidden }: Props) {
  // A reading in letters is pinyin, one syllable over each character; kana runs align to the kanji.
  if (lettersReading(reading)) return <Pinyin term={term} pinyin={reading} hidden={hidden} />;
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
            "text-[0.45em] font-normal tracking-normal text-text-2 transition-[opacity,visibility] duration-500 ease-out motion-reduce:transition-none",
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
