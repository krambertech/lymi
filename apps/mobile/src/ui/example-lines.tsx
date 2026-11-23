import { useLingui } from "@lingui/react/macro";
import type { KnownReadings } from "@lymi/core";
import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "./primitives";
import { Skeleton } from "./skeleton";
import { ExampleText } from "./term-text";

const SPEAKER_ROOM = 28;

const EXAMPLE_CORNER = { position: "absolute", end: 6, top: 12 } as const;

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
  plain?: boolean | undefined;
  translation?: string | null | undefined;
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
