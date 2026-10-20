import {
  drawsReadings,
  exampleSegments,
  type KnownReadings,
  markKnownReadings,
  termReading,
} from "@lymi/core";
import { type ComponentProps, type ReactNode, useMemo } from "react";
import { Furigana } from "./furigana";

type FuriganaProps = Omit<ComponentProps<typeof Furigana>, "segments" | "room">;

/**
 * A card's term, with its reading drawn over it when its language draws one. Without a reading it
 * is `plain` when given, else one plain `Text` in the same classes.
 */
export function TermText({
  card,
  room,
  plain,
  ...props
}: FuriganaProps & {
  card: {
    term: string;
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
  };
  /** Holds a reading's room over a term without one, so a list of terms that draw readings keeps one height. */
  room?: boolean;
  plain?: ReactNode;
}) {
  const { term, language, pronunciation } = card;
  const segments = useMemo(
    () => termReading({ term, language, pronunciation }),
    [term, language, pronunciation],
  );
  if (!segments && plain !== undefined) return plain;
  return (
    <Furigana
      segments={segments ?? [{ text: term }]}
      room={room && drawsReadings(language)}
      lang={language}
      {...props}
    />
  );
}

/** An example, with its inline readings drawn in its language's notation: furigana, or pinyin for Chinese. */
export function ExampleText({
  text,
  known,
  ...props
}: Omit<ComponentProps<typeof Furigana>, "segments"> & {
  text: string;
  known?: KnownReadings | undefined;
}) {
  const { lang } = props;
  const segments = useMemo(
    () => markKnownReadings(exampleSegments(text, lang), known, lang),
    [text, known, lang],
  );
  return <Furigana segments={segments} {...props} />;
}
