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
  hidden?: boolean | undefined;
  className?: string;
  style?: TextStyle | (TextStyle | null | undefined)[];
  maxFontSizeMultiplier?: number;
  tail?: { text: string; className: string; lang?: string | undefined } | undefined;
  after?: ReactNode;
  lines?: number;
  room?: boolean;
  accessibilityRole?: "header" | "text";
}

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

const LETTERS_MAX = 15.5;

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

const KNOWN_READING = { opacity: 0, width: 0, overflow: "hidden" } as const;

const TONE_SCALE = 0.7;

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
      className="text-ink-secondary"
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
  const reading = (run: string) => {
    const parts = toneRuns(run);
    const inset = readingInset(run, readingSize);
    if (parts.length === 1) return readingText(run, readingSize, slot, inset);
    return (
      <View className="flex-row items-start" style={{ height: slot, paddingHorizontal: inset }}>
        {parts.map((part, at) =>
          part.tone ? (
            // oxlint-disable-next-line react/no-array-index-key -- runs in a fixed order
            <View key={at}>
              {readingText(part.text, readingSize * TONE_SCALE, readingSize * TONE_SCALE)}
            </View>
          ) : (
            // oxlint-disable-next-line react/no-array-index-key -- runs in a fixed order
            <View key={at}>{readingText(part.text, readingSize, slot)}</View>
          ),
        )}
      </View>
    );
  };
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
        // oxlint-disable-next-line react/no-array-index-key -- boxes in a fixed order
        <View key={i} className="shrink flex-row items-end" onLayout={keep.onBox(i)}>
          {box.map((run, j) =>
            run.reading === undefined ? (
              // oxlint-disable-next-line react/no-array-index-key -- runs in a fixed order
              <View key={j} className="shrink" style={{ paddingTop: slot }}>
                {text(run.text, run.tail ? tail?.className : className)}
              </View>
            ) : (
              // oxlint-disable-next-line react/no-array-index-key -- runs in a fixed order
              <View key={j} className="shrink items-center">
                {run.known ? (
                  <View style={KNOWN_READING}>{reading(run.reading)}</View>
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
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- settles once per measured key
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
