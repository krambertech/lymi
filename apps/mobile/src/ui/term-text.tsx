import { useLingui } from "@lingui/react/macro";
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
import { StyleSheet, View } from "react-native";
import { textStart } from "../theme/type";
import { Furigana, useFirstLineMiddle, useLineMetrics } from "./furigana";
import { INLINE_ROOM, InlineControl, RunControl } from "./inline-control";
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

/**
 * An example over its translation, with its inline readings drawn in its language's notation:
 * furigana, or pinyin and Jyutping for Chinese and Cantonese. `after` follows the last word and
 * centres on that line's letters, under any readings, as the term's speaker does.
 */
export function ExampleText({
  text,
  known,
  plain,
  translation,
  after,
  ...props
}: Omit<ComponentProps<typeof Furigana>, "segments" | "after" | "tail"> & {
  text: string;
  known?: KnownReadings | undefined;
  /** Draws the sentence as written, with no readings over it, for a learner who shows pronunciation separately. */
  plain?: boolean | undefined;
  /** The example's translation, on its own line under it in its own classes. */
  translation?: { text: string; className: string; lines?: number } | null | undefined;
  /** A 32 pt control after the example's last word, such as its speaker in review. */
  after?: ReactNode;
}) {
  const { i18n } = useLingui();
  const { lang } = props;
  const drawn = useExampleSegments(text, known, lang);
  const written = useMemo(() => [{ text: stripReadings(text, lang) }], [text, lang]);
  const segments = plain ? written : drawn;
  const { line, ruby } = useLineMetrics({ segments, ...props });
  return (
    <View className="gap-1">
      <Furigana
        segments={segments}
        {...props}
        style={[
          StyleSheet.flatten(props.style),
          textStart(lang),
          after && !ruby ? INLINE_ROOM : null,
        ]}
        after={
          !after ? undefined : ruby ? (
            <RunControl line={line} start={QUIET_START}>
              {after}
            </RunControl>
          ) : (
            // An example is reading size, where iOS already centres the button on the line.
            <InlineControl start={QUIET_START}>{after}</InlineControl>
          )
        }
      />
      {translation && (
        <Text
          className={translation.className}
          lang={i18n.locale}
          numberOfLines={translation.lines}
        >
          {translation.text}
        </Text>
      )}
    </View>
  );
}

/** The room before the example's speaker, whose bare glyph already sits inside its 32 pt box. */
const QUIET_START = 4;

/** The speaker's drawn height, whose box the card page centres on the example's first line. */
export const EXAMPLE_END_BOX = 32;

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

/**
 * Where the middle of an example's first line sits from the top of `ExampleText`, for a control
 * beside it that `ExampleText` does not hold, such as the card page's speaker outside its edit button.
 */
export function useExampleFirstLine({
  text,
  known,
  ...props
}: Pick<
  ComponentProps<typeof ExampleText>,
  "text" | "known" | "lang" | "className" | "style" | "maxFontSizeMultiplier"
>) {
  const segments = useExampleSegments(text, known, props.lang);
  return useFirstLineMiddle({ segments, ...props });
}
