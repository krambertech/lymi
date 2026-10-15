import { useLingui } from "@lingui/react/macro";
import type { PublicDeckSummary } from "@lymi/core/catalog";
import { useRouter } from "expo-router";
import { View } from "react-native";
import { DeckHand } from "../explore/deck-hand";
import { type TrayCard, useTrayColour } from "../explore/tray";
import { Button, Text } from "../ui/primitives";

/**
 * The way to a ready-made deck under Today's getting started guide: one banner on the first offered
 * deck's tray colour, a card from each of up to three decks, leading to Explore, where the decks sit
 * on their shelves. Its button is white rather than amber, so the guide's own step stays the one
 * thing to press. The web's `ReadyDecks`.
 */
export function ReadyDecks({ decks }: { decks: PublicDeckSummary[] }) {
  const { t } = useLingui();
  const router = useRouter();
  const ground = useTrayColour(decks[0]?.slug ?? "");
  const hand: TrayCard[] = decks.flatMap((deck) => (deck.card ? [deck.card] : [])).slice(0, 3);
  return (
    <View className="overflow-hidden rounded-xl" style={{ backgroundColor: ground }}>
      {hand.length > 0 && (
        <View className="pt-6">
          <DeckHand cards={hand} gathered={false} ground={ground} />
        </View>
      )}
      <View className="gap-2 p-5">
        <Text className="text-xl font-medium text-text" accessibilityRole="header">
          {t`Start with a ready-made deck`}
        </Text>
        <Text className="text-base text-text-2">
          {t`Decks from Lymi. Add one to study it in your language.`}
        </Text>
        <View className="pt-3">
          <Button
            label={t`Browse ready-made decks`}
            size="lg"
            onPress={() => router.navigate("/explore")}
          />
        </View>
      </View>
    </View>
  );
}
