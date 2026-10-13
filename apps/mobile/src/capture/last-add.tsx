import { useLingui } from "@lingui/react/macro";
import Animated, { FadeOut } from "react-native-reanimated";
import { ALWAYS, CROSSFADE } from "../theme/motion";

const FADE_AWAY = FadeOut.duration(150).reduceMotion(ALWAYS);

import { usePalette } from "../theme/palette";
import { Button, Icon, Text } from "../ui/primitives";
import type { Outcome } from "./model";

/** The last add, over the chips: where it went, or where the card already is. */
export function LastAdd({
  last,
  onUndo,
  onRetry,
}: {
  last: Outcome;
  onUndo: (() => void) | undefined;
  /** Sends a picture that did not reach the card. */
  onRetry?: (() => void) | undefined;
}) {
  const { t } = useLingui();
  const p = usePalette();
  const { term, deckName } = last;
  const reason = last.kind === "added" ? last.pictureError : undefined;
  const line =
    last.kind === "skipped"
      ? t`“${term}” is already in ${deckName}`
      : reason
        ? t`Added “${term}” without its picture. ${reason}`
        : last.queued
          ? t`Added “${term}”. It’s saved on this phone until Lymi can be reached.`
          : t`Added “${term}” to ${deckName}`;
  return (
    <Animated.View
      entering={CROSSFADE}
      exiting={FADE_AWAY}
      className="min-h-8 flex-row items-center gap-2 pb-1"
      accessibilityLiveRegion="polite"
    >
      <Icon
        name={last.kind === "skipped" ? "alert" : "check"}
        size={14}
        colour={last.kind === "skipped" ? p.muted : p.good}
        strokeWidth={2.25}
      />
      <Text className="flex-1 text-base text-text-2" numberOfLines={2}>
        {line}
      </Text>
      {onRetry && <Button label={t`Try again`} variant="ghost" size="sm" onPress={onRetry} />}
      {onUndo && <Button label={t`Undo`} variant="ghost" size="sm" onPress={onUndo} />}
    </Animated.View>
  );
}
