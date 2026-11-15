import { useLingui } from "@lingui/react/macro";
import type { KnownReadings } from "@lymi/core";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./primitives";
import { Skeleton } from "./skeleton";
import { ExampleText } from "./term-text";

/** Past the speaker's bare glyph, whose box sits in the block's corner. */
const SPEAKER_ROOM = 28;

/** The speaker's place, whose -8 pt margins centre its 32 pt box 20 pt down the block. */
const EXAMPLE_CORNER = { position: "absolute", end: 6, top: 12 } as const;

/**
 * A card's example as one inset block: the sentence over its translation, the speaker in the corner.
 * `speakerRoom` keeps the corner clear for a speaker drawn over the block from outside it, as the
 * card page's sits beside its edit button.
 */
export function ExampleLines({
  text,
  lang,
  known,
  plain,
  translation,
  translating,
  lines,
  translationLines,
  speaker,
  speakerRoom,
}: {
  text: string;
  lang?: string | null | undefined;
  known?: KnownReadings | undefined;
  /** Draws the sentence as written, with no readings over it, for a learner who shows pronunciation separately. */
  plain?: boolean | undefined;
  translation?: string | null | undefined;
  /** Holds the translation's line while it is being written. */
  translating?: boolean | undefined;
  lines?: number | undefined;
  translationLines?: number | undefined;
  speaker?: ReactNode;
  speakerRoom?: boolean | undefined;
}) {
  const { i18n } = useLingui();
  return (
    <View className="gap-1 rounded-lg bg-plate-nested px-3.5 py-3">
      <View style={speaker || speakerRoom ? { paddingEnd: SPEAKER_ROOM } : null}>
        <ExampleText
          text={text}
          known={known}
          plain={plain}
          className="text-md text-ink"
          lang={lang}
          lines={lines}
        />
      </View>
      {translation && (
        <Text
          className="text-base text-ink-muted"
          lang={i18n.locale}
          numberOfLines={translationLines}
        >
          {translation}
        </Text>
      )}
      {translating && !translation && (
        <View className="h-5 justify-center" accessibilityElementsHidden>
          <Skeleton width="66%" height={12} />
        </View>
      )}
      {speaker && <View style={EXAMPLE_CORNER}>{speaker}</View>}
    </View>
  );
}
