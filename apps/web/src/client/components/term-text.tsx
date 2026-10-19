import {
  drawsReadings,
  type KnownReadings,
  markKnownReadings,
  parseReadings,
  termReading,
} from "@lymi/core";
import { useMemo } from "react";
import { Furigana } from "./furigana";

interface TermTextProps {
  card: {
    term: string;
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
  };
  /** Keeps the reading's room but hides it, as on the cue of a Known card. */
  hidden?: boolean | undefined;
  /** Holds a reading's room over a term without one, so a list of terms that draw readings keeps one height. */
  room?: boolean | undefined;
}

/** A card's term, with its reading drawn over it when its language draws one, else as plain text. */
export function TermText({ card, hidden, room }: TermTextProps) {
  const { term, language, pronunciation } = card;
  const segments = useMemo(
    () => termReading({ term, language, pronunciation }),
    [term, language, pronunciation],
  );
  const lang = language ?? undefined;
  if (segments) return <Furigana segments={segments} lang={lang} hidden={hidden} />;
  if (room && drawsReadings(language))
    return <Furigana segments={[{ text: term, reading: " " }]} lang={lang} hidden />;
  return term;
}

interface ExampleTextProps {
  text: string;
  lang?: string | undefined;
  /** The learner's Known pairs, whose readings fade. */
  known?: KnownReadings | undefined;
}

/** An example, with its inline readings drawn; furigana is the only engine until a second language has one. */
export function ExampleText({ text, lang, known }: ExampleTextProps) {
  const segments = useMemo(() => markKnownReadings(parseReadings(text), known), [text, known]);
  return <Furigana segments={segments} lang={lang} />;
}
