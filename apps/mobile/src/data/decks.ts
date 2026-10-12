import { plural } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, type DeckSummary, errorMessage } from "@lymi/client/api";
import { writes } from "@lymi/client/writes";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { Alert } from "react-native";

/**
 * Archiving or leaving a deck, asked first, from the deck's menu or its settings. Either takes the
 * deck out of the review draw and its series, so those refresh as they do on the web, and a refusal
 * says why, since there is no field on screen to say it beside.
 */
export function useDeckExits(deck: DeckSummary | undefined) {
  const { t } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all(
      [["decks"], ["series"], ["queue"]].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );
  const run = (write: () => Promise<unknown>) => async () => {
    try {
      await write();
      void refresh();
      router.dismissTo("/library" as Href);
    } catch (e) {
      Alert.alert(t`That didn’t go through`, errorMessage(e));
    }
  };
  if (!deck) return { archive: () => {}, leave: () => {} };
  const name = deck.name;
  const count = 1;
  return {
    archive: () =>
      Alert.alert(
        t`Archive “${name}”?`,
        // The web's own sentence, so both say the same and share a translation.
        plural(count, {
          one: "It leaves Library and stops coming up in review. Restore it from Archived.",
          other: "They leave Library and stop coming up in review. Restore them from Archived.",
        }),
        [
          { text: t`Cancel`, style: "cancel" },
          {
            text: t`Archive deck`,
            style: "destructive",
            onPress: run(() => writes.archiveDeck(deck.id)),
          },
        ],
      ),
    leave: () =>
      Alert.alert(
        t`Leave ${name}?`,
        t`The deck leaves Library and its cards stop coming up in review. If you join again, your reviews are still there.`,
        [
          { text: t`Keep studying`, style: "cancel" },
          { text: t`Leave deck`, style: "destructive", onPress: run(() => api.leaveDeck(deck.id)) },
        ],
      ),
  };
}
