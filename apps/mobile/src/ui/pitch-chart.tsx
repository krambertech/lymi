import { useLingui } from "@lingui/react/macro";
import { isolate, PITCH_DOT, type PitchPattern, pitchLayout, pitchPatterns } from "@lymi/core";
import { Fragment, useMemo } from "react";
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
    language?: string | null | undefined;
    pronunciation?: string | null | undefined;
  };
  /** The kana's size in points before the reader's text size, which the chart scales with. */
  size?: number;
}) {
  const { t } = useLingui();
  const { language, pronunciation } = card;
  const patterns = useMemo(
    () => pitchPatterns({ language, pronunciation }),
    [language, pronunciation],
  );
  if (patterns.length === 0) return null;
  const label = patterns
    .map(({ position, morae }) => {
      const reading = isolate(morae.map((mora) => mora.text).join(""));
      return position === 0
        ? t`${reading}, flat pitch`
        : t`${reading}, pitch falls after sound ${position}`;
    })
    .join(", ");
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      className="flex-row flex-wrap items-end gap-x-3 gap-y-1"
    >
      {patterns.map((pattern, at) => (
        <Fragment key={pattern.position}>
          {at > 0 && <Text className="pb-0.5 text-sm text-ink-muted">{t`or`}</Text>}
          <PitchLine pattern={pattern} size={size} language={language} />
        </Fragment>
      ))}
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
  const { fontScale } = useWindowDimensions();
  const em = size * fontScale;
  const { width, morae, segments } = pitchLayout(pattern);
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
            className="text-center text-ink-secondary"
            style={{ width: (mora.width / 10) * em, fontSize: size }}
          >
            {mora.text}
          </Text>
        ))}
      </View>
    </View>
  );
}
