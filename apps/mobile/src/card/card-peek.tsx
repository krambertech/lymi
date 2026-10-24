import { useLingui } from "@lingui/react/macro";
import type { Card, CardState } from "@lymi/client/api";
import { splitForms } from "@lymi/client/deck-list";
import { useKnownReadings } from "@lymi/client/known-readings";
import {
  drawsTermReading,
  hasReadings,
  shownTranslation,
  stripReadings,
  termShowsPronunciation,
} from "@lymi/core";
import { useMemo } from "react";
import { useWindowDimensions, View } from "react-native";
import { usePalette, useRoom } from "../theme/palette";
import { StateChip } from "../ui/chip";
import { Icon } from "../ui/icons";
import { LIFT, Text } from "../ui/primitives";
import { ExampleText, TermText } from "../ui/term-text";

/** Onest's letters average a little over half their size across. */
const lines = (text: string, size: number, width: number, most: number) =>
  Math.min(most, Math.max(1, Math.ceil((text.length * size * 0.55) / width)));

const WORD = { fontSize: 34, lineHeight: 41, fontWeight: "500", letterSpacing: -1 } as const;

/** The padding, the deck line, the rule and the gaps between them, in points. */
const FRAME = 16 + 20 + 16 + 16 + 1 + 16 + 20;

/**
 * The peek's height, from what the card holds: iOS needs it before the peek is drawn, so it is
 * counted rather than measured, and a long card ends at the edge.
 */
export function peekHeight(card: Card, width: number, scale: number) {
  const inner = width - 40;
  const { word, forms } = splitForms(card.term);
  // Furigana stands a reading's line over each line it draws on, and then says the pronunciation.
  const drawn = drawsTermReading({ ...card, term: word });
  const shown = termShowsPronunciation({ ...card, term: word });
  const example = card.example && (hasReadings(card.example, card.language) ? 23 + 12 : 23);
  const translation = shownTranslation(card);
  const text =
    lines(word, 34 * scale, inner, 2) * (drawn ? 41 + 21 : 41) +
    (forms ? 4 + 23 : 0) +
    lines(card.meaning || "", 20 * scale, inner, 3) * 26 +
    (card.pronunciation && !shown ? 8 + 23 : 0) +
    // The translation runs on after the example, so the two wrap as one paragraph.
    (card.example && example
      ? 8 +
        lines(
          stripReadings(card.example, card.language) + (translation ? ` (${translation})` : ""),
          17 * scale,
          inner,
          translation ? 3 : 2,
        ) *
          example
      : 0);
  return Math.min(Math.round(FRAME + text * scale), 420);
}

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
              <Icon name="deck" size={14} colour={p.muted} />
              <Text className="shrink text-sm font-medium text-text-2" numberOfLines={1}>
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
          className="text-text"
          lines={2}
          style={WORD}
          after={card.important && <Text style={[WORD, { color: p["amber-mark"] }]}>{" ★"}</Text>}
        />
        {forms && (
          <Text className="text-md text-text-2" numberOfLines={1}>
            {forms}
          </Text>
        )}
      </View>
      <View className="h-px bg-edge" />
      <View className="gap-2">
        <Text
          className="text-xl text-text"
          numberOfLines={3}
          style={card.meaning ? undefined : { color: p.muted }}
        >
          {card.meaning || t`No meaning yet`}
        </Text>
        {card.pronunciation && !reading && (
          <Text className="text-md text-muted" numberOfLines={1}>
            {card.pronunciation}
          </Text>
        )}
        {card.example && (
          <ExampleText
            text={card.example}
            known={known}
            className="text-md text-text-2"
            lines={translation ? 3 : 2}
            lang={card.language}
            translation={
              translation ? { text: translation, className: "text-md text-muted" } : null
            }
          />
        )}
      </View>
    </View>
  );
}
