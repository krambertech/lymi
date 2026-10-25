import {
  lettersReading,
  type ReadingSegment,
  saysReading,
  textDirection,
  toneRuns,
} from "@lymi/core";
import { READING_FADE } from "@lymi/design";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  I18nManager,
  type LayoutChangeEvent,
  StyleSheet,
  type TextStyle,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useResolveClassNames } from "uniwind";
import { timed, useReduceMotion } from "../theme/motion";
import { fitType } from "../theme/type";
import {
  clampBoxes,
  type Frame,
  furiganaBoxes,
  readingInset,
  spokenReading,
} from "./furigana-boxes";
import { Text } from "./primitives";

interface Props {
  segments: readonly ReadingSegment[];
  lang?: string | null | undefined;
  /** Fades the readings in and out in place, keeping their room; only a review cue passes it. */
  hidden?: boolean | undefined;
  /** The text's size, weight and colour, as `Text` takes them; the readings follow its size. */
  className?: string;
  style?: TextStyle | (TextStyle | null | undefined)[];
  maxFontSizeMultiplier?: number;
  /** Text that flows after the runs and wraps with them, in its own classes with its size: a term's other forms or an example's translation. */
  tail?: { text: string; className: string; lang?: string | undefined } | undefined;
  /** Kept beside the last run, past any cut: the speaker, or an important card's ★. */
  after?: ReactNode;
  /** At most this many lines; the rest gives way to an ellipsis. */
  lines?: number;
  /** Holds a reading's room over text without one, so a list of Japanese terms keeps one height. */
  room?: boolean;
  accessibilityRole?: "header" | "text";
}

/**
 * Runs of text with their readings drawn over them, as furigana over kanji. React Native has no
 * ruby, so each run is a column, its reading over its text, and the columns wrap as a line would.
 * Text with no reading to draw stays one plain `Text`. phone.md "Components".
 */
export function Furigana(props: Props) {
  const { segments, room, tail, after, lines, className, style, lang } = props;
  if (room || segments.some((segment) => segment.reading !== undefined)) {
    return props.hidden === undefined ? <Ruby {...props} /> : <FadingRuby {...props} />;
  }
  return (
    <Text
      className={className}
      style={style}
      maxFontSizeMultiplier={props.maxFontSizeMultiplier}
      numberOfLines={lines}
      lang={lang}
      accessibilityRole={props.accessibilityRole ?? "text"}
    >
      {segments.map((segment) => segment.text).join("")}
      {tail && (
        <Text className={tail.className} lang={tail.lang ?? lang}>
          {tail.text}
        </Text>
      )}
      {after}
    </Text>
  );
}

/** The readings fade as `hidden` changes, as the web's `rt` does at the reveal. */
function FadingRuby(props: Props) {
  const reduce = useReduceMotion();
  const target = props.hidden ? 0 : 1;
  const shown = useSharedValue(target);
  useEffect(() => {
    shown.value = reduce ? target : withTiming(target, timed(READING_FADE));
  }, [target, reduce, shown]);
  const fade = useAnimatedStyle(() => ({ opacity: shown.value }));
  return <Ruby {...props} fade={fade} />;
}

/** The largest a reading in letters is drawn, the lede's size, so a big cue's pinyin stays quiet. */
const LETTERS_MAX = 15.5;

/** The sizes a run of text and its readings are drawn at, with the room the readings take over it. */
function useRubyMetrics(
  segments: readonly ReadingSegment[],
  className: string | undefined,
  style: Props["style"],
  maxFontSizeMultiplier: number | undefined,
) {
  const { fontScale } = useWindowDimensions();
  const resolved = useResolveClassNames(className ?? "");
  const flat = StyleSheet.flatten([resolved, style]);
  const size = flat.fontSize ?? 17;
  const drawn = fitType(size, fontScale, maxFontSizeMultiplier).drawn;
  // Half the text's drawn size and never under 10 pt, as the web's `rt`; letters 0.4 of it, capped at the lede.
  const letters = segments.some((segment) => segment.reading && lettersReading(segment.reading));
  const readingSize = letters
    ? Math.min(
        Math.max(10, drawn * 0.4),
        fitType(LETTERS_MAX, fontScale, maxFontSizeMultiplier).drawn,
      )
    : Math.max(10, drawn / 2);
  const slot = Math.ceil(readingSize * 1.2);
  const line = Math.ceil(((flat.lineHeight ?? size * 1.2) * drawn) / size);
  return { drawn, readingSize, slot, line };
}

type LineProps = Pick<Props, "segments" | "room" | "className" | "style" | "maxFontSizeMultiplier">;

/** How `Furigana` will draw its text: its drawn size, each line's height, and whether readings sit over it. */
export function useLineMetrics({
  segments,
  room,
  className,
  style,
  maxFontSizeMultiplier,
}: LineProps) {
  const { drawn, slot, line } = useRubyMetrics(segments, className, style, maxFontSizeMultiplier);
  const ruby = !!room || segments.some((segment) => segment.reading !== undefined);
  return { drawn, slot, line, ruby };
}

/**
 * How far down from the top of `Furigana` the middle of its first line of text sits, under any
 * readings, so a control beside a wrapping text can centre on that line.
 */
export function useFirstLineMiddle(props: LineProps) {
  const { slot, line, ruby } = useLineMetrics(props);
  return (ruby ? slot : 0) + line / 2;
}

/** A Jyutping tone number's size against its syllable's. */
const TONE_SCALE = 0.7;

/** An ellipsis is about one em across in either face. */
const ELLIPSIS_EM = 1;

function Ruby({
  segments,
  lang,
  hidden = false,
  className,
  style,
  maxFontSizeMultiplier,
  tail,
  after,
  lines,
  accessibilityRole = "text",
  fade,
}: Props & { fade?: ComponentProps<typeof Animated.View>["style"] }) {
  const boxes = useMemo(
    () => furiganaBoxes(tail ? [...segments, { text: tail.text, tail: true }] : segments),
    [segments, tail],
  );
  const { drawn, readingSize, slot, line } = useRubyMetrics(
    segments,
    className,
    style,
    maxFontSizeMultiplier,
  );
  const pitch = slot + line;
  // The boxes run the way the language does, which a row would not: it follows the app's direction.
  const rtl = textDirection(lang) === "rtl";
  const keep = useClamp(boxes.length, lines, drawn * ELLIPSIS_EM, rtl);
  const shown = keep.count === null ? boxes : boxes.slice(0, keep.count);

  const text = (run: string, runClass = className) => (
    <Text
      className={runClass}
      style={runClass === className ? style : undefined}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      lang={lang}
    >
      {run}
    </Text>
  );
  const readingText = (run: string, size: number, lineHeight: number, inset = 0) => (
    <Text
      className="text-text-2"
      style={{
        fontSize: size,
        lineHeight,
        fontWeight: "400",
        letterSpacing: 0,
        paddingHorizontal: inset,
      }}
      allowFontScaling={false}
      numberOfLines={1}
      lang={lang}
    >
      {run}
    </Text>
  );
  // React Native cannot raise a run inside a line, so a tone number is its own text at the row's top.
  const reading = (run: string) => {
    const parts = toneRuns(run);
    const inset = readingInset(run, readingSize);
    if (parts.length === 1) return readingText(run, readingSize, slot, inset);
    return (
      <View className="flex-row items-start" style={{ height: slot, paddingHorizontal: inset }}>
        {parts.map((part, at) =>
          part.tone ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
            <View key={at}>
              {readingText(part.text, readingSize * TONE_SCALE, readingSize * TONE_SCALE)}
            </View>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
            <View key={at}>{readingText(part.text, readingSize, slot)}</View>
          ),
        )}
      </View>
    );
  };
  // The ellipsis and the mark close the last line kept, so a cut never takes the ★ with it.
  const end = (
    <View className="flex-row items-end" style={{ paddingTop: slot }} onLayout={keep.onEnd}>
      {keep.count !== null && text("…")}
      {after}
    </View>
  );
  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={
        spokenReading(segments, !hidden && saysReading(lang)) + (tail?.text ?? "")
      }
      accessibilityLanguage={lang ?? undefined}
      className="flex-row flex-wrap"
      style={[
        rtl !== I18nManager.isRTL && { direction: rtl ? "rtl" : "ltr" },
        lines ? { maxHeight: pitch * lines, overflow: "hidden" } : null,
      ]}
      onLayout={keep.onLine}
    >
      {shown.map((box, i) => (
        // Boxes never reorder, so the index is a stable key.
        // biome-ignore lint/suspicious/noArrayIndexKey: boxes in a fixed order
        <View key={i} className="shrink flex-row items-end" onLayout={keep.onBox(i)}>
          {box.map((run, j) =>
            run.reading === undefined ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
              <View key={j} className="shrink" style={{ paddingTop: slot }}>
                {text(run.text, run.tail ? tail?.className : className)}
              </View>
            ) : (
              // A reading wider than its kanji centres over them, as the web's ruby does.
              // biome-ignore lint/suspicious/noArrayIndexKey: runs in a fixed order
              <View key={j} className="shrink items-center">
                {run.known ? (
                  <View style={{ opacity: 0 }}>{reading(run.reading)}</View>
                ) : fade ? (
                  <Animated.View style={fade}>{reading(run.reading)}</Animated.View>
                ) : (
                  reading(run.reading)
                )}
                {text(run.text)}
              </View>
            ),
          )}
          {i === shown.length - 1 && (after || keep.count !== null) ? end : null}
        </View>
      ))}
      {shown.length === 0 && (after || keep.count !== null) ? end : null}
    </View>
  );
}

/**
 * Where to cut runs that would pass `lines`: each box reports where it landed, and once all have,
 * the boxes past the last line go, with room left for the ellipsis and the mark.
 */
function useClamp(count: number, lines: number | undefined, ellipsis: number, rtl: boolean) {
  const boxes = useRef<({ x: number; y: number; width: number } | undefined)[]>([]);
  const endWidth = useRef(0);
  const [lineWidth, setLineWidth] = useState(0);
  const [kept, setKept] = useState<{ key: string; count: number | null } | null>(null);
  const key = `${count}:${lines}:${lineWidth}`;
  const settled = kept?.key === key;
  const settle = () => {
    if (!lines || !lineWidth || settled) return;
    const all = boxes.current.slice(0, count);
    if (all.length < count || all.some((b) => !b)) return;
    const frames: Frame[] = all.map((b) => {
      const { x, y, width } = b as { x: number; y: number; width: number };
      return { top: y, end: rtl ? lineWidth - x : x + width };
    });
    setKept({ key, count: clampBoxes(frames, lines, lineWidth, endWidth.current + ellipsis) });
  };
  // The width can arrive after the boxes have reported, and a new width measures again.
  // biome-ignore lint/correctness/useExhaustiveDependencies: settles once per measured key
  useEffect(settle, [key]);
  return {
    count: settled ? kept.count : null,
    onLine: (e: LayoutChangeEvent) => {
      if (lines) setLineWidth(Math.round(e.nativeEvent.layout.width));
    },
    onBox: (i: number) =>
      lines
        ? (e: LayoutChangeEvent) => {
            if (settled) return;
            boxes.current[i] = e.nativeEvent.layout;
            settle();
          }
        : undefined,
    onEnd: (e: LayoutChangeEvent) => {
      if (!settled) endWidth.current = e.nativeEvent.layout.width;
    },
  };
}
