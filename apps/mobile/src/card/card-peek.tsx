import { useLingui } from "@lingui/react/macro";
import type { Card, CardState } from "@lymi/client/api";
import { splitForms } from "@lymi/client/deck-list";
import { useKnownReadings } from "@lymi/client/known-readings";
import { pronunciationText, shownTranslation, termShowsPronunciation } from "@lymi/core";
import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { usePalette, useRoom } from "../theme/palette";
import { StateChip } from "../ui/chip";
import { ExampleLines } from "../ui/example-lines";
import { Icon } from "../ui/icons";
import { LIFT, Text } from "../ui/primitives";
import { TermText } from "../ui/term-text";
import { peekHeight } from "./peek-height";

export { peekHeight };

const WORD = { fontSize: 34, lineHeight: 41, fontWeight: "500", letterSpacing: -1 } as const;

/** The peek's width, the screen's less the page's gutters, and the reader's text size. */
export function usePeekSize() {
  const { width, fontScale } = useWindowDimensions();
  return { width: width - 32, scale: fontScale };
}

/**
 * A card as a long press lifts it from a list: the revealed side of its review card, with the
 * deck and the state on top and the word, its meaning, how it sounds and an example under them.
 */
export function CardPeek({
  card,
  state,
  deckName,
}: {
  card: Card;
  /** Left out where the list does not know it, such as search. */
  state?: CardState | null | undefined;
  deckName?: string | undefined;
}) {
  const known = useKnownReadings();
  const { t } = useLingui();
  const p = usePalette();
  const dark = useRoom() === "dark";
  const { word, forms } = splitForms(card.term);
  const reading = useMemo(() => termShowsPronunciation({ ...card, term: word }), [card, word]);
  const { width, scale } = usePeekSize();
  const translation = shownTranslation(card);
  return (
    <View
      className="flex-1 gap-4 bg-plate px-5 pb-5 pt-4"
      style={[{ width, height: peekHeight(card, width, scale) }, dark ? LIFT : null]}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 shrink flex-row items-center gap-1.5">
          {deckName && (
            <>
              <Icon name="deck" size={14} colour={p["ink-muted"]} />
              <Text className="shrink text-sm font-medium text-ink-secondary" numberOfLines={1}>
                {deckName}
              </Text>
            </>
          )}
        </View>
        {state !== undefined && <StateChip state={state?.state} />}
      </View>
      <View className="gap-1">
        <TermText
          card={{ ...card, term: word }}
          className="text-ink"
          lines={2}
          style={WORD}
          after={card.important && <Text style={[WORD, { color: p["amber-mark"] }]}>{" ★"}</Text>}
        />
        {forms && (
          <Text className="text-md text-ink-secondary" numberOfLines={1}>
            {forms}
          </Text>
        )}
      </View>
      <View className="h-px bg-edge" />
      <View className="gap-2">
        <Text
          className="text-xl text-ink"
          numberOfLines={3}
          style={card.meaning ? undefined : { color: p["ink-muted"] }}
        >
          {card.meaning || t`No meaning yet`}
        </Text>
        {card.pronunciation && !reading && (
          <Text className="text-md text-ink-muted" numberOfLines={1}>
            {pronunciationText(card)}
          </Text>
        )}
        {card.example && (
          <ExampleLines
            text={card.example}
            known={known}
            lines={2}
            lang={card.language}
            translation={translation}
            translationLines={1}
          />
        )}
      </View>
    </View>
  );
}
