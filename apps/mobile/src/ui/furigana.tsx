import { parseReadings, type ReadingSegment } from "@lymi/core";
import { READING_FADE } from "@lymi/design";
import { type ReactNode, useEffect, useMemo } from "react";
import { StyleSheet, type TextStyle, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useResolveClassNames } from "uniwind";
import { timed, useReduceMotion } from "../theme/motion";
import { fitType } from "../theme/type";
import { furiganaBoxes, spokenReading } from "./furigana-boxes";
import { Text } from "./primitives";

interface Props {
  segments: readonly ReadingSegment[];
  lang?: string | null | undefined;
  /** Keeps the readings' room but hides them, so the line stays put when they appear. */
  hidden?: boolean;
  /** The text's size, weight and colour, as `Text` takes them; the readings follow its size. */
  className?: string;
  style?: TextStyle | (TextStyle | null | undefined)[];
  maxFontSizeMultiplier?: number;
  /** Drawn on the last line after the last run, such as a term's other forms or the speaker. */
  after?: ReactNode;
  /** At most this many lines; the rest is cut. */
  lines?: number;
  /** Holds a reading's room over text without one, so a list of Japanese terms keeps one height. */
  room?: boolean;
  accessibilityRole?: "header" | "text";
}

/**
 * Runs of text with their readings drawn over them, as furigana over kanji. React Native has no
 * ruby, so each run is a column, its reading over its text, and the columns wrap as a line would.
 * phone.md "Components".
 */
export function Furigana({
  segments,
  lang,
  hidden = false,
  className,
  style,
  maxFontSizeMultiplier,
  after,
  lines,
  room = false,
  accessibilityRole = "text",
}: Props) {
  const drawn = room || segments.some((segment) => segment.reading !== undefined);
  const boxes = useMemo(() => (drawn ? furiganaBoxes(segments) : []), [drawn, segments]);
  const { fontScale } = useWindowDimensions();
  const resolved = useResolveClassNames(className ?? "");
  const flat = StyleSheet.flatten([resolved, style]);
  const size = flat.fontSize ?? 17;
  const scale = fitType(size, fontScale, maxFontSizeMultiplier).drawn / size;
  // Half the text's drawn size and never under 10 pt, as the web's `rt`.
  const readingSize = Math.max(10, (size * scale) / 2);
  const slot = Math.ceil(readingSize * 1.2);
  const pitch = slot + Math.ceil((flat.lineHeight ?? size * 1.2) * scale);

  const reduce = useReduceMotion();
  const shown = useSharedValue(hidden ? 0 : 1);
  useEffect(() => {
    shown.value = reduce ? (hidden ? 0 : 1) : withTiming(hidden ? 0 : 1, timed(READING_FADE));
  }, [hidden, reduce, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));

  const text = segments.map((segment) => segment.text).join("");
  if (!drawn) {
    return (
      <Text
        className={className}
        style={style}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        numberOfLines={lines}
        lang={lang}
        accessibilityRole={accessibilityRole}
      >
        {text}
        {after}
      </Text>
    );
  }

  const base = (run: string) => (
    <Text
      className={className}
      style={style}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      lang={lang}
    >
      {run}
    </Text>
  );
  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={spokenReading(segments, !hidden)}
      accessibilityLanguage={lang ?? undefined}
      className="flex-row flex-wrap"
      style={lines ? { maxHeight: pitch * lines, overflow: "hidden" } : undefined}
    >
      {boxes.map((box, i) => (
        // Boxes never reorder, so the index is a stable key.
        // biome-ignore lint/suspicious/noArrayIndexKey: boxes in a fixed order
        <View key={i} className="shrink flex-row items-end">
          {box.map((run, j) =>
            run.reading === undefined ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
              <View key={j} className="shrink" style={{ paddingTop: slot }}>
                {base(run.text)}
              </View>
            ) : (
              // A reading wider than its kanji centres over them, as the web's ruby does.
              // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
              <View key={j} className="shrink items-center">
                <Animated.View style={fade}>
                  <Text
                    className="text-text-2"
                    style={{
                      fontSize: readingSize,
                      lineHeight: slot,
                      fontWeight: "400",
                      letterSpacing: 0,
                    }}
                    allowFontScaling={false}
                    numberOfLines={1}
                    lang={lang}
                  >
                    {run.reading}
                  </Text>
                </Animated.View>
                {base(run.text)}
              </View>
            ),
          )}
          {i === boxes.length - 1 && after ? (
            <View style={{ paddingTop: slot }}>{after}</View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** Text that may carry inline readings, such as an example, drawn with them. */
export function ReadingText({ text, ...props }: Omit<Props, "segments"> & { text: string }) {
  const segments = useMemo(() => parseReadings(text), [text]);
  return <Furigana segments={segments} {...props} />;
}
