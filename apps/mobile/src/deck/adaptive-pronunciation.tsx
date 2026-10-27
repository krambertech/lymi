import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { DeckSummary } from "@lymi/client/api";
import { writes } from "@lymi/client/writes";
import { type PronunciationDisplay, type ReadingEngine, readingEngine } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { View } from "react-native";
import { FieldError } from "../ui/field";
import { Text } from "../ui/primitives";
import { RowFace } from "../ui/row";
import { Switch } from "../ui/switch";

/** What each notation does with the switch on, then off. The web says the same. */
const DESCRIPTION: Record<ReadingEngine, [on: MessageDescriptor, off: MessageDescriptor]> = {
  furigana: [
    msg`Furigana shows over the term until a card is Known, then only with the answer.`,
    msg`The reading shows on its own line with the answer, so you read the kanji yourself.`,
  ],
  pinyin: [
    msg`Pinyin shows over the term until a card is Known, then only with the answer.`,
    msg`Pinyin shows on its own line with the answer, so you read the characters yourself.`,
  ],
  jyutping: [
    msg`Jyutping shows over the term until a card is Known, then only with the answer.`,
    msg`Jyutping shows on its own line with the answer, so you read the characters yourself.`,
  ],
  indic: [
    msg`The reading shows over the term until a card is Known, then only with the answer.`,
    msg`The reading shows on its own line with the answer, so you read the term yourself.`,
  ],
  stress: [
    msg`Stress marks show on the term until a card is Known, then only with the answer.`,
    msg`Stress marks show on their own line with the answer, so you recall the stress yourself.`,
  ],
};

/**
 * The learner's own choice of whether a card's cue carries its pronunciation in this deck, owner
 * or member. Null for a language that draws none on the term.
 */
export function useAdaptivePronunciation(deck: DeckSummary) {
  const qc = useQueryClient();
  const [failed, setFailed] = useState(false);
  const notation = readingEngine(deck.defaultLanguage);
  if (!notation) return null;
  const change = async (pronunciationDisplay: PronunciationDisplay) => {
    setFailed(false);
    try {
      await writes.setDeckPreferences(deck.id, { pronunciationDisplay });
      void qc.invalidateQueries({ queryKey: ["decks"] });
    } catch {
      setFailed(true);
    }
  };
  return { deck, notation, on: deck.pronunciationDisplay !== "separate", change, failed };
}

type Choice = NonNullable<ReturnType<typeof useAdaptivePronunciation>>;

/** The switch, a row among the deck's own. */
export function AdaptivePronunciationRow({ choice }: { choice: Choice }) {
  const { t } = useLingui();
  return (
    <RowFace
      icon="reading"
      label={t`Adaptive pronunciation`}
      control={
        <Switch
          checked={choice.on}
          onCheckedChange={(next) => void choice.change(next ? "adaptive" : "separate")}
          accessibilityLabel={t`Adaptive pronunciation`}
        />
      }
    />
  );
}

/** What the switch does now, under the deck's rows. */
export function AdaptivePronunciationNote({ choice }: { choice: Choice }) {
  const { t, i18n } = useLingui();
  const [onText, offText] = DESCRIPTION[choice.notation];
  return (
    <View className="gap-2">
      <Text className="px-1 text-sm text-muted">{i18n._(choice.on ? onText : offText)}</Text>
      {choice.deck.role !== "owner" && (
        <Text className="px-1 text-sm text-muted">
          {t`Only for you. The owner and others studying this deck choose their own.`}
        </Text>
      )}
      <FieldError>
        {choice.failed ? t`Couldn’t save the choice. Check your connection and try again.` : null}
      </FieldError>
    </View>
  );
}
