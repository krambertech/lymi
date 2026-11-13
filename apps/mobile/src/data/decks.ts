import { useLingui } from "@lingui/react/macro";
import { api, type DeckSummary, errorMessage } from "@lymi/client/api";
import { writes } from "@lymi/client/writes";
import { isolate } from "@lymi/core";
import { useQueryClient } from "@tanstack/react-query";
import { type Href, useRouter } from "expo-router";
import { Alert } from "react-native";
import { toast } from "../ui/toast-host";

/**
 * Archiving or leaving a deck, from the deck's menu or its settings. Either takes the deck out of the
 * review draw and its series, so those refresh as they do on the web. Archiving happens at once and
 * offers Undo on Library; leaving asks first, since only the owner can bring a shared deck back.
 */
export function useDeckExits(deck: DeckSummary | undefined) {
  const { t } = useLingui();
  const router = useRouter();
  const qc = useQueryClient();
  const refresh = () =>
    Promise.all(
      [["decks"], ["series"], ["queue"]].map((queryKey) => qc.invalidateQueries({ queryKey })),
    );
  if (!deck) return { archive: () => {}, leave: () => {} };
  const { id, name } = deck;
  // One id per deck, so Undo, its failure and a retry replace each other, as on the web.
  const toastId = `archive-deck-${id}`;
  const restore = async () => {
    try {
      await writes.restoreDeck(id);
      void refresh();
    } catch {
      toast.add({
        id: toastId,
        error: true,
        title: t`Couldn’t restore “${{ name: isolate(name) }}”.`,
        action: { label: t`Try again`, onPress: () => void restore() },
      });
    }
  };
  const archive = async () => {
    try {
      await writes.archiveDeck(id);
      void refresh();
      router.dismissTo("/library" as Href);
      toast.add({
        id: toastId,
        title: t`Archived “${{ name: isolate(name) }}”`,
        action: { label: t`Undo`, onPress: () => void restore() },
      });
    } catch {
      toast.add({
        id: toastId,
        error: true,
        title: t`Couldn’t archive “${{ name: isolate(name) }}”.`,
        action: { label: t`Try again`, onPress: () => void archive() },
      });
    }
  };
  return {
    archive: () => void archive(),
    leave: () =>
      Alert.alert(
        t`Leave ${{ name: isolate(name) }}?`,
        t`The deck leaves Library and its cards stop coming up in review. If you join again, your reviews are still there.`,
        [
          { text: t`Stay in deck`, style: "cancel" },
          {
            text: t`Leave deck`,
            style: "destructive",
            onPress: async () => {
              try {
                await api.leaveDeck(id);
                void refresh();
                router.dismissTo("/library" as Href);
              } catch (e) {
                Alert.alert(t`That didn’t go through`, errorMessage(e));
              }
            },
          },
        ],
      ),
  };
}
