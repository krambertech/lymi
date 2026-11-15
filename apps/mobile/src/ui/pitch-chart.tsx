import { useLingui } from "@lingui/react/macro";
import { isolate, PITCH_DOT, type PitchPattern, pitchLayout, pitchPattern } from "@lymi/core";
import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { usePalette } from "../theme/palette";
import { Text } from "./primitives";

/** Where a card's voice rises and falls: a joined dot over each mora, with a tail for a particle after the word. */
export function PitchChart({
  card,
  size = 17,
}: {
  card: {
    term?: string | undefined;
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
  };
  /** The kana's size in points before the reader's text size, which the chart scales with. */
  size?: number;
}) {
  const { t } = useLingui();
  const { term, language, pronunciation } = card;
  const pattern = useMemo(
    () => pitchPattern({ term, language, pronunciation }),
    [term, language, pronunciation],
  );
  if (!pattern) return null;
  const reading = isolate(pattern.morae.map((mora) => mora.text).join(""));
  const position = pattern.position;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        position === 0
          ? t`${reading}, flat pitch`
          : t`${reading}, pitch falls after sound ${position}`
      }
    >
      <PitchLine pattern={pattern} size={size} language={language} />
    </View>
  );
}

function PitchLine({
  pattern,
  size,
  language,
}: {
  pattern: PitchPattern;
  size: number;
  language: string | null | undefined;
}) {
  const p = usePalette();
  const { fontScale, width: screen } = useWindowDimensions();
  const { width, morae, segments } = pitchLayout(pattern);
  // A long word at a large text size shrinks to stay inside the card's 40 pt sides on each edge.
  const em = Math.min(size * fontScale, (screen - 80) / (width / 10));
  const color = p["ink-secondary"];
  return (
    <View style={{ width: (width / 10) * em, gap: 0.1 * em }}>
      <Svg width={(width / 10) * em} height={em} viewBox={`0 0 ${width} 10`}>
        {segments.map((segment) => (
          <Line
            key={segment.x1}
            {...segment}
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {morae.map((mora) => (
          <Circle
            key={mora.start}
            cx={mora.x}
            cy={mora.y}
            r={PITCH_DOT}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </Svg>
      <View className="flex-row">
        {morae.map((mora) => (
          <Text
            key={mora.start}
            lang={language}
            numberOfLines={1}
            allowFontScaling={false}
            className="text-center text-ink-secondary"
            style={{ width: (mora.width / 10) * em, fontSize: em }}
          >
            {mora.text}
          </Text>
        ))}
      </View>
    </View>
  );
}
