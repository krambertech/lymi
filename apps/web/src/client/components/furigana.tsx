import { parseReadings, type ReadingSegment } from "@lymi/core";
import { clsx } from "clsx";
import { Fragment, useMemo } from "react";

interface Props {
  segments: readonly ReadingSegment[];
  lang?: string | undefined;
  /** Keeps the readings' room but hides them, so the line stays put when they appear. */
  hidden?: boolean | undefined;
}

/** Runs of text with their readings drawn over them, as furigana over kanji. */
export function Furigana({ segments, lang, hidden }: Props) {
  return segments.map((segment, index) =>
    segment.reading === undefined ? (
      // Runs never reorder, so the index is a stable key.
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
            "transition-[opacity,visibility] duration-200 ease-out motion-reduce:transition-none",
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

interface ReadingTextProps {
  text: string;
  lang?: string | undefined;
}

/** Text that may carry inline readings, such as an example, drawn with them. */
export function ReadingText({ text, lang }: ReadingTextProps) {
  const segments = useMemo(() => parseReadings(text), [text]);
  return <Furigana segments={segments} lang={lang} />;
}
