import {
  drawsReadings,
  exampleSegments,
  type KnownReadings,
  markedTerm,
  markKnownReadings,
  termReading,
} from "@lymi/core";
import { type ComponentProps, type ReactNode, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { useResolveClassNames } from "uniwind";
import { fitType, textStart } from "../theme/type";
import { Furigana } from "./furigana";
import { INLINE_ROOM, InlineControl, RunControl } from "./inline-control";

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
  control,
  ...props
}: Omit<ComponentProps<typeof Furigana>, "segments" | "after"> & {
  text: string;
  known?: KnownReadings | undefined;
  /** A 32 pt button after the last word, such as the example's speaker, centred on its line. */
  control?: ReactNode;
}) {
  const { lang } = props;
  const segments = useMemo(
    () => markKnownReadings(exampleSegments(text, lang), known, lang),
    [text, known, lang],
  );
  const { fontScale } = useWindowDimensions();
  const flat = StyleSheet.flatten([useResolveClassNames(props.className ?? ""), props.style]);
  const size = flat.fontSize ?? 17;
  const drawn = fitType(size, fontScale, props.maxFontSizeMultiplier).drawn;
  const ruby = segments.some((segment) => segment.reading !== undefined);
  const after =
    control &&
    (ruby ? (
      <RunControl line={Math.round(((flat.lineHeight ?? size * 1.2) * drawn) / size)}>
        {control}
      </RunControl>
    ) : (
      <InlineControl>{control}</InlineControl>
    ));
  return (
    <Furigana
      segments={segments}
      {...props}
      after={after}
      style={[
        StyleSheet.flatten(props.style),
        textStart(lang),
        control && !ruby ? INLINE_ROOM : null,
      ]}
    />
  );
}
