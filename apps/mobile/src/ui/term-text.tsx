import {
  drawsReadings,
  type KnownReadings,
  markKnownReadings,
  parseReadings,
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

/** An example, with its inline readings drawn; furigana is the only engine until a second language has one. */
export function ExampleText({
  text,
  known,
  ...props
}: Omit<ComponentProps<typeof Furigana>, "segments"> & {
  text: string;
  known?: KnownReadings | undefined;
}) {
  const segments = useMemo(() => markKnownReadings(parseReadings(text), known), [text, known]);
  return <Furigana segments={segments} {...props} />;
}
