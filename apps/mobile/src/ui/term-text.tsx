import { useLingui } from "@lingui/react/macro";
import {
  drawsReadings,
  exampleSegments,
  type KnownReadings,
  markedTerm,
  markKnownReadings,
  termReading,
  textDirection,
} from "@lymi/core";
import { type ComponentProps, type ReactNode, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { textStart } from "../theme/type";
import { Furigana } from "./furigana";
import { Text } from "./primitives";

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

/** An example, with its inline readings drawn in its language's notation: furigana, or pinyin and Jyutping for Chinese and Cantonese. */
export function ExampleText({
  text,
  known,
  translation,
  ...props
}: Omit<ComponentProps<typeof Furigana>, "segments" | "after" | "tail"> & {
  text: string;
  known?: KnownReadings | undefined;
  /**
   * The example's translation in parentheses, run on after it in its own classes, or on its own
   * line when it reads in the other direction, since a run-on would start at the wrong edge.
   */
  translation?: { text: string; className: string } | null | undefined;
}) {
  const { i18n } = useLingui();
  const { lang } = props;
  const runsOn = textDirection(lang) === textDirection(i18n.locale);
  const segments = useMemo(
    () => markKnownReadings(exampleSegments(text, lang), known, lang),
    [text, known, lang],
  );
  const own = !!translation && !runsOn;
  const sentence = (
    <Furigana
      segments={segments}
      {...props}
      tail={
        translation && runsOn
          ? { text: ` (${translation.text})`, className: translation.className, lang: i18n.locale }
          : undefined
      }
      style={[StyleSheet.flatten(props.style), textStart(lang)]}
    />
  );
  if (!own || !translation) return sentence;
  return (
    <View className="gap-1">
      {sentence}
      <Text className={translation.className} lang={i18n.locale}>
        ({translation.text})
      </Text>
    </View>
  );
}
