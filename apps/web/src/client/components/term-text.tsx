import {
  drawsReadings,
  exampleSegments,
  type KnownReadings,
  markedTerm,
  markKnownReadings,
  termReading,
  textDirection,
} from "@lymi/core";
import { useMemo } from "react";
import { Furigana } from "./furigana";

interface TermTextProps {
  card: {
    term: string;
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
  };
  /** Keeps the reading's room but hides it, or draws the term without its stress marks, as on the cue of a Known card. */
  hidden?: boolean | undefined;
  /** Holds a reading's room over a term without one, so a list of terms that draw readings keeps one height. */
  room?: boolean | undefined;
}

/**
 * A card's term, with its reading drawn over it or its stress marked in place when its language
 * does either, else as plain text.
 */
export function TermText({ card, hidden, room }: TermTextProps) {
  // Its own direction isolates the term, so an Arabic one keeps its order inside an English line.
  return (
    <span lang={card.language ?? undefined} dir={textDirection(card.language)}>
      <TermRuns card={card} hidden={hidden} room={room} />
    </span>
  );
}

function TermRuns({ card, hidden, room }: TermTextProps) {
  const { term, language, pronunciation } = card;
  const segments = useMemo(
    () => termReading({ term, language, pronunciation }),
    [term, language, pronunciation],
  );
  const marked = useMemo(
    () => markedTerm({ term, language, pronunciation }),
    [term, language, pronunciation],
  );
  const lang = language ?? undefined;
  if (segments) return <Furigana segments={segments} lang={lang} hidden={hidden} />;
  if (marked !== null) return hidden ? term : marked;
  if (room && drawsReadings(language))
    return <Furigana segments={[{ text: term, reading: "\u00a0" }]} lang={lang} hidden />;
  return term;
}

interface ExampleTextProps {
  text: string;
  lang?: string | undefined;
  /** The learner's Known pairs, whose readings fade. */
  known?: KnownReadings | undefined;
}

/** An example, with its inline readings drawn in its language's notation: furigana, or pinyin and Jyutping for Chinese and Cantonese. */
export function ExampleText({ text, lang, known }: ExampleTextProps) {
  const segments = useMemo(
    () => markKnownReadings(exampleSegments(text, lang), known, lang),
    [text, known, lang],
  );
  return (
    <span lang={lang} dir={textDirection(lang)}>
      <Furigana segments={segments} lang={lang} />
    </span>
  );
}
