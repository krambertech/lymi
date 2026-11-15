import {
  drawsReadings,
  exampleSegments,
  type KnownReadings,
  markedTerm,
  markKnownReadings,
  stripReadings,
  termReading,
} from "@lymi/core";
import { type ComponentProps, type ReactNode, useMemo } from "react";
import { StyleSheet } from "react-native";
import { textStart } from "../theme/type";
import { Furigana } from "./furigana";

type FuriganaProps = Omit<ComponentProps<typeof Furigana>, "segments" | "room">;

/**
 * A card's term, with its reading drawn over it or its stress marked in place when its language
 * does either. Without a reading over it, it is `plain` of the text when given, else one plain
 * `Text` in the same classes; `hidden` draws it without its stress, as on a Known card's cue.
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
  plain?: (text: string) => ReactNode;
}) {
  const { term, language, pronunciation } = card;
  const segments = useMemo(
    () => termReading({ term, language, pronunciation }),
    [term, language, pronunciation],
  );
  const marked = useMemo(
    () => markedTerm({ term, language, pronunciation }),
    [term, language, pronunciation],
  );
  const text = marked !== null && !props.hidden ? marked : term;
  if (!segments && plain !== undefined) return plain(text);
  return (
    <Furigana
      segments={segments ?? [{ text }]}
      room={room && drawsReadings(language)}
      lang={language}
      {...props}
    />
  );
}

/**
 * An example, with its inline readings drawn in its language's notation: furigana, or pinyin and
 * Jyutping for Chinese and Cantonese.
 */
export function ExampleText({
  text,
  known,
  plain,
  ...props
}: Omit<ComponentProps<typeof Furigana>, "segments" | "after" | "tail"> & {
  text: string;
  known?: KnownReadings | undefined;
  /** Draws the sentence as written, with no readings over it, for a learner who shows pronunciation separately. */
  plain?: boolean | undefined;
}) {
  const { lang } = props;
  const drawn = useExampleSegments(text, known, lang);
  const written = useMemo(() => [{ text: stripReadings(text, lang) }], [text, lang]);
  return (
    <Furigana
      segments={plain ? written : drawn}
      {...props}
      style={[StyleSheet.flatten(props.style), textStart(lang)]}
    />
  );
}

function useExampleSegments(
  text: string,
  known: KnownReadings | undefined,
  lang: string | null | undefined,
) {
  return useMemo(
    () => markKnownReadings(exampleSegments(text, lang), known, lang),
    [text, known, lang],
  );
}
