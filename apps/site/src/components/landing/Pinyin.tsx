import { pinyinTermReading } from "@lymi/core/pinyin";
import { clsx } from "clsx";
import { Fragment } from "react";

interface Props {
  term: string;
  /** The term's pinyin, as a card holds it: "yínháng" or "yín háng". */
  pinyin: string;
  /** Hides every syllable, or the ones whose index among the drawn syllables it returns true for. */
  hidden?: boolean | ((index: number) => boolean) | undefined;
  /** Lights the syllables it returns true for. */
  lit?: ((index: number) => boolean) | undefined;
  rt?: string | undefined;
}

/** Hanzi with pinyin over each character, aligned the way the product draws a Chinese term. */
export function Pinyin({ term, pinyin, hidden, lit, rt }: Props) {
  const segments = pinyinTermReading(term, pinyin) ?? [{ text: term }];
  let drawn = 0;
  return segments.map((segment, index) => {
    if (segment.reading === undefined) {
      // biome-ignore lint/suspicious/noArrayIndexKey: segments in a fixed order
      return <Fragment key={index}>{segment.text}</Fragment>;
    }
    const at = drawn++;
    const gone = typeof hidden === "function" ? hidden(at) : hidden;
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey: segments in a fixed order
      <ruby key={index}>
        {segment.text}
        <rp>(</rp>
        {/* Out of the accessible name, so a screen reader says the word once, as written. */}
        {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: rt is never focusable */}
        <rt
          aria-hidden="true"
          className={clsx(
            "text-[max(0.36em,10px)] font-normal tracking-normal transition-[opacity,visibility,color] duration-500 ease-out motion-reduce:transition-none",
            lit?.(at) ? "text-amber-text" : "text-text-2",
            gone && "invisible opacity-0",
            rt,
          )}
        >
          {segment.reading}
        </rt>
        <rp>)</rp>
      </ruby>
    );
  });
}
